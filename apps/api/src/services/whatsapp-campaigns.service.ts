/**
 * WhatsApp marketing campaigns — bulk template sends to a segmented audience.
 *
 * Data model:
 *   whatsapp_campaigns/{id}                     campaign doc (status, template, audience, totals)
 *   whatsapp_campaigns/{id}/recipients/{key}    one doc per recipient (pending → sent/failed)
 *   whatsapp_messages/{wamid}                   dispatch record (kind: "campaign") — the existing
 *                                               delivery webhook appends status_history for free.
 *
 * The send engine is resumable: each call processes pending recipients until done or the
 * time budget runs out, then returns progress. Cloud Run request timeouts and crashes never
 * lose state — calling send again continues where it left off. A lock field on the campaign
 * doc prevents two instances from processing the same campaign concurrently.
 */

import { getDb } from "../config/firebase-admin";
import { sendTemplate, normalizeRecipient } from "./whatsapp.service";

export type CampaignAudience =
  | { type: "all" }
  | { type: "status"; status: "active" | "provisional" }
  | { type: "event"; event_id: string }
  | { type: "purchasers" }
  | { type: "never_purchased" }
  | { type: "manual"; phones: string[] };

export type CampaignStatus = "draft" | "sending" | "sent" | "cancelled";

export interface CampaignTotals {
  eligible: number;
  sent: number;
  failed: number;
  skipped_no_phone: number;
}

export interface Campaign {
  id: string;
  name: string;
  template_name: string;
  language_code: string;
  /** Values for {{1}}..{{n}} — may contain {first_name} / {name} personalization tokens */
  body_params: string[];
  header_image_id: string | null;
  audience: CampaignAudience;
  status: CampaignStatus;
  totals: CampaignTotals;
  created_at: string;
  created_by: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
  cancelled_at?: string;
}

export interface ResolvedRecipient {
  user_id: string | null;
  phone: string; // normalized, digits only
  first_name: string;
  display_name: string;
}

export interface AudiencePreview {
  eligible: number;
  skipped_no_phone: number;
  sample: Array<{ display_name: string; phone_preview: string }>;
}

const CONFIRMED_TICKET_STATUSES = ["confirmed", "checked_in", "partially_checked_in"];

export function maskPhone(phone: string): string {
  return `${phone.slice(0, -4).replace(/\d/g, "•")}${phone.slice(-4)}`;
}

