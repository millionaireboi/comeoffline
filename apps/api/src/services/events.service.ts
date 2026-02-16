import { getDb } from "../config/firebase-admin";
import type { Event } from "@comeoffline/types";

/** Fetch all upcoming/live events for the user feed */
export async function getEvents(): Promise<Event[]> {
  const db = await getDb();
  const snap = await db
    .collection("events")
    .where("status", "in", ["upcoming", "sold_out", "live"])
    .orderBy("date", "asc")
    .get();

  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Event);
}

/** Fetch a single event by ID */
export async function getEventById(eventId: string): Promise<Event | null> {
  const db = await getDb();
  const doc = await db.collection("events").doc(eventId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as Event;
}

/** Create a new event (admin) */
export async function createEvent(
  data: Omit<Event, "id">,
): Promise<Event> {
  const db = await getDb();
  const ref = await db.collection("events").add({
    ...data,
    spots_taken: 0,
    status: data.status || "draft",
  });
  const doc = await ref.get();
  return { id: doc.id, ...doc.data() } as Event;
}

/** Update an event (admin) */
export async function updateEvent(
  eventId: string,
  data: Partial<Omit<Event, "id">>,
): Promise<Event | null> {
  const db = await getDb();
  const ref = db.collection("events").doc(eventId);
  const doc = await ref.get();
  if (!doc.exists) return null;

  await ref.update(data);
  const updated = await ref.get();
  return { id: updated.id, ...updated.data() } as Event;
}

/** Update event status (admin) */
export async function updateEventStatus(
  eventId: string,
  status: Event["status"],
): Promise<boolean> {
  const db = await getDb();
  const ref = db.collection("events").doc(eventId);
  const doc = await ref.get();
  if (!doc.exists) return false;

  await ref.update({ status });
  return true;
}
