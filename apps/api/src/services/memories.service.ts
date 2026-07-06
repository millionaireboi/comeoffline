import { getDb } from "../config/firebase-admin";
import type { Memories, Polaroid, OverheardQuote, EventStats } from "@comeoffline/types";

/** Get full memories bundle for an event */
export async function getEventMemories(eventId: string): Promise<Memories> {
  const [polaroids, quotes, stats] = await Promise.all([
    getEventPolaroids(eventId),
    getEventQuotes(eventId),
    getEventStats(eventId),
  ]);

  return { polaroids, quotes, stats };
}

/** Get polaroids for an event */
export async function getEventPolaroids(eventId: string): Promise<Polaroid[]> {
  const db = await getDb();
  const snap = await db
    .collection("events")
    .doc(eventId)
    .collection("polaroids")
    .orderBy("created_at", "desc")
    .get();

  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Polaroid);
}

/** Get overheard quotes for an event */
export async function getEventQuotes(eventId: string): Promise<OverheardQuote[]> {
  const db = await getDb();
  const snap = await db
    .collection("events")
    .doc(eventId)
    .collection("quotes")
    .get();

  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as OverheardQuote);
}

/** Get event stats */
export async function getEventStats(eventId: string): Promise<EventStats> {
  const db = await getDb();
  const eventDoc = await db.collection("events").doc(eventId).get();
  if (!eventDoc.exists) {
    return { attended: 0, phones: 0, drinks: 0, hours: "0" };
  }

  const data = eventDoc.data();
  return {
    attended: data?.stats_attended ?? data?.spots_taken ?? 0,
    phones: data?.stats_phones ?? 0,
    drinks: data?.stats_drinks ?? 0,
    hours: data?.stats_hours ?? "0",
  };
}

/**
 * All-events memories for one user — every event they attended that has
 * polaroids. Powers the permanent "my memories" gallery on the profile,
 * so polaroids stop vanishing when the post-event window closes.
 */
export async function getUserMemories(userId: string): Promise<Array<{
  event_id: string;
  event_title: string;
  event_emoji: string;
  event_date: string;
  polaroids: Polaroid[];
}>> {
  const db = await getDb();

  // Events the user was actually at: checked-in tickets + attended RSVPs
  const ticketSnap = await db
    .collection("tickets")
    .where("user_id", "==", userId)
    .get();
  const ATTENDED = new Set(["checked_in", "partially_checked_in", "confirmed"]);
  const eventIds = new Set<string>(
    ticketSnap.docs
      .filter((d) => ATTENDED.has(d.data().status))
      .map((d) => d.data().event_id as string),
  );

  const rsvpSnap = await db
    .collectionGroup("rsvps")
    .where("user_id", "==", userId)
    .where("status", "in", ["confirmed", "attended"])
    .get();
  rsvpSnap.docs.forEach((d) => {
    const eventId = d.ref.parent.parent?.id;
    if (eventId) eventIds.add(eventId);
  });

  if (eventIds.size === 0) return [];

  const results = await Promise.all(
    [...eventIds].map(async (eventId) => {
      const [eventDoc, polaroids] = await Promise.all([
        db.collection("events").doc(eventId).get(),
        getEventPolaroids(eventId),
      ]);
      if (!eventDoc.exists || polaroids.length === 0) return null;
      const event = eventDoc.data()!;
      return {
        event_id: eventId,
        event_title: (event.title as string) || "Unknown Event",
        event_emoji: (event.emoji as string) || "",
        event_date: (event.date as string) || "",
        polaroids,
      };
    }),
  );

  return results
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime());
}

/** Admin: Add a polaroid */
export async function addPolaroid(
  eventId: string,
  polaroid: Omit<Polaroid, "id">,
): Promise<Polaroid> {
  const db = await getDb();
  const ref = db.collection("events").doc(eventId).collection("polaroids").doc();
  const data = { ...polaroid, created_at: new Date().toISOString() };
  await ref.set(data);
  return { id: ref.id, ...polaroid };
}

/** Admin: Add an overheard quote */
export async function addQuote(
  eventId: string,
  quote: Omit<OverheardQuote, "id">,
): Promise<OverheardQuote> {
  const db = await getDb();
  const ref = db.collection("events").doc(eventId).collection("quotes").doc();
  await ref.set(quote);
  return { id: ref.id, ...quote };
}

/** Admin: Update event stats */
export async function updateEventStats(
  eventId: string,
  stats: EventStats,
): Promise<void> {
  const db = await getDb();
  await db.collection("events").doc(eventId).update({
    stats_attended: stats.attended,
    stats_phones: stats.phones,
    stats_drinks: stats.drinks,
    stats_hours: stats.hours,
  });
}
