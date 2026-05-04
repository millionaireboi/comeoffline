import { Router } from "express";
import { requireAdmin, type AuthRequest } from "../../middleware/auth";
import { strictLimiter } from "../../middleware/rateLimit";
import {
  sendTemplate,
  sendVenueReveal,
  sendPhoneOtp,
  normalizeRecipient,
  listTemplates,
  getTemplate,
  deleteTemplate,
  uploadMedia,
  templateVariableCount,
} from "../../services/whatsapp.service";
import {
  listScenarios,
  getScenario,
  updateScenario,
  recordScenarioFired,
} from "../../services/whatsapp-scenarios.service";
import { getDb } from "../../config/firebase-admin";
import { env } from "../../config/env";

const router = Router();

/**
 * POST /api/admin/whatsapp/send-test
 * Body: { to, templateName, languageCode?, bodyParams? }
 * Or use the convenience: { to, template: "venue_reveal", firstName, eventName, address, time, url }
 */
router.post("/whatsapp/send-test", strictLimiter, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { to, template, templateName, languageCode, bodyParams, firstName, eventName, address, time, url } = req.body;

    if (!to) {
      res.status(400).json({ success: false, error: "'to' is required (E.164, e.g. +919663241658)" });
      return;
    }

    let result;
    if (template === "venue_reveal") {
      if (!firstName || !eventName || !address || !time || !url) {
        res.status(400).json({
          success: false,
          error: "venue_reveal requires firstName, eventName, address, time, url",
        });
        return;
      }
      result = await sendVenueReveal({ to, firstName, eventName, address, time, url });
    } else {
      if (!templateName) {
        res.status(400).json({ success: false, error: "templateName is required for generic send" });
        return;
      }
      result = await sendTemplate({
        to,
        templateName,
        languageCode,
        bodyParams: Array.isArray(bodyParams) ? bodyParams : [],
      });
    }

    if (!result.ok) {
      res.status(502).json({ success: false, error: result.error, code: result.code });
      return;
    }

    res.json({
      success: true,
      data: { messageId: result.messageId, normalizedTo: normalizeRecipient(to) },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[admin/whatsapp] send error:", message);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /api/admin/whatsapp/config-check
 * Quick diagnostic — confirms which WhatsApp env vars are wired up. No secrets returned.
 */
router.get("/whatsapp/config-check", requireAdmin, async (_req: AuthRequest, res) => {
  res.json({
    success: true,
    data: {
      phone_number_id_set: !!env.whatsappPhoneNumberId,
      phone_number_id_preview: env.whatsappPhoneNumberId
        ? `${env.whatsappPhoneNumberId.slice(0, 4)}…${env.whatsappPhoneNumberId.slice(-4)}`
        : null,
      access_token_set: !!env.whatsappAccessToken,
      access_token_length: env.whatsappAccessToken.length,
      verify_token_set: !!env.whatsappVerifyToken,
      app_secret_set: !!env.whatsappAppSecret,
      webhook_path: "/api/webhooks/whatsapp",
      notes: [
        "Webhook needs a public HTTPS URL — use ngrok/Cloudflare Tunnel locally to receive Meta delivery callbacks.",
        "If WABA is in development mode, only verified test recipients receive messages.",
        "Auth-category templates require body param + button param (sub_type='url') with the same code.",
      ],
    },
  });
});

/**
 * POST /api/admin/whatsapp/send-otp-test
 * Body: { to, code? }
 * Fires the live `phone_otp` template via Meta and returns the full Cloud API response so we
 * can inspect wamid + contacts.wa_id without going through the verification flow.
 */
router.post("/whatsapp/send-otp-test", strictLimiter, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { to, code } = req.body as { to?: string; code?: string };
    if (!to) {
      res.status(400).json({ success: false, error: "'to' is required (E.164, e.g. +919663241658)" });
      return;
    }
    const otp = code && /^\d{6}$/.test(code) ? code : "123456";
    const result = await sendPhoneOtp({ to, code: otp });
    if (!result.ok) {
      res.status(502).json({
        success: false,
        error: result.error,
        code: result.code,
        httpStatus: result.httpStatus,
        details: result.details,
      });
      return;
    }
    res.json({
      success: true,
      data: {
        wamid: result.messageId,
        normalizedTo: normalizeRecipient(to),
        meta_response: result.raw,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[admin/whatsapp] send-otp-test error:", message);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /api/admin/whatsapp/otp-status?user_id=…  OR  ?phone=…
 * Reads phone_otps/{uid} so admins can see the latest send result + delivery status without
 * tailing logs.
 */
router.get("/whatsapp/otp-status", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { user_id, phone } = req.query as { user_id?: string; phone?: string };
    if (!user_id && !phone) {
      res.status(400).json({ success: false, error: "user_id or phone required" });
      return;
    }
    const db = await getDb();
    let snap;
    if (user_id) {
      const doc = await db.collection("phone_otps").doc(user_id).get();
      snap = doc.exists ? [doc] : [];
    } else {
      const q = await db.collection("phone_otps").where("phone", "==", phone).limit(5).get();
      snap = q.docs;
    }
    const records = snap.map((d) => {
      const data = d.data() as Record<string, unknown>;
      // strip the hash so admins don't see it
      delete data.otp_hash;
      return { id: d.id, ...data };
    });
    res.json({ success: true, data: { records } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[admin/whatsapp] otp-status error:", message);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /api/admin/whatsapp/message?wamid=…
 * Inspect a single outbound dispatch — full status_history (sent → delivered → read or failed
 * with error code/details).
 */
router.get("/whatsapp/message", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { wamid } = req.query as { wamid?: string };
    if (!wamid) {
      res.status(400).json({ success: false, error: "wamid required" });
      return;
    }
    const db = await getDb();
    const doc = await db.collection("whatsapp_messages").doc(wamid).get();
    if (!doc.exists) {
      res.status(404).json({ success: false, error: "No record for that wamid (webhook may not be wired up)" });
      return;
    }
    res.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[admin/whatsapp] message lookup error:", message);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /api/admin/whatsapp/templates
 * Returns all templates on the connected WABA with status, category, components, variable count.
 * Optional query: ?after=<cursor> for pagination, ?status=APPROVED|PENDING|REJECTED to filter client-side.
 */
router.get("/whatsapp/templates", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { after, status } = req.query as { after?: string; status?: string };
    const result = await listTemplates({ after, limit: 100 });
    if (!result.ok) {
      res.status(502).json({ success: false, error: result.error });
      return;
    }
    let templates = result.templates;
    if (status) {
      const target = status.toUpperCase();
      templates = templates.filter((t) => (t.status ?? "").toUpperCase() === target);
    }
    const enriched = templates.map((t) => ({ ...t, ...templateVariableCount(t) }));
    res.json({
      success: true,
      data: { templates: enriched, nextCursor: result.nextCursor },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[admin/whatsapp] templates list error:", message);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /api/admin/whatsapp/templates/:name
 * Single template details + parsed variable count.
 */
router.get("/whatsapp/templates/:name", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const name = String(req.params.name);
    const result = await getTemplate(name);
    if (!result.ok) {
      res.status(502).json({ success: false, error: result.error });
      return;
    }
    if (!result.template) {
      res.status(404).json({ success: false, error: `Template "${name}" not found` });
      return;
    }
    res.json({
      success: true,
      data: { ...result.template, ...templateVariableCount(result.template) },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[admin/whatsapp] template fetch error:", message);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * DELETE /api/admin/whatsapp/templates/:name
 * Soft-deletes the template at Meta. Name reusable after 30 days.
 */
router.delete("/whatsapp/templates/:name", strictLimiter, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const name = String(req.params.name);
    const result = await deleteTemplate(name);
    if (!result.ok) {
      res.status(502).json({ success: false, error: result.error });
      return;
    }
    res.json({ success: true, data: { deleted: name } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[admin/whatsapp] template delete error:", message);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/admin/whatsapp/upload-media
 * Body: { dataUri }   data URI like "data:image/png;base64,iVBORw0K..."
 * Returns: { mediaId } — feed into sendTemplate({ headerImageId }).
 */
router.post("/whatsapp/upload-media", strictLimiter, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { dataUri } = req.body as { dataUri?: string };
    if (!dataUri) {
      res.status(400).json({ success: false, error: "dataUri required (e.g. 'data:image/png;base64,...')" });
      return;
    }
    const match = dataUri.match(/^data:(image\/(?:png|jpeg|jpg));base64,(.+)$/);
    if (!match) {
      res.status(400).json({ success: false, error: "Only image/png and image/jpeg data URIs are supported here" });
      return;
    }
    const mimeType = match[1];
    const buffer = Buffer.from(match[2], "base64");
    if (buffer.length > 5 * 1024 * 1024) {
      res.status(400).json({ success: false, error: "Image must be under 5MB" });
      return;
    }
    const result = await uploadMedia({ buffer, mimeType, filename: `header.${mimeType.split("/")[1]}` });
    if (!result.ok) {
      res.status(502).json({ success: false, error: result.error });
      return;
    }
    res.json({ success: true, data: { mediaId: result.mediaId } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[admin/whatsapp] upload-media error:", message);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/admin/whatsapp/send-template
 * Generic sender — works for ANY approved template. The admin UI uses this for the dynamic
 * "send test" form. Body:
 *   {
 *     to: "+919...",
 *     templateName: "venue_reveal",
 *     languageCode?: "en_US",
 *     bodyParams?: ["Aanya", "Sunday Brunch", ...],
 *     headerImageId?: "<media_id from /upload-media>",
 *   }
 */
router.post("/whatsapp/send-template", strictLimiter, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { to, templateName, languageCode, bodyParams, headerImageId } = req.body as {
      to?: string;
      templateName?: string;
      languageCode?: string;
      bodyParams?: string[];
      headerImageId?: string;
    };
    if (!to) {
      res.status(400).json({ success: false, error: "'to' is required (E.164, e.g. +919663241658)" });
      return;
    }
    if (!templateName) {
      res.status(400).json({ success: false, error: "'templateName' is required" });
      return;
    }
    const result = await sendTemplate({
      to,
      templateName,
      languageCode,
      bodyParams: Array.isArray(bodyParams) ? bodyParams : [],
      headerImageId,
    });
    if (!result.ok) {
      res.status(502).json({
        success: false,
        error: result.error,
        code: result.code,
        httpStatus: result.httpStatus,
        details: result.details,
      });
      return;
    }
    res.json({
      success: true,
      data: {
        messageId: result.messageId,
        normalizedTo: normalizeRecipient(to),
        meta_response: result.raw,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[admin/whatsapp] send-template error:", message);
    res.status(500).json({ success: false, error: message });
  }
});

// ────────────────────────────────────────────────────────────────────────────────
// Install funnel stats — admin visibility into the add-to-home-screen flow.
// ────────────────────────────────────────────────────────────────────────────────

interface UserInstallFields {
  name?: string;
  pwa_installed_at?: string;
  pwa_install_source?: string;
  pwa_last_standalone_at?: string;
  pwa_standalone_session_count?: number;
  add_to_home_screen_sent_at?: string;
  add_to_home_screen_skipped_reason?: string;
}

/**
 * GET /api/admin/whatsapp/install-stats
 * Aggregates the PWA install funnel: members → nudged → installed → active.
 */
router.get("/whatsapp/install-stats", requireAdmin, async (_req: AuthRequest, res) => {
  try {
    const db = await getDb();
    const now = Date.now();
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyHoursAgo = new Date(now - 30 * 60 * 60 * 1000).toISOString();
    const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();

    // Pull all users — at <5k members this is fine; switch to count() aggregations later.
    const usersSnap = await db.collection("users").get();
    const total = usersSnap.size;

    let nudged = 0;
    let installed = 0;
    let activeLast7d = 0;
    let bySourceAndroid = 0;
    let bySourceIos = 0;
    let bySourceStandalone = 0;
    let installedAndroid = 0;
    let installedIos = 0;

    interface InstallEntry {
      user_id: string;
      name?: string;
      installed_at: string;
      source?: string;
      last_standalone_at?: string;
      session_count?: number;
    }
    const recentInstalls: InstallEntry[] = [];

    for (const doc of usersSnap.docs) {
      const u = doc.data() as UserInstallFields;
      if (u.add_to_home_screen_sent_at) nudged++;
      if (u.pwa_installed_at) {
        installed++;
        if (u.pwa_install_source === "android-prompt") {
          bySourceAndroid++;
          installedAndroid++;
        } else if (u.pwa_install_source === "ios-instructions") {
          bySourceIos++;
          installedIos++;
        } else {
          bySourceStandalone++;
        }
        if (u.pwa_last_standalone_at && u.pwa_last_standalone_at >= sevenDaysAgo) {
          activeLast7d++;
        }
        recentInstalls.push({
          user_id: doc.id,
          name: u.name,
          installed_at: u.pwa_installed_at,
          source: u.pwa_install_source,
          last_standalone_at: u.pwa_last_standalone_at,
          session_count: u.pwa_standalone_session_count,
        });
      }
    }

    recentInstalls.sort((a, b) => (a.installed_at < b.installed_at ? 1 : -1));

    // Pending nudges — users whose first ticket landed 24-30h ago, not yet nudged.
    const ticketsSnap = await db
      .collection("tickets")
      .where("status", "in", ["confirmed", "checked_in", "partially_checked_in"])
      .where("purchased_at", ">=", thirtyHoursAgo)
      .where("purchased_at", "<", twentyFourHoursAgo)
      .get();

    const pendingUserIds = new Set<string>();
    for (const t of ticketsSnap.docs) {
      const data = t.data() as { user_id?: string };
      if (data.user_id) pendingUserIds.add(data.user_id);
    }
    let pendingNudges = 0;
    for (const uid of pendingUserIds) {
      const u = usersSnap.docs.find((d) => d.id === uid);
      if (!u) continue;
      const data = u.data() as UserInstallFields;
      if (!data.add_to_home_screen_sent_at && !data.pwa_installed_at) pendingNudges++;
    }

    res.json({
      success: true,
      data: {
        funnel: {
          total_members: total,
          nudged,
          installed,
          active_last_7d: activeLast7d,
          pending_nudges_next_cycle: pendingNudges,
        },
        rates: {
          nudge_to_install:
            nudged > 0 ? Math.round((installed / nudged) * 1000) / 10 : null,
          install_active_last_7d:
            installed > 0 ? Math.round((activeLast7d / installed) * 1000) / 10 : null,
        },
        sources: {
          android_prompt: bySourceAndroid,
          ios_instructions: bySourceIos,
          standalone_detected: bySourceStandalone,
        },
        device_split: {
          android_installs: installedAndroid,
          ios_installs: installedIos,
        },
        recent_installs: recentInstalls.slice(0, 10),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[admin/whatsapp] install-stats error:", message);
    res.status(500).json({ success: false, error: message });
  }
});

// ────────────────────────────────────────────────────────────────────────────────
// Scenarios — the admin-facing mapping of platform events → WhatsApp templates.
// ────────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/whatsapp/scenarios
 * List all scenarios (rsvp_confirmed, venue_revealed, etc.) merged with Firestore overrides.
 */
router.get("/whatsapp/scenarios", requireAdmin, async (_req: AuthRequest, res) => {
  try {
    const scenarios = await listScenarios();
    res.json({ success: true, data: { scenarios } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[admin/whatsapp] scenarios list error:", message);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * PATCH /api/admin/whatsapp/scenarios/:key
 * Body: { enabled?: boolean, templateName?: string }
 * Update kill-switch and/or which template the scenario maps to.
 */
router.patch("/whatsapp/scenarios/:key", strictLimiter, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const key = String(req.params.key);
    const { enabled, templateName } = req.body as { enabled?: boolean; templateName?: string };
    if (typeof enabled !== "boolean" && typeof templateName !== "string") {
      res.status(400).json({ success: false, error: "Provide 'enabled' (boolean) or 'templateName' (string)" });
      return;
    }
    const updated = await updateScenario(key, { enabled, templateName }, req.uid ?? "unknown");
    if (!updated) {
      res.status(404).json({ success: false, error: `Unknown scenario: ${key}` });
      return;
    }
    res.json({ success: true, data: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[admin/whatsapp] scenario update error:", message);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/admin/whatsapp/scenarios/:key/test
 * Body: { to, params?, headerImageId? }
 * Fires the scenario's mapped template with admin-provided params (defaults to sampleParams)
 * to the given recipient. Stamps last_fired_at on success.
 */
router.post("/whatsapp/scenarios/:key/test", strictLimiter, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const key = String(req.params.key);
    const { to, params, headerImageId } = req.body as {
      to?: string;
      params?: string[];
      headerImageId?: string;
    };
    if (!to) {
      res.status(400).json({ success: false, error: "'to' is required (E.164, e.g. +919663241658)" });
      return;
    }
    const scenario = await getScenario(key);
    if (!scenario) {
      res.status(404).json({ success: false, error: `Unknown scenario: ${key}` });
      return;
    }
    if (!scenario.enabled) {
      res.status(409).json({ success: false, error: `Scenario "${key}" is disabled. Toggle it on first.` });
      return;
    }
    const bodyParams = Array.isArray(params) && params.length > 0 ? params : scenario.sampleParams;
    if (scenario.hasImageHeader && !headerImageId) {
      res.status(400).json({
        success: false,
        error: `Scenario "${key}" uses an IMAGE header — upload an image first via /upload-media and pass headerImageId.`,
      });
      return;
    }
    const result = await sendTemplate({
      to,
      templateName: scenario.templateName,
      languageCode: "en_US",
      bodyParams,
      headerImageId,
    });
    if (!result.ok) {
      res.status(502).json({
        success: false,
        error: result.error,
        code: result.code,
        httpStatus: result.httpStatus,
        details: result.details,
      });
      return;
    }
    await recordScenarioFired(key, req.uid ?? null);
    res.json({
      success: true,
      data: {
        scenarioKey: key,
        templateName: scenario.templateName,
        messageId: result.messageId,
        normalizedTo: normalizeRecipient(to),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[admin/whatsapp] scenario test error:", message);
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
