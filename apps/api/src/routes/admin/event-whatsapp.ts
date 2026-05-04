/**
 * Admin per-event WhatsApp broadcasts.
 *
 * Mounted at /api/admin/events — adds:
 *   GET  /:id/whatsapp/venue-reveal/preview  → returns recipient count + sample
 *   POST /:id/whatsapp/venue-reveal          → fans out venue_revealed scenario
 *
 * Recipient set = (confirmed RSVPs) ∪ (confirmed/checked_in tickets), deduped by user_id,
 * filtered to users with a phone_number on file.
 */

import { Router } from "express";
import { requireAdmin, type AuthRequest } from "../../middleware/auth";
import { strictLimiter } from "../../middleware/rateLimit";
import { getDb } from "../../config/firebase-admin";
import { env } from "../../config/env";
import {
  sendTemplate,
  normalizeRecipient,
} from "../../services/whatsapp.service";
import {
  getScenario,
  recordScenarioFired,
} from "../../services/whatsapp-scenarios.service";
import type { Event } from "@comeoffline/types";

const router = Router();

interface Recipient {
  user_id: string;
  phone: string;
  first_name: string;
  display_name: string;
}

async function buildRecipients(eventId: string): Promise<{
  event: Event;
  recipients: Recipient[];
  skippedNoPhone: number;
}> {
  const db = await getDb();
  const eventDoc = await db.collection("events").doc(eventId).get();
  if (!eventDoc.exists) throw Object.assign(new Error("Event not found"), { statusCode: 404 });
  const event = { id: eventDoc.id, ...eventDoc.data() } as Event;

  const userIds = new Set<string>();

  // Confirmed RSVPs (free events)
  const rsvpsSnap = await db
    .collection("events")
    .doc(eventId)
    .collection("rsvps")
    .where("status", "==", "confirmed")
    .get();
  for (const d of rsvpsSnap.docs) {
    const data = d.data() as { user_id?: string };
    if (data.user_id) userIds.add(data.user_id);
  }

  // Confirmed / checked-in tickets (paid events)
  const ticketsSnap = await db
    .collection("tickets")
    .where("event_id", "==", eventId)
    .where("status", "in", ["confirmed", "checked_in", "partially_checked_in"])
    .get();
  for (const d of ticketsSnap.docs) {
    const data = d.data() as { user_id?: string };
    if (data.user_id) userIds.add(data.user_id);
  }

  if (userIds.size === 0) {
    return { event, recipients: [], skippedNoPhone: 0 };
  }

  // Pull users in chunks of 10 (Firestore "in" limit)
  const allIds = Array.from(userIds);
  const chunks: string[][] = [];
  for (let i = 0; i < allIds.length; i += 10) chunks.push(allIds.slice(i, i + 10));

  const users = new Map<string, { name?: string; phone_number?: string }>();
  for (const chunk of chunks) {
    const snap = await db
      .collection("users")
      .where("__name__", "in", chunk)
      .get();
    for (const d of snap.docs) {
      const data = d.data() as { name?: string; phone_number?: string };
      users.set(d.id, { name: data.name, phone_number: data.phone_number });
    }
  }

  const recipients: Recipient[] = [];
  let skippedNoPhone = 0;
  for (const id of allIds) {
    const u = users.get(id);
    if (!u || !u.phone_number) {
      skippedNoPhone++;
      continue;
    }
    const fullName = u.name?.trim() ?? "";
    const firstName = fullName.split(/\s+/)[0] || "there";
    recipients.push({
      user_id: id,
      phone: u.phone_number,
      first_name: firstName,
      display_name: fullName || u.phone_number,
    });
  }

  return { event, recipients, skippedNoPhone };
}

/** Format event date+time into a single human string for the template. */
function formatEventDateTime(event: Event): string {
  // event.date is ISO date "2026-05-04"; event.time is human like "11:00 AM" or "11:00 AM - 1:00 PM"
  try {
    const d = new Date(event.date);
    if (!isNaN(d.getTime())) {
      const dayStr = d.toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });
      return `${dayStr} · ${event.time}`;
    }
  } catch {}
  return `${event.date} · ${event.time}`;
}

function buildAddress(event: Event): string {
  const parts = [event.venue_name, event.venue_area, event.venue_address].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "(address pending)";
}

function buildEventUrl(event: Event): string {
  const base = env.appUrl.replace(/\/$/, "");
  return `${base}/events/${event.id}`;
}

function buildMemoriesUrl(eventId: string): string {
  const base = env.appUrl.replace(/\/$/, "");
  return `${base}/events/${eventId}/memories`;
}