/** Normalize an admin-pasted phone. Bare 10-digit numbers are assumed Indian (+91). */
export function normalizeManualPhone(input: string): string | null {
  const digits = input.replace(/[^\d]/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return digits;
  return null;
}

interface UserLite {
  name?: string;
  phone_number?: string;
  status?: string;
}

function toRecipient(userId: string | null, phone: string, name?: string): ResolvedRecipient {
  const fullName = name?.trim() ?? "";
  const firstName = fullName.split(/\s+/)[0] || "there";
  return {
    user_id: userId,
    phone: normalizeRecipient(phone),
    first_name: firstName,
    display_name: fullName || phone,
  };
}

/**
 * Resolve an audience definition into a deduped recipient list.
 * Full users scan is fine at current scale (<5k members) — same approach as install-stats.
 */
export async function resolveAudience(
  audience: CampaignAudience,
): Promise<{ recipients: ResolvedRecipient[]; skippedNoPhone: number }> {
  const db = await getDb();

  // Phone → user map, used by every audience type (manual lists resolve names through it too).
  const usersSnap = await db.collection("users").get();
  const users = new Map<string, UserLite>();
  const usersByPhone = new Map<string, { id: string; data: UserLite }>();
  for (const doc of usersSnap.docs) {
    const data = doc.data() as UserLite;
    users.set(doc.id, data);
    if (data.phone_number) {
      usersByPhone.set(normalizeRecipient(data.phone_number), { id: doc.id, data });
    }
  }

  const recipients: ResolvedRecipient[] = [];
  const seenPhones = new Set<string>();
  let skippedNoPhone = 0;

  const push = (userId: string | null, u: UserLite | null, rawPhone?: string) => {
    const phone = rawPhone ?? u?.phone_number;
    if (!phone) {
      skippedNoPhone++;
      return;
    }
    const normalized = normalizeRecipient(phone);
    if (!normalized || seenPhones.has(normalized)) return;
    seenPhones.add(normalized);
    recipients.push(toRecipient(userId, normalized, u?.name));
  };

  switch (audience.type) {
    case "all": {
      for (const [id, u] of users) push(id, u);
      break;
    }
    case "status": {
      for (const [id, u] of users) {
        if (u.status === audience.status) push(id, u);
      }
      break;
    }
    case "event": {
      const userIds = new Set<string>();
      const rsvpsSnap = await db
        .collection("events")
        .doc(audience.event_id)
        .collection("rsvps")
        .where("status", "==", "confirmed")
        .get();
      for (const d of rsvpsSnap.docs) {
        const uid = (d.data() as { user_id?: string }).user_id;
        if (uid) userIds.add(uid);
      }
      const ticketsSnap = await db
        .collection("tickets")
        .where("event_id", "==", audience.event_id)
        .where("status", "in", CONFIRMED_TICKET_STATUSES)
        .get();
      for (const d of ticketsSnap.docs) {
        const uid = (d.data() as { user_id?: string }).user_id;
        if (uid) userIds.add(uid);
      }
      for (const uid of userIds) push(uid, users.get(uid) ?? null);
      break;
    }
    case "purchasers":
    case "never_purchased": {
      const ticketsSnap = await db
        .collection("tickets")
        .where("status", "in", CONFIRMED_TICKET_STATUSES)
        .get();
      const purchaserIds = new Set<string>();
      for (const d of ticketsSnap.docs) {
        const uid = (d.data() as { user_id?: string }).user_id;
        if (uid) purchaserIds.add(uid);
      }
      if (audience.type === "purchasers") {
        for (const uid of purchaserIds) push(uid, users.get(uid) ?? null);
      } else {
        for (const [id, u] of users) {
          if (!purchaserIds.has(id)) push(id, u);
        }
      }
      break;
    }
    case "manual": {
      for (const raw of audience.phones) {
        const normalized = normalizeManualPhone(raw);
        if (!normalized) {
          skippedNoPhone++;
          continue;
        }
        const match = usersByPhone.get(normalized);
        push(match?.id ?? null, match?.data ?? null, normalized);
      }
      break;
    }
  }

  return { recipients, skippedNoPhone };
}

export async function previewAudience(audience: CampaignAudience): Promise<AudiencePreview> {
  const { recipients, skippedNoPhone } = await resolveAudience(audience);
  return {
    eligible: recipients.length,
    skipped_no_phone: skippedNoPhone,
    sample: recipients.slice(0, 3).map((r) => ({
      display_name: r.display_name,
      phone_preview: maskPhone(r.phone),
    })),
  };
}

/** Replace {first_name} / {name} tokens in template params with per-recipient values. */
export function personalizeParams(params: string[], r: ResolvedRecipient): string[] {
  return params.map((p) =>
    p.replace(/\{first_name\}/gi, r.first_name).replace(/\{name\}/gi, r.display_name),
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Send engine
// ────────────────────────────────────────────────────────────────────────────────

const LOCK_TTL_MS = 90 * 1000;
const BATCH_SIZE = 20;

export interface SendProgress {
  done: boolean;
  status: CampaignStatus;
  sent: number;
  failed: number;
  remaining: number;
  total_eligible: number;
}

/**
 * Start or resume a campaign send. Processes pending recipients sequentially (same
 * throughput reasoning as the event broadcasts) until done or `timeBudgetMs` elapses.
 * Returns progress; the caller re-invokes until `done`.
 */
export async function processCampaignSend(
  campaignId: string,
  opts: { timeBudgetMs?: number } = {},
): Promise<SendProgress> {
  const db = await getDb();
  const startedAt = Date.now();
  const timeBudgetMs = opts.timeBudgetMs ?? 45_000;
  const campaignRef = db.collection("whatsapp_campaigns").doc(campaignId);

  // Acquire the campaign lock + flip draft → sending atomically.
  const acquired = await db.runTransaction(async (tx) => {
    const snap = await tx.get(campaignRef);
    if (!snap.exists) throw Object.assign(new Error("Campaign not found"), { statusCode: 404 });
    const c = snap.data() as Campaign & { lock_until?: number };
    if (c.status === "sent" || c.status === "cancelled") {
      throw Object.assign(new Error(`Campaign is already ${c.status}`), { statusCode: 409 });
    }
    if (c.lock_until && c.lock_until > Date.now()) return false;
    tx.update(campaignRef, {
      status: "sending",
      lock_until: Date.now() + LOCK_TTL_MS,
      updated_at: new Date().toISOString(),
      ...(c.status === "draft" ? { started_at: new Date().toISOString() } : {}),
    });
    return true;
  });
  if (!acquired) {
    throw Object.assign(
      new Error("Another send is already in progress for this campaign"),
      { statusCode: 409 },
    );
  }

  try {
    const campaignSnap = await campaignRef.get();
    const campaign = { id: campaignSnap.id, ...campaignSnap.data() } as Campaign;
    const recipientsCol = campaignRef.collection("recipients");

    // First run: materialize the audience into the recipients subcollection so the
    // send set is frozen at send time and every recipient's outcome is auditable.
    const existing = await recipientsCol.limit(1).get();
    if (existing.empty) {
      const { recipients, skippedNoPhone } = await resolveAudience(campaign.audience);
      if (recipients.length === 0) {
        // Revert to draft so the campaign isn't stranded in "sending" with nothing to send.
        await campaignRef.update({ status: "draft", lock_until: 0 });
        throw Object.assign(
          new Error("No eligible recipients (no matching users with a phone number)"),
          { statusCode: 400 },
        );
      }
      let batch = db.batch();
      let inBatch = 0;
      for (const r of recipients) {
        batch.set(recipientsCol.doc(r.phone), {
          ...r,
          status: "pending",
          wamid: null,
          error: null,
          sent_at: null,
        });
        if (++inBatch >= 400) {
          await batch.commit();
          batch = db.batch();
          inBatch = 0;
        }
      }
      if (inBatch > 0) await batch.commit();
      await campaignRef.update({
        "totals.eligible": recipients.length,
        "totals.skipped_no_phone": skippedNoPhone,
      });
    }

    let sentThisRun = 0;
    let failedThisRun = 0;

    for (;;) {
      // Re-read status each batch so cancel takes effect mid-send.
      const fresh = (await campaignRef.get()).data() as Campaign;
      if (fresh.status === "cancelled") break;

      const pendingSnap = await recipientsCol
        .where("status", "==", "pending")
        .limit(BATCH_SIZE)
        .get();
      if (pendingSnap.empty) {
        await campaignRef.update({
          status: "sent",
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        break;
      }

      for (const doc of pendingSnap.docs) {
        const r = doc.data() as ResolvedRecipient;
        const nowIso = new Date().toISOString();
        const result = await sendTemplate({
          to: r.phone,
          templateName: campaign.template_name,
          languageCode: campaign.language_code,
          bodyParams: personalizeParams(campaign.body_params, r),
          headerImageId: campaign.header_image_id ?? undefined,
        });

        if (result.ok) {
          sentThisRun++;
          await doc.ref.update({ status: "sent", wamid: result.messageId, sent_at: nowIso });
          // Dispatch record — the delivery webhook appends sent/delivered/read/failed here.
          if (result.messageId) {
            await db.collection("whatsapp_messages").doc(result.messageId).set({
              wamid: result.messageId,
              kind: "campaign",
              campaign_id: campaignId,
              user_id: r.user_id,
              to_normalized: r.phone,
              template_name: campaign.template_name,
              sent_at: nowIso,
              status: "accepted",
              status_history: [{ status: "accepted", at: nowIso }],
            });
          }
        } else {
          failedThisRun++;
          await doc.ref.update({
            status: "failed",
            error: `${result.error}${result.code ? ` (code ${result.code})` : ""}`,
            error_code: result.code ?? null,
            sent_at: nowIso,
          });
        }
      }

      if (Date.now() - startedAt > timeBudgetMs) break;
      // Renew lock so long sends don't lose it mid-flight.
      await campaignRef.update({ lock_until: Date.now() + LOCK_TTL_MS });
    }

    // Reconcile authoritative totals from the recipient docs (cheap aggregate queries).
    const [sentCount, failedCount, pendingCount] = await Promise.all([
      recipientsCol.where("status", "==", "sent").count().get(),
      recipientsCol.where("status", "==", "failed").count().get(),
      recipientsCol.where("status", "==", "pending").count().get(),
    ]);
    const sent = sentCount.data().count;
    const failed = failedCount.data().count;
    const remaining = pendingCount.data().count;

    await campaignRef.update({
      "totals.sent": sent,
      "totals.failed": failed,
      updated_at: new Date().toISOString(),
      lock_until: 0,
    });

    console.log(
      `[whatsapp-campaign] ${campaignId}: +${sentThisRun} sent, +${failedThisRun} failed this run — ${remaining} remaining`,
    );

    const finalStatus = ((await campaignRef.get()).data() as Campaign).status;
    return {
      done: remaining === 0 || finalStatus === "cancelled",
      status: finalStatus,
      sent,
      failed,
      remaining,
      total_eligible: sent + failed + remaining,
    };
  } catch (err) {
    await campaignRef.update({ lock_until: 0 }).catch(() => {});
    throw err;
  }
}

/**
 * Meta error codes that are worth retrying later — rate limits and transient platform
 * failures. Everything else (invalid number, recipient not on WhatsApp, template/param
 * errors) would just fail again identically.
 */
const RETRYABLE_FAILURE_CODES = new Set([
  131000, // generic "something went wrong"
  131048, // spam rate limit hit
  131049, // per-user marketing cap ("healthy ecosystem engagement") — retry after a day+
  131056, // (business, consumer) pair rate limit
  130429, // throughput rate limit
]);

/**
 * Flip failed recipients back to pending so the send engine picks them up again.
 * By default only retryable failures (rate limits / transient errors / network errors
 * with no code) are re-queued; pass `all: true` to retry everything.
 */
export async function requeueFailedRecipients(
  campaignId: string,
  opts: { all?: boolean } = {},
): Promise<{ requeued: number; skipped_permanent: number }> {
  const db = await getDb();
  const ref = db.collection("whatsapp_campaigns").doc(campaignId);
  const doc = await ref.get();
  if (!doc.exists) throw Object.assign(new Error("Campaign not found"), { statusCode: 404 });
  const campaign = doc.data() as Campaign;
  if (campaign.status === "draft" || campaign.status === "cancelled") {
    throw Object.assign(
      new Error(`Campaign is ${campaign.status} — retry only applies after a send`),
      { statusCode: 409 },
    );
  }

  const failedSnap = await ref.collection("recipients").where("status", "==", "failed").get();
  let requeued = 0;
  let skippedPermanent = 0;
  let batch = db.batch();
  let inBatch = 0;
  for (const d of failedSnap.docs) {
    const code = (d.data() as { error_code?: number | null }).error_code ?? null;
    // No code = network-level failure before Meta answered — safe to retry.
    const retryable = opts.all === true || code === null || RETRYABLE_FAILURE_CODES.has(code);
    if (!retryable) {
      skippedPermanent++;
      continue;
    }
    batch.update(d.ref, { status: "pending", error: null, error_code: null });
    requeued++;
    if (++inBatch >= 400) {
      await batch.commit();
      batch = db.batch();
      inBatch = 0;
    }
  }
  if (inBatch > 0) await batch.commit();

  if (requeued > 0) {
    await ref.update({
      status: "sending",
      "totals.failed": skippedPermanent,
      updated_at: new Date().toISOString(),
    });
  }
  return { requeued, skipped_permanent: skippedPermanent };
}

/** Aggregate delivery statuses from whatsapp_messages dispatch records for a campaign. */
export async function campaignDeliveryStats(campaignId: string): Promise<{
  counts: Record<string, number>;
  failures: Array<{ to: string; error: string }>;
}> {
  const db = await getDb();
  const snap = await db
    .collection("whatsapp_messages")
    .where("campaign_id", "==", campaignId)
    .select("status", "to_normalized", "failure_message", "failure_title", "failure_code")
    .get();

  const counts: Record<string, number> = {};
  const failures: Array<{ to: string; error: string }> = [];
  for (const doc of snap.docs) {
    const d = doc.data() as {
      status?: string;
      to_normalized?: string;
      failure_message?: string;
      failure_title?: string;
      failure_code?: number;
    };
    const status = d.status ?? "accepted";
    counts[status] = (counts[status] ?? 0) + 1;
    if (status === "failed" && failures.length < 20) {
      failures.push({
        to: maskPhone(d.to_normalized ?? ""),
        error:
          [d.failure_code, d.failure_title, d.failure_message].filter(Boolean).join(" — ") ||
          "unknown error",
      });
    }
  }
  return { counts, failures };
}
