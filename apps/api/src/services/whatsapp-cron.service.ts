/**
 * WhatsApp scheduled tasks — runs in-process via setInterval from index.ts.
 *
 * Currently:
 *   - runDayBeforeReminders(): fires `event_reminder_day_before` scenario for events
 *     happening tomorrow (IST). Per-(event, user) dedup via `whatsapp_reminders` collection.
 *
 * Designed to run every 30 min. Acquires a distributed lock so multiple API instances
 * don't double-fire.
 */

import { getDb } from "../config/firebase-admin";
import { env } from "../config/env";
import { sendTemplate } from "./whatsapp.service";
import {
  isScenarioEnabled,
  getMappedTemplate,
  recordScenarioFired,
} from "./whatsapp-scenarios.service";

const REMINDER_LOCK_TTL_MS = 5 * 60 * 1000; // 5 min — generous, since reminders touch many users

/** Returns YYYY-MM-DD string in Asia/Kolkata for given offsetDays. */
function istDate(offsetDays: number): string {
  const now = new Date();
  // IST = UTC+5:30. Compute "today in IST" by shifting now by 5h30m, then take UTC date components.
  const istNow = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  istNow.setUTCDate(istNow.getUTCDate() + offsetDays);
  return istNow.toISOString().slice(0, 10); // YYYY-MM-DD
}

interface ReminderResult {
  triggered: boolean;
  eventsConsidered: number;
  sent: number;
  alreadySent: number;
  skippedNoPhone: number;
  failed: number;
}

/**
 * Find events happening tomorrow (IST) and send reminders to confirmed attendees.
 * Idempotent — per-(event, user) dedup keeps re-runs safe.
 */
export async function runDayBeforeReminders(): Promise<ReminderResult> {
  const noopResult: ReminderResult = {
    triggered: false,
    eventsConsidered: 0,
    sent: 0,
    alreadySent: 0,
    skippedNoPhone: 0,
    failed: 0,
  };

  const db = await getDb();

  // Distributed lock so only one instance fires the reminders per cycle.
  const lockRef = db.collection("_system").doc("whatsapp_reminder_lock");
  const now = Date.now();
  const acquired = await db.runTransaction(async (tx) => {
    const lockDoc = await tx.get(lockRef);
    const lockData = lockDoc.data();
    if (lockData && lockData.locked_until > now) return false;
    tx.set(lockRef, {
      locked_until: now + REMINDER_LOCK_TTL_MS,
      acquired_at: new Date().toISOString(),
    });
    return true;
  });
  if (!acquired) return noopResult;

  try {
    if (!(await isScenarioEnabled("event_reminder_day_before"))) {
      return { ...noopResult, triggered: true };
    }
    const templateName = await getMappedTemplate("event_reminder_day_before");
    if (!templateName) return { ...noopResult, triggered: true };

    const tomorrow = istDate(1);
    const eventsSnap = await db
      .collection("events")
      .where("date", "==", tomorrow)
      .where("status", "in", ["upcoming", "listed", "live"])
      .get();

    if (eventsSnap.empty) return { ...noopResult, triggered: true };

    let sent = 0;
    let alreadySent = 0;
    let skippedNoPhone = 0;
    let failed = 0;

    for (const eventDoc of eventsSnap.docs) {
      const event = { id: eventDoc.id, ...eventDoc.data() } as {
        id: string;
        title?: string;
        time?: string;
        venue_name?: string;
        venue_area?: string;
        venue_address?: string;
      };
      if (!event.title) continue;

      // Recipients = confirmed/checked_in tickets for this event
      const ticketsSnap = await db
        .collection("tickets")
        .where("event_id", "==", event.id)
        .where("status", "in", ["confirmed", "checked_in", "partially_checked_in"])
        .get();

      const userIds = Array.from(new Set(ticketsSnap.docs.map((d) => (d.data() as { user_id?: string }).user_id).filter(Boolean) as string[]));
      if (userIds.length === 0) continue;

      // Pull users in chunks of 10
      const users = new Map<string, { name?: string; phone_number?: string; phone_verified_at?: string }>();
      for (let i = 0; i < userIds.length; i += 10) {
        const chunk = userIds.slice(i, i + 10);
        const snap = await db.collection("users").where("__name__", "in", chunk).get();
        for (const d of snap.docs) {
          users.set(d.id, d.data() as { name?: string; phone_number?: string; phone_verified_at?: string });
        }
      }

      const eventUrl = `${env.appUrl.replace(/\/$/, "")}/events/${event.id}`;

      for (const userId of userIds) {
        const u = users.get(userId);
        if (!u?.phone_number) {
          skippedNoPhone++;
          continue;
        }

        // Per-(event,user) dedup
        const reminderRef = db
          .collection("whatsapp_reminders")
          .doc(`${event.id}_${userId}_day_before`);
        const reminderDoc = await reminderRef.get();
        if (reminderDoc.exists) {
          alreadySent++;
          continue;
        }

        const firstName = (u.name || "there").split(/\s+/)[0];
        const result = await sendTemplate({
          to: u.phone_number,
          templateName,
          languageCode: "en_US",
          bodyParams: [firstName, event.title, event.time ?? "", eventUrl],
        });

        if (result.ok) {
          sent++;
          await reminderRef.set({
            event_id: event.id,
            user_id: userId,
            scenario: "event_reminder_day_before",
            wamid: result.messageId,
            sent_at: new Date().toISOString(),
          });
        } else {
          failed++;
          console.error(
            `[whatsapp-cron] reminder send failed for event=${event.id} user=${userId}: ${result.error}`,
          );
          // Don't write reminder doc on failure → next cycle will retry
        }
      }
    }

    if (sent > 0) await recordScenarioFired("event_reminder_day_before", null);

    return {
      triggered: true,
      eventsConsidered: eventsSnap.size,
      sent,
      alreadySent,
      skippedNoPhone,
      failed,
    };
  } finally {
    await lockRef.delete().catch(() => {});
  }
}