/**
 * GET /api/admin/events/:id/whatsapp/venue-reveal/preview
 * Returns recipient count + venue strings the broadcast will use, without sending anything.
 */
router.get("/:id/whatsapp/venue-reveal/preview", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const { event, recipients, skippedNoPhone } = await buildRecipients(id);
    const scenario = await getScenario("venue_revealed");
    res.json({
      success: true,
      data: {
        event: {
          id: event.id,
          title: event.title,
          date: event.date,
          time: event.time,
          venue_address: buildAddress(event),
          venue_ready: !!(event.venue_name || event.venue_address),
        },
        scenario: {
          enabled: scenario?.enabled ?? true,
          template_name: scenario?.templateName ?? "venue_reveal",
        },
        recipients: {
          eligible: recipients.length,
          skipped_no_phone: skippedNoPhone,
          sample: recipients.slice(0, 3).map((r) => ({
            display_name: r.display_name,
            phone_preview: `${r.phone.slice(0, -4).replace(/\d/g, "•")}${r.phone.slice(-4)}`,
          })),
        },
      },
    });
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode ?? 500;
    const message = err instanceof Error ? err.message : "Internal server error";
    if (statusCode !== 404) console.error("[admin/event-whatsapp] preview error:", message);
    res.status(statusCode).json({ success: false, error: message });
  }
});

/**
 * POST /api/admin/events/:id/whatsapp/venue-reveal
 * Fans out the venue_revealed scenario to all eligible recipients.
 * Returns aggregate { sent, failed, errors[] }.
 */
router.post("/:id/whatsapp/venue-reveal", strictLimiter, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const scenario = await getScenario("venue_revealed");
    if (!scenario) {
      res.status(500).json({ success: false, error: "Scenario venue_revealed not configured" });
      return;
    }
    if (!scenario.enabled) {
      res.status(409).json({
        success: false,
        error: "venue_revealed scenario is OFF. Toggle it on in WhatsApp → Scenarios first.",
      });
      return;
    }

    const { event, recipients, skippedNoPhone } = await buildRecipients(id);
    if (recipients.length === 0) {
      res.status(400).json({
        success: false,
        error: "No eligible recipients (no confirmed RSVPs/tickets with a phone number).",
      });
      return;
    }

    const address = buildAddress(event);
    const dateTime = formatEventDateTime(event);
    const url = buildEventUrl(event);

    let sent = 0;
    let failed = 0;
    const errors: Array<{ user_id: string; phone: string; error: string }> = [];

    // Sequential dispatch — keeps us under Cloud API throughput limits and makes failure
    // attribution clean. For larger batches (>200) we'd batch with a small concurrency pool.
    for (const r of recipients) {
      const result = await sendTemplate({
        to: r.phone,
        templateName: scenario.templateName,
        languageCode: "en_US",
        bodyParams: [r.first_name, event.title, address, dateTime, url],
      });
      if (result.ok) {
        sent++;
      } else {
        failed++;
        errors.push({
          user_id: r.user_id,
          phone: normalizeRecipient(r.phone),
          error: result.error,
        });
      }
    }

    if (sent > 0) {
      await recordScenarioFired("venue_revealed", req.uid ?? null);
    }

    res.json({
      success: true,
      data: {
        sent,
        failed,
        skipped_no_phone: skippedNoPhone,
        total_eligible: recipients.length,
        template: scenario.templateName,
        errors: errors.slice(0, 20), // cap response size
      },
    });
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode ?? 500;
    const message = err instanceof Error ? err.message : "Internal server error";
    if (statusCode !== 404) console.error("[admin/event-whatsapp] broadcast error:", message);
    res.status(statusCode).json({ success: false, error: message });
  }
});

// ────────────────────────────────────────────────────────────────────────────────
// Manual broadcasts: event_changed, event_cancelled, memories_ready
// ────────────────────────────────────────────────────────────────────────────────

interface BroadcastFanoutResult {
  sent: number;
  failed: number;
  errors: Array<{ user_id: string; phone: string; error: string }>;
  skipped_no_phone: number;
  total_eligible: number;
  template: string;
}

/**
 * Generic fan-out helper. Resolves recipients, fires the scenario template per recipient,
 * stamps last_fired_at on success.
 */
