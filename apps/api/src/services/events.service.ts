import { getDb } from "../config/firebase-admin";
import type { Event } from "@comeoffline/types";

/** Only allow http/https URLs; reject javascript:, data:, etc. */
function sanitizeUrl(raw?: string): string {
  const trimmed = raw?.trim();
  if (!trimmed) return "";
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") return trimmed;
  } catch {
    // invalid URL
  }
  return "";
}

/** Fetch all upcoming/live events for the user feed */
export async function getEvents(): Promise<Event[]> {
  const db = await getDb();
  // Simple orderBy-only query avoids needing a composite index
  const snap = await db.collection("events").orderBy("date", "asc").get();
  const validStatuses = new Set(["announced", "upcoming", "listed", "sold_out", "live"]);

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
  const validStatuses = new Set(["announced", "upcoming", "listed", "sold_out", "live"]);

  const now = new Date();
  return snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }) as Event)
    .filter((e) => validStatuses.has(e.status))
    .map((e) => {
      const venueRevealed = !!e.venue_reveal_date && new Date(e.venue_reveal_date) <= now;
      return {
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
        cover_url: e.cover_url,
        cover_type: e.cover_type,
        cover_focus: e.cover_focus,
        gallery_urls: e.gallery_urls,
        ...(venueRevealed && e.venue_name ? { venue_name: e.venue_name } : {}),
      };
    });
}

/** Fetch a single public-facing event by ID (stripped of venue secrets) */
export async function getPublicEvent(eventId: string): Promise<Partial<Event> | null> {
  const db = await getDb();
  const doc = await db.collection("events").doc(eventId).get();
  if (!doc.exists) return null;

  const e = { id: doc.id, ...doc.data() } as Event;
  const validStatuses = new Set(["announced", "upcoming", "listed", "sold_out", "live"]);
  if (!validStatuses.has(e.status)) return null;

  const venueRevealed = !!e.venue_reveal_date && new Date(e.venue_reveal_date) <= new Date();
  return {
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
    cover_url: e.cover_url,
    cover_type: e.cover_type,
    gallery_urls: e.gallery_urls,
    ...(venueRevealed && e.venue_name ? { venue_name: e.venue_name } : {}),
  };
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
    venue_directions_url: sanitizeUrl(data.venue_directions_url),
    venue_reveal_date: data.venue_reveal_date || "",
    pickup_points: Array.isArray(data.pickup_points)
      ? data.pickup_points.map((p) => ({
          name: p.name || "",
          time: p.time || "",
          capacity: Number(p.capacity) || 0,
        }))
      : [],
    status: data.status || "draft",
    ...(data.cover_url ? { cover_url: data.cover_url, cover_type: data.cover_type || "image" } : {}),
    ...(data.cover_url && data.cover_focus ? { cover_focus: data.cover_focus } : {}),
    ...(Array.isArray(data.gallery_urls) && data.gallery_urls.length > 0 ? { gallery_urls: data.gallery_urls } : {}),
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

  // Sanitize directions URL if present
  if (typeof safeData.venue_directions_url === "string") {
    safeData.venue_directions_url = sanitizeUrl(safeData.venue_directions_url);
  }

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
