/**
 * Admin WhatsApp marketing campaigns — bulk template sends to segmented audiences.
 *
 * Mounted at /api/admin — adds:
 *   GET    /whatsapp/campaigns                    list (newest first)
 *   POST   /whatsapp/campaigns                    create draft (validates template + params)
 *   POST   /whatsapp/campaigns/preview-audience   resolve an audience → count + masked sample
 *   GET    /whatsapp/campaigns/:id                campaign + delivery rollup + failure sample
 *   DELETE /whatsapp/campaigns/:id                delete (drafts / cancelled only)
 *   POST   /whatsapp/campaigns/:id/test           send the template to one number (dry-run)
 *   POST   /whatsapp/campaigns/:id/send           start/resume the send — returns progress,
 *                                                 caller re-invokes until done (resumable)
 *   POST   /whatsapp/campaigns/:id/cancel         stop a draft/sending campaign
 *   POST   /whatsapp/campaigns/:id/retry-failed   re-queue retryable failures (rate limits etc)
 *
 * Marketing sends require a Meta-APPROVED template (category MARKETING or UTILITY).
 * Free-form text can't be bulk-sent outside the 24h customer-service window — that's a
 * WhatsApp platform rule, not ours.
 */

import { Router, type Response } from "express";
import { requireAdmin, type AuthRequest } from "../../middleware/auth";
import { strictLimiter, campaignSendLimiter } from "../../middleware/rateLimit";
import { getDb } from "../../config/firebase-admin";
import {
  sendTemplate,
  getTemplate,
  templateVariableCount,
  normalizeRecipient,
} from "../../services/whatsapp.service";
import {
  previewAudience,
  processCampaignSend,
  campaignDeliveryStats,
  personalizeParams,
  requeueFailedRecipients,
  type Campaign,
  type CampaignAudience,
} from "../../services/whatsapp-campaigns.service";

const router = Router();

function parseAudience(input: unknown): CampaignAudience | null {
  if (!input || typeof input !== "object") return null;
  const a = input as Record<string, unknown>;
  switch (a.type) {
    case "all":
    case "purchasers":
    case "never_purchased":
      return { type: a.type };
    case "status":
      if (a.status === "active" || a.status === "provisional") {
        return { type: "status", status: a.status };
      }
      return null;
    case "event":
      if (typeof a.event_id === "string" && a.event_id.length > 0) {
        return { type: "event", event_id: a.event_id };
      }
      return null;
    case "manual":
      if (Array.isArray(a.phones) && a.phones.length > 0 && a.phones.every((p) => typeof p === "string")) {
        return { type: "manual", phones: a.phones as string[] };
      }
      return null;
    default:
      return null;
  }
}

function sendError(res: Response, err: unknown, context: string) {
  const statusCode = (err as { statusCode?: number }).statusCode ?? 500;
  const message = err instanceof Error ? err.message : "Internal server error";
  if (statusCode >= 500) console.error(`[admin/whatsapp-campaigns] ${context} error:`, message);
  res.status(statusCode).json({ success: false, error: message });
}

/** GET /whatsapp/campaigns — newest first. */
router.get("/whatsapp/campaigns", requireAdmin, async (_req: AuthRequest, res) => {
  try {
    const db = await getDb();
    const snap = await db
      .collection("whatsapp_campaigns")
      .orderBy("created_at", "desc")
      .limit(50)
      .get();
    const campaigns = snap.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      delete data.lock_until;
      return { id: d.id, ...data };
    });
    res.json({ success: true, data: { campaigns } });
  } catch (err) {
    sendError(res, err, "list");
  }
});

/**
 * POST /whatsapp/campaigns
 * Body: { name, template_name, language_code?, body_params?, header_image_id?, audience }
 * Validates the template against Meta (approved, right category, param count) before saving.
 */
