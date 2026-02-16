import { getDb } from "../config/firebase-admin";
import type { Event } from "@comeoffline/types";

/** Fetch all upcoming/live events for the user feed */
export async function getEvents(): Promise<Event[]> {
  const db = await getDb();
  // Simple orderBy-only query avoids needing a composite index
  const snap = await db.collection("events").orderBy("date", "asc").get();
  const validStatuses = new Set(["upcoming", "sold_out", "live"]);

  return snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }) as Event)
    .filter((e) => validStatuses.has(e.status));
}

/** Fetch ALL events for admin (includes drafts, completed, etc.) */
export async function getAllEvents(): Promise<Event[]> {
  const db = await getDb();
  const snap = await db
    .collection("events")
    .orderBy("date", "desc")
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

/** Fetch public-facing events (stripped of venue secrets) */
export async function getPublicEvents(): Promise<Partial<Event>[]> {
  const db = await getDb();
  const snap = await db.collection("events").orderBy("date", "asc").get();
  const validStatuses = new Set(["upcoming", "sold_out", "live"]);

  return snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }) as Event)
    .filter((e) => validStatuses.has(e.status))
    .map((e) => ({
      id: e.id,
      title: e.title,
      tagline: e.tagline,
      description: e.description,
      date: e.date,
      time: e.time,
      total_spots: e.total_spots,
      spots_taken: e.spots_taken,
      accent: e.accent,
      accent_dark: e.accent_dark,
      emoji: e.emoji,
      tag: e.tag,
      zones: e.zones,
      dress_code: e.dress_code,
      includes: e.includes,
      venue_reveal_date: e.venue_reveal_date,
      status: e.status,
    }));
}

/** Create a new event (admin) */
export async function createEvent(
  data: Omit<Event, "id">,
): Promise<Event> {
  if (!data.title?.trim()) throw new Error("Title is required");
  if (!data.date) throw new Error("Date is required");

  const db = await getDb();
  const eventData = {
    title: data.title.trim(),
    tagline: data.tagline?.trim() || "",
    description: data.description?.trim() || "",
    date: data.date,
    time: data.time || "",
    total_spots: Number(data.total_spots) || 50,
    spots_taken: 0,
    accent: data.accent || "#D4A574",
    accent_dark: data.accent_dark || "#B8845A",
    emoji: data.emoji || "\u{1F3AF}",
    tag: data.tag?.trim() || "",
    zones: Array.isArray(data.zones) ? data.zones : [],
    dress_code: data.dress_code?.trim() || "",
    includes: Array.isArray(data.includes) ? data.includes : [],
    venue_name: data.venue_name?.trim() || "",
    venue_area: data.venue_area?.trim() || "",
    venue_address: data.venue_address?.trim() || "",
    venue_reveal_date: data.venue_reveal_date || "",
    pickup_points: Array.isArray(data.pickup_points)
      ? data.pickup_points.map((p) => ({
          name: p.name || "",
          time: p.time || "",
          capacity: Number(p.capacity) || 0,
        }))
      : [],
    status: data.status || "draft",
  };

  const ref = await db.collection("events").add(eventData);
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

  // Strip fields that shouldn't be overwritten from the form
  const { spots_taken, ...safeData } = data as Record<string, unknown>;

  // Sanitize pickup_points capacity if present
  if (Array.isArray(safeData.pickup_points)) {
    safeData.pickup_points = (safeData.pickup_points as Array<{ name: string; time: string; capacity: number }>).map((p) => ({
      name: p.name || "",
      time: p.time || "",
      capacity: Number(p.capacity) || 0,
    }));
  }

  await ref.update(safeData);
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