// ────────────────────────────────────────────────────────────────────────────────
// Add-to-home-screen nudge — fires 24h after first ticket confirmation, once per user.
// ────────────────────────────────────────────────────────────────────────────────

interface InstallNudgeResult {
  triggered: boolean;
  candidatesConsidered: number;
  sent: number;
  alreadySent: number;
  alreadyInstalled: number;
  skippedNoPhone: number;
  failed: number;
}

const INSTALL_NUDGE_LOCK_TTL_MS = 5 * 60 * 1000;
const INSTALL_NUDGE_DELAY_MS = 24 * 60 * 60 * 1000;
const INSTALL_NUDGE_WINDOW_MS = 6 * 60 * 60 * 1000; // 24-30h after first ticket

/**
 * Find users whose first ticket was confirmed 24-30h ago, who haven't already been nudged
 * and haven't installed the PWA, and fire the add_to_home_screen scenario.
 *
 * Window is wide enough that 30-min cron cadence catches every eligible user reliably.
 * Per-user dedup via `users/{uid}.add_to_home_screen_sent_at`.
 */
export async function runInstallNudges(): Promise<InstallNudgeResult> {
  const noopResult: InstallNudgeResult = {
    triggered: false,
    candidatesConsidered: 0,
    sent: 0,
    alreadySent: 0,
    alreadyInstalled: 0,
    skippedNoPhone: 0,
    failed: 0,
  };

  const db = await getDb();

  const lockRef = db.collection("_system").doc("whatsapp_install_nudge_lock");
  const now = Date.now();
  const acquired = await db.runTransaction(async (tx) => {
    const lockDoc = await tx.get(lockRef);
    const lockData = lockDoc.data();
    if (lockData && lockData.locked_until > now) return false;
    tx.set(lockRef, {
      locked_until: now + INSTALL_NUDGE_LOCK_TTL_MS,
      acquired_at: new Date().toISOString(),
    });
    return true;
  });
  if (!acquired) return noopResult;

  try {
    if (!(await isScenarioEnabled("add_to_home_screen"))) {
      return { ...noopResult, triggered: true };
    }
    const templateName = await getMappedTemplate("add_to_home_screen");
    if (!templateName) return { ...noopResult, triggered: true };

    // Window: tickets confirmed between 30h and 24h ago (i.e., now - 30h .. now - 24h)
    const windowStart = new Date(Date.now() - INSTALL_NUDGE_DELAY_MS - INSTALL_NUDGE_WINDOW_MS).toISOString();
    const windowEnd = new Date(Date.now() - INSTALL_NUDGE_DELAY_MS).toISOString();

    const ticketsSnap = await db
      .collection("tickets")
      .where("status", "in", ["confirmed", "checked_in", "partially_checked_in"])
      .where("purchased_at", ">=", windowStart)
      .where("purchased_at", "<", windowEnd)
      .get();

    if (ticketsSnap.empty) return { ...noopResult, triggered: true };

    // Dedupe to one ticket per user (earliest)
    const earliestPerUser = new Map<string, string>(); // user_id -> ticketId
    for (const d of ticketsSnap.docs) {
      const data = d.data() as { user_id?: string };
      if (data.user_id && !earliestPerUser.has(data.user_id)) {
        earliestPerUser.set(data.user_id, d.id);
      }
    }

    const userIds = Array.from(earliestPerUser.keys());
    if (userIds.length === 0) return { ...noopResult, triggered: true };

    let sent = 0;
    let alreadySent = 0;
    let alreadyInstalled = 0;
    let skippedNoPhone = 0;
    let failed = 0;

    const installUrl = `${env.appUrl.replace(/\/$/, "")}/install`;

    for (const userId of userIds) {
      const userRef = db.collection("users").doc(userId);
      const userSnap = await userRef.get();
      if (!userSnap.exists) continue;
      const u = userSnap.data() as {
        name?: string;
        phone_number?: string;
        phone_verified_at?: string;
        pwa_installed_at?: string;
        add_to_home_screen_sent_at?: string;
      };

      if (u.add_to_home_screen_sent_at) {
        alreadySent++;
        continue;
      }
      if (u.pwa_installed_at) {
        alreadyInstalled++;
        // Stamp sent_at anyway so we never re-evaluate this user
        await userRef.set(
          { add_to_home_screen_sent_at: new Date().toISOString(), add_to_home_screen_skipped_reason: "already_installed" },
          { merge: true },
        );
        continue;
      }
      if (!u.phone_number || !u.phone_verified_at) {
        skippedNoPhone++;
        continue;
      }

      const firstName = (u.name || "there").split(/\s+/)[0];
      const result = await sendTemplate({
        to: u.phone_number,
        templateName,
        languageCode: "en_US",
        bodyParams: [firstName, installUrl],
      });

      if (result.ok) {
        sent++;
        await userRef.set(
          {
            add_to_home_screen_sent_at: new Date().toISOString(),
            add_to_home_screen_wamid: result.messageId,
          },
          { merge: true },
        );
      } else {
        failed++;
        console.error(
          `[whatsapp-cron] install-nudge send failed for user=${userId}: ${result.error}`,
        );
        // Don't stamp sent_at on failure → next cycle retries
      }
    }

    if (sent > 0) await recordScenarioFired("add_to_home_screen", null);

    return {
      triggered: true,
      candidatesConsidered: userIds.length,
      sent,
      alreadySent,
      alreadyInstalled,
      skippedNoPhone,
      failed,
    };
  } finally {
    await lockRef.delete().catch(() => {});
  }
}
