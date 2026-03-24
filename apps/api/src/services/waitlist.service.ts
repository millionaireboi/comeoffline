import { getDb } from "../config/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import type { WaitlistEntry, Event } from "@comeoffline/types";
import { sendToUser, createNotificationRecord } from "./notification.service";

interface WaitlistResult {
  success: boolean;
  entry?: WaitlistEntry;
  error?: string;
}

/** Join the waitlist for an announced event */
export async function joinWaitlist(
  eventId: string,
  userId: string,
  spotsWanted: number,
): Promise<WaitlistResult> {
  const db = await getDb();
  const eventRef = db.collection("events").doc(eventId);

  return db.runTransaction(async (tx) => {
    const eventDoc = await tx.get(eventRef);
    if (!eventDoc.exists) {
      return { success: false, error: "Event not found" };
    }

    const event = { id: eventDoc.id, ...eventDoc.data() } as Event;

    if (event.status !== "announced") {
      return { success: false, error: "Event is not collecting interest" };
    }

    // Check for existing waitlist entry
    const existingSnap = await tx.get(
      eventRef
        .collection("waitlist")
        .where("user_id", "==", userId)
        .where("status", "==", "interested")
        .limit(1),
    );

    if (!existingSnap.empty) {
      return { success: false, error: "You are already on the waitlist" };
    }

    // Create waitlist entry
    const entryRef = eventRef.collection("waitlist").doc();
    const entryData = {
      user_id: userId,
      event_id: eventId,
      spots_wanted: Math.min(Math.max(spotsWanted, 1), 4),
      status: "interested" as const,
      created_at: FieldValue.serverTimestamp(),
    };

    tx.set(entryRef, entryData);

    // Increment waitlist count
    tx.update(eventRef, {
      waitlist_count: FieldValue.increment(1),
    });

    return {
      success: true,
      entry: { id: entryRef.id, ...entryData, created_at: new Date().toISOString() } as WaitlistEntry,
    };
  });
}

/** Get user's active waitlist entry for an event */
export async function getUserWaitlistEntry(
  eventId: string,
  userId: string,
): Promise<WaitlistEntry | null> {
  const db = await getDb();
  const snap = await db
    .collection("events")
    .doc(eventId)
    .collection("waitlist")
    .where("user_id", "==", userId)
    .where("status", "==", "interested")
    .limit(1)
    .get();

  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() } as WaitlistEntry;
}

/** Get all waitlist entries for an event (admin), enriched with user names */
export async function getEventWaitlist(eventId: string): Promise<Array<WaitlistEntry & { user_name?: string }>> {
  const db = await getDb();
  const snap = await db
    .collection("events")
    .doc(eventId)
    .collection("waitlist")
    .orderBy("created_at", "desc")
    .get();

  const entries = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as WaitlistEntry);

  // Batch-fetch user names (chunks of 30 for Firestore 'in' query limit)
  const userIds = [...new Set(entries.map((e) => e.user_id))];
  const userNames: Record<string, string> = {};

  for (let i = 0; i < userIds.length; i += 30) {
    const batchIds = userIds.slice(i, i + 30);
    const usersSnap = await db
      .collection("users")
      .where("__name__", "in", batchIds)
      .select("name")
      .get();

    for (const doc of usersSnap.docs) {
      userNames[doc.id] = doc.data().name || doc.id;
    }
  }

  return entries.map((e) => ({ ...e, user_name: userNames[e.user_id] || e.user_id }));
}

/** Cancel a waitlist entry */
export async function cancelWaitlistEntry(
  eventId: string,
  entryId: string,
  userId: string,
): Promise<boolean> {
  const db = await getDb();
  const eventRef = db.collection("events").doc(eventId);
  const entryRef = eventRef.collection("waitlist").doc(entryId);

  return db.runTransaction(async (tx) => {
    const entryDoc = await tx.get(entryRef);
    if (!entryDoc.exists) return false;

    const data = entryDoc.data();
    if (data?.user_id !== userId || data?.status !== "interested") return false;

    tx.update(entryRef, { status: "cancelled" });
    tx.update(eventRef, { waitlist_count: FieldValue.increment(-1) });
    return true;
  });
}

/** Transition event from announced → listed and notify all waitlisted users */
export async function notifyAndOpenSales(
  eventId: string,
  adminId: string,
): Promise<{ success: boolean; sent: number; failed: number; error?: string }> {
  const db = await getDb();
  const eventRef = db.collection("events").doc(eventId);

  // Atomically transition status
  const event = await db.runTransaction(async (tx) => {
    const eventDoc = await tx.get(eventRef);
    if (!eventDoc.exists) return null;

    const data = { id: eventDoc.id, ...eventDoc.data() } as Event;
    if (data.status !== "announced") return null;

    tx.update(eventRef, { status: "listed" });
    return data;
  });

  if (!event) {
    return { success: false, sent: 0, failed: 0, error: "Event not found or not in announced state" };
  }

  // Query all interested waitlist entries
  const waitlistSnap = await db
    .collection("events")
    .doc(eventId)
    .collection("waitlist")
    .where("status", "==", "interested")
    .get();

  let sent = 0;
  let failed = 0;
  const now = new Date().toISOString();

  // Process in chunks of 400 (Firestore batch limit is 500, leave margin)
  const docs = waitlistSnap.docs;
  for (let i = 0; i < docs.length; i += 400) {
    const chunk = docs.slice(i, i + 400);
    const batch = db.batch();

    for (const doc of chunk) {
      const entry = doc.data();
      const result = await sendToUser(
        entry.user_id,
        `"${event.title}" tickets are live!`,
        "You were on the waitlist — grab your spot now!",
        { event_id: eventId, type: "waitlist_sales_open" },
      );

      if (result.success) {
        sent++;
      } else {
        failed++;
      }

      batch.update(doc.ref, { status: "notified", notified_at: now });
    }

    await batch.commit();
  }

  // Record notification history
  await createNotificationRecord(
    `"${event.title}" tickets are live!`,
    "You were on the waitlist — grab your spot now!",
    `waitlist:${eventId}`,
    adminId,
    sent,
    failed,
  );

  return { success: true, sent, failed };
}