async function broadcastScenario(
  eventId: string,
  scenarioKey: "event_changed" | "event_cancelled" | "memories_ready",
  buildParams: (event: Event, recipient: Recipient) => string[],
  uid: string | null,
): Promise<{ ok: true; data: BroadcastFanoutResult } | { ok: false; status: number; error: string }> {
  const scenario = await getScenario(scenarioKey);
  if (!scenario) return { ok: false, status: 500, error: `Scenario ${scenarioKey} not configured` };
  if (!scenario.enabled) {
    return {
      ok: false,
      status: 409,
      error: `${scenarioKey} scenario is OFF. Toggle it on in WhatsApp → Scenarios first.`,
    };
  }

  const { event, recipients, skippedNoPhone } = await buildRecipients(eventId);
  if (recipients.length === 0) {
    return {
      ok: false,
      status: 400,
      error: "No eligible recipients (no confirmed RSVPs/tickets with a phone number).",
    };
  }

  let sent = 0;
  let failed = 0;
  const errors: BroadcastFanoutResult["errors"] = [];

  for (const r of recipients) {
    const result = await sendTemplate({
      to: r.phone,
      templateName: scenario.templateName,
      languageCode: "en_US",
      bodyParams: buildParams(event, r),
    });
    if (result.ok) {
      sent++;
    } else {
      failed++;
      errors.push({
        user_id: r.user_id,
        phone: normalizeRecipient(r.phone),
        error: result.error,
      });
    }
  }

  if (sent > 0) await recordScenarioFired(scenarioKey, uid);

  return {
    ok: true,
    data: {
      sent,
      failed,
      errors: errors.slice(0, 20),
      skipped_no_phone: skippedNoPhone,
      total_eligible: recipients.length,
      template: scenario.templateName,
    },
  };
}

/**
 * POST /api/admin/events/:id/whatsapp/event-changed
 * Body: { change_text } — short description of what changed (e.g. "Time changed to 2:00 PM")
 */
router.post("/:id/whatsapp/event-changed", strictLimiter, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const { change_text } = req.body as { change_text?: string };
    if (!change_text || change_text.trim().length === 0) {
      res.status(400).json({ success: false, error: "'change_text' is required" });
      return;
    }
    const trimmed = change_text.trim().slice(0, 300);
    const result = await broadcastScenario(
      id,
      "event_changed",
      (event, r) => [r.first_name, event.title, trimmed, buildEventUrl(event)],
      req.uid ?? null,
    );
    if (!result.ok) {
      res.status(result.status).json({ success: false, error: result.error });
      return;
    }
    res.json({ success: true, data: result.data });
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode ?? 500;
    const message = err instanceof Error ? err.message : "Internal server error";
    if (statusCode !== 404) console.error("[admin/event-whatsapp] event-changed error:", message);
    res.status(statusCode).json({ success: false, error: message });
  }
});

/**
 * POST /api/admin/events/:id/whatsapp/event-cancelled
 * Body: { reason }   short cancellation reason
 * Also flips event.status → "cancelled".
 */
router.post("/:id/whatsapp/event-cancelled", strictLimiter, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const { reason } = req.body as { reason?: string };
    if (!reason || reason.trim().length === 0) {
      res.status(400).json({ success: false, error: "'reason' is required" });
      return;
    }
    const trimmed = reason.trim().slice(0, 300);

    const result = await broadcastScenario(
      id,
      "event_cancelled",
      (event, r) => [r.first_name, event.title, trimmed, buildEventUrl(event)],
      req.uid ?? null,
    );
    if (!result.ok) {
      res.status(result.status).json({ success: false, error: result.error });
      return;
    }

    // Flip event status to cancelled (separate concern from broadcast)
    try {
      const db = await getDb();
      await db.collection("events").doc(id).update({ status: "cancelled" });
    } catch (statusErr) {
      console.warn("[admin/event-whatsapp] event status update failed (broadcast still sent):", statusErr);
    }

    res.json({ success: true, data: result.data });
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode ?? 500;
    const message = err instanceof Error ? err.message : "Internal server error";
    if (statusCode !== 404) console.error("[admin/event-whatsapp] event-cancelled error:", message);
    res.status(statusCode).json({ success: false, error: message });
  }
});

/**
 * POST /api/admin/events/:id/whatsapp/memories-ready
 * Notifies confirmed attendees that memories are uploaded and viewable.
 */
router.post("/:id/whatsapp/memories-ready", strictLimiter, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const result = await broadcastScenario(
      id,
      "memories_ready",
      (event, r) => [r.first_name, event.title, buildMemoriesUrl(event.id)],
      req.uid ?? null,
    );
    if (!result.ok) {
      res.status(result.status).json({ success: false, error: result.error });
      return;
    }
    res.json({ success: true, data: result.data });
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode ?? 500;
    const message = err instanceof Error ? err.message : "Internal server error";
    if (statusCode !== 404) console.error("[admin/event-whatsapp] memories-ready error:", message);
    res.status(statusCode).json({ success: false, error: message });
  }
});

export default router;