router.post("/whatsapp/campaigns", strictLimiter, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { name, template_name, language_code, body_params, header_image_id, audience } =
      req.body as {
        name?: string;
        template_name?: string;
        language_code?: string;
        body_params?: unknown;
        header_image_id?: string;
        audience?: unknown;
      };

    if (!name || name.trim().length === 0) {
      res.status(400).json({ success: false, error: "'name' is required" });
      return;
    }
    if (!template_name) {
      res.status(400).json({ success: false, error: "'template_name' is required" });
      return;
    }
    const parsedAudience = parseAudience(audience);
    if (!parsedAudience) {
      res.status(400).json({
        success: false,
        error:
          "'audience' must be one of: {type:'all'}, {type:'status',status}, {type:'event',event_id}, {type:'purchasers'}, {type:'never_purchased'}, {type:'manual',phones[]}",
      });
      return;
    }
    const params = Array.isArray(body_params) ? body_params.map(String) : [];

    // Validate against the live template so param mismatches fail here, not mid-send.
    const tplResult = await getTemplate(template_name);
    if (!tplResult.ok) {
      res.status(502).json({ success: false, error: `Template lookup failed: ${tplResult.error}` });
      return;
    }
    if (!tplResult.template) {
      res.status(404).json({ success: false, error: `Template "${template_name}" not found on the WABA` });
      return;
    }
    const tpl = tplResult.template;
    if ((tpl.status ?? "").toUpperCase() !== "APPROVED") {
      res.status(409).json({
        success: false,
        error: `Template "${template_name}" is ${tpl.status} — only APPROVED templates can be sent`,
      });
      return;
    }
    if ((tpl.category ?? "").toUpperCase() === "AUTHENTICATION") {
      res.status(400).json({
        success: false,
        error: "AUTHENTICATION templates can't be used for marketing campaigns",
      });
      return;
    }
    const { bodyVarCount, hasImageHeader } = templateVariableCount(tpl);
    if (params.length !== bodyVarCount) {
      res.status(400).json({
        success: false,
        error: `Template "${template_name}" expects ${bodyVarCount} body param(s), got ${params.length}`,
      });
      return;
    }
    if (hasImageHeader && !header_image_id) {
      res.status(400).json({
        success: false,
        error: `Template "${template_name}" has an IMAGE header — upload an image via /upload-media and pass header_image_id`,
      });
      return;
    }

    const nowIso = new Date().toISOString();
    const db = await getDb();
    const ref = await db.collection("whatsapp_campaigns").add({
      name: name.trim().slice(0, 120),
      template_name,
      template_category: tpl.category,
      language_code: language_code ?? tpl.language ?? "en_US",
      body_params: params,
      header_image_id: header_image_id ?? null,
      audience: parsedAudience,
      status: "draft",
      totals: { eligible: 0, sent: 0, failed: 0, skipped_no_phone: 0 },
      created_at: nowIso,
      created_by: req.uid ?? "unknown",
      updated_at: nowIso,
      lock_until: 0,
    });
    const created = await ref.get();
    res.json({ success: true, data: { id: ref.id, ...created.data() } });
  } catch (err) {
    sendError(res, err, "create");
  }
});

/**
 * POST /whatsapp/campaigns/preview-audience
 * Body: { audience } — resolve without creating anything. Used live in the composer.
 */
router.post("/whatsapp/campaigns/preview-audience", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const parsedAudience = parseAudience((req.body as { audience?: unknown }).audience);
    if (!parsedAudience) {
      res.status(400).json({ success: false, error: "Invalid 'audience'" });
      return;
    }
    const preview = await previewAudience(parsedAudience);
    res.json({ success: true, data: preview });
  } catch (err) {
    sendError(res, err, "preview-audience");
  }
});

/** GET /whatsapp/campaigns/:id — campaign + live delivery rollup from the webhook records. */
router.get("/whatsapp/campaigns/:id", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const db = await getDb();
    const doc = await db.collection("whatsapp_campaigns").doc(id).get();
    if (!doc.exists) {
      res.status(404).json({ success: false, error: "Campaign not found" });
      return;
    }
    const data = doc.data() as Record<string, unknown>;
    delete data.lock_until;
    const delivery = await campaignDeliveryStats(id);
    res.json({ success: true, data: { campaign: { id: doc.id, ...data }, delivery } });
  } catch (err) {
    sendError(res, err, "get");
  }
});

