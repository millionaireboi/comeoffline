import { db } from "../config/firebase-admin";
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
  const snap = await db
    .collection("events")
    .doc(eventId)
    .collection("quotes")
    .get();

  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as OverheardQuote);
}

/** Get event stats */
export async function getEventStats(eventId: string): Promise<EventStats> {
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

/** Admin: Add a polaroid */
export async function addPolaroid(
  eventId: string,
  polaroid: Omit<Polaroid, "id">,
): Promise<Polaroid> {
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
  const ref = db.collection("events").doc(eventId).collection("quotes").doc();
  await ref.set(quote);
  return { id: ref.id, ...quote };
}

/** Admin: Update event stats */
export async function updateEventStats(
  eventId: string,
  stats: EventStats,
): Promise<void> {
  await db.collection("events").doc(eventId).update({
    stats_attended: stats.attended,
    stats_phones: stats.phones,
    stats_drinks: stats.drinks,
    stats_hours: stats.hours,
  });
}