/** DELETE /whatsapp/campaigns/:id — drafts and cancelled campaigns only. */
router.delete("/whatsapp/campaigns/:id", strictLimiter, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const db = await getDb();
    const ref = db.collection("whatsapp_campaigns").doc(id);
    const doc = await ref.get();
    if (!doc.exists) {
      res.status(404).json({ success: false, error: "Campaign not found" });
      return;
    }
    const status = (doc.data() as Campaign).status;
    if (status === "sending" || status === "sent") {
      res.status(409).json({
        success: false,
        error: `Can't delete a ${status} campaign — its send record is the audit trail. Cancel first if it's still sending.`,
      });
      return;
    }
    // Clean up any materialized recipients (a cancelled campaign may have some).
    for (;;) {
      const chunk = await ref.collection("recipients").limit(400).get();
      if (chunk.empty) break;
      const batch = db.batch();
      chunk.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
    await ref.delete();
    res.json({ success: true, data: { deleted: id } });
  } catch (err) {
    sendError(res, err, "delete");
  }
});

/**
 * POST /whatsapp/campaigns/:id/test
 * Body: { to } — fires the campaign's template at one number with tokens resolved
 * ({first_name} → "there") so you can eyeball the real message before the blast.
 */
router.post("/whatsapp/campaigns/:id/test", strictLimiter, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const { to } = req.body as { to?: string };
    if (!to) {
      res.status(400).json({ success: false, error: "'to' is required (E.164, e.g. +919663241658)" });
      return;
    }
    const db = await getDb();
    const doc = await db.collection("whatsapp_campaigns").doc(id).get();
    if (!doc.exists) {
      res.status(404).json({ success: false, error: "Campaign not found" });
      return;
    }
    const campaign = doc.data() as Campaign;
    const result = await sendTemplate({
      to,
      templateName: campaign.template_name,
      languageCode: campaign.language_code,
      bodyParams: personalizeParams(campaign.body_params, {
        user_id: null,
        phone: normalizeRecipient(to),
        first_name: "there",
        display_name: "there",
      }),
      headerImageId: campaign.header_image_id ?? undefined,
    });
    if (!result.ok) {
      res.status(502).json({ success: false, error: result.error, code: result.code, details: result.details });
      return;
    }
    res.json({
      success: true,
      data: { messageId: result.messageId, normalizedTo: normalizeRecipient(to) },
    });
  } catch (err) {
    sendError(res, err, "test");
  }
});

/**
 * POST /whatsapp/campaigns/:id/send
 * Body: { confirm: true } — required, this is the point of no return.
 * Starts or resumes the send. Processes for up to ~45s then returns progress;
 * the admin UI keeps calling until { done: true }. Safe to re-invoke after a
 * crash or timeout — already-sent recipients are never re-sent.
 */
router.post("/whatsapp/campaigns/:id/send", campaignSendLimiter, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    if ((req.body as { confirm?: boolean }).confirm !== true) {
      res.status(400).json({ success: false, error: "Pass { confirm: true } to start the send" });
      return;
    }
    const progress = await processCampaignSend(id);
    res.json({ success: true, data: progress });
  } catch (err) {
    sendError(res, err, "send");
  }
});

/**
 * POST /whatsapp/campaigns/:id/retry-failed
 * Body: { all?: boolean }
 * Flips failed recipients back to pending so /send can retry them. Default: only
 * rate-limit / transient failures (e.g. 131049 per-user marketing cap) — permanent
 * failures like "not on WhatsApp" or template errors are skipped unless all=true.
 * Best used the day after the original send; retrying 131049 immediately just fails again.
 */
router.post("/whatsapp/campaigns/:id/retry-failed", strictLimiter, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const { all } = req.body as { all?: boolean };
    const result = await requeueFailedRecipients(id, { all: all === true });
    res.json({ success: true, data: result });
  } catch (err) {
    sendError(res, err, "retry-failed");
  }
});

/** POST /whatsapp/campaigns/:id/cancel — stops the send; pending recipients stay unsent. */
router.post("/whatsapp/campaigns/:id/cancel", strictLimiter, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const db = await getDb();
    const ref = db.collection("whatsapp_campaigns").doc(id);
    const doc = await ref.get();
    if (!doc.exists) {
      res.status(404).json({ success: false, error: "Campaign not found" });
      return;
    }
    const status = (doc.data() as Campaign).status;
    if (status === "sent" || status === "cancelled") {
      res.status(409).json({ success: false, error: `Campaign is already ${status}` });
      return;
    }
    await ref.update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    res.json({ success: true, data: { id, status: "cancelled" } });
  } catch (err) {
    sendError(res, err, "cancel");
  }
});

export default router;
