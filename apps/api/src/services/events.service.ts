import { getDb } from "../config/firebase-admin";
import type { Event, PastPhoto } from "@comeoffline/types";

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

/** Previous-edition trust-gallery photos — keep only valid http(s) URLs */
function sanitizePastPhotos(raw: unknown): PastPhoto[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((p) => ({
      url: sanitizeUrl((p as PastPhoto)?.url),
      caption: String((p as PastPhoto)?.caption ?? "").trim(),
    }))
    .filter((p) => p.url)
    .map((p) => ({ url: p.url, ...(p.caption ? { caption: p.caption } : {}) }));
}

/** Fetch all upcoming/live events for the user feed */
/**
 * True once an event's date is more than a day behind us. Status alone can't
 * gate the feed — a forgotten "listed" event would otherwise sit on the
 * homepage forever with paid traffic landing on it. 1-day grace keeps the
 * event visible through its own night + the morning after.
 */
function isPastEvent(e: Event): boolean {
  if (!e.date) return false;
  const d = new Date(`${e.date}T00:00:00`);
  if (isNaN(d.getTime())) return false;
  const cutoff = new Date(d);
  cutoff.setDate(cutoff.getDate() + 1);
  cutoff.setHours(23, 59, 59, 999);
  return new Date() > cutoff;
}

export async function getEvents(): Promise<Event[]> {
  const db = await getDb();
  // Simple orderBy-only query avoids needing a composite index
  const snap = await db.collection("events").orderBy("date", "asc").get();
  const validStatuses = new Set(["announced", "upcoming", "listed", "sold_out", "live"]);

  return snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }) as Event)
    .filter((e) => validStatuses.has(e.status) && !isPastEvent(e));
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

/** Sanitize ticketing config for public consumption — drops capacity numbers
 *  but exposes tier labels, prices, descriptions, deadlines and a sold-out flag.
 *  Includes a "low_stock" hint instead of raw capacity/sold counts. */
function sanitizeTicketingPublic(t: Event["ticketing"]): {
  enabled: boolean;
  tiers: Array<{
    id: string;
    label: string;
    price: number;
    description?: string;
    deadline?: string;
    opens_at?: string;
    per_person?: number;
    sold_out: boolean;
    low_stock: boolean;
  }>;
  max_per_user?: number;
} | undefined {
  if (!t || !t.enabled) return undefined;
  const now = Date.now();
  const tiers = (t.tiers || [])
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((tier) => {
      const remaining = Math.max(0, (tier.capacity ?? 0) - (tier.sold ?? 0));
      const soldOut = remaining === 0;
      const closed = tier.deadline ? new Date(tier.deadline).getTime() < now : false;
      const notYetOpen = tier.opens_at ? new Date(tier.opens_at).getTime() > now : false;
      // "low_stock" only when meaningfully scarce — avoids fake urgency
      const lowStock = !soldOut && !closed && !notYetOpen && tier.capacity > 0
        ? remaining / tier.capacity <= 0.3 || remaining <= 10
        : false;
      return {
        id: tier.id,
        label: tier.label,
        price: tier.price,
        ...(tier.description && { description: tier.description }),
        ...(tier.deadline && { deadline: tier.deadline }),
        ...(tier.opens_at && { opens_at: tier.opens_at }),
        ...(tier.per_person && tier.per_person > 1 && { per_person: tier.per_person }),
        sold_out: soldOut || closed,
        low_stock: lowStock,
      };
    });
  return {
    enabled: t.enabled,
    tiers,
    ...(t.max_per_user && { max_per_user: t.max_per_user }),
  };
}

/** Fetch public-facing events (stripped of venue secrets) */
export async function getPublicEvents(): Promise<Partial<Event>[]> {
  const db = await getDb();
  const snap = await db.collection("events").orderBy("date", "asc").get();
  const validStatuses = new Set(["announced", "upcoming", "listed", "sold_out", "live"]);

  const now = new Date();
  return snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }) as Event)
    .filter((e) => validStatuses.has(e.status) && !isPastEvent(e))
    .map((e) => {
      const venueRevealed = !!e.venue_reveal_date && new Date(e.venue_reveal_date) <= now;
      const ticketing = sanitizeTicketingPublic(e.ticketing);
      return {
        id: e.id,
        title: e.title,
        tagline: e.tagline,
        description: e.description,
        date: e.date,
        time: e.time,
        // Area is a decision factor, not a secret — only exact venue is gated
        venue_area: e.venue_area,
        total_spots: e.total_spots,
        spots_taken: e.spots_taken,
        accent: e.accent,
        accent_dark: e.accent_dark,
        emoji: e.emoji,
        tag: e.tag,
        zones: e.zones,
        dress_code: e.dress_code,
        includes: e.includes,
        faq: e.faq,
        venue_reveal_date: e.venue_reveal_date,
        status: e.status,
        cover_url: e.cover_url,
        cover_type: e.cover_type,
        cover_focus: e.cover_focus,
        gallery_urls: e.gallery_urls,
        ...(Array.isArray(e.past_photos) && e.past_photos.length > 0 ? { past_photos: e.past_photos } : {}),
        ...(ticketing && { ticketing: ticketing as unknown as Event["ticketing"] }),
        ...(venueRevealed && e.venue_name ? { venue_name: e.venue_name } : {}),
        ...(venueRevealed && Array.isArray(e.venue_photos) && e.venue_photos.length > 0 ? { venue_photos: e.venue_photos } : {}),
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
  const ticketing = sanitizeTicketingPublic(e.ticketing);
  return {
    id: e.id,
    title: e.title,
    tagline: e.tagline,
    description: e.description,
    date: e.date,
    time: e.time,
    venue_area: e.venue_area,
    total_spots: e.total_spots,
    spots_taken: e.spots_taken,
    accent: e.accent,
    accent_dark: e.accent_dark,
    emoji: e.emoji,
    tag: e.tag,
    zones: e.zones,
    dress_code: e.dress_code,
    includes: e.includes,
    faq: e.faq,
    venue_reveal_date: e.venue_reveal_date,
    status: e.status,
    cover_url: e.cover_url,
    cover_type: e.cover_type,
    gallery_urls: e.gallery_urls,
    ...(Array.isArray(e.past_photos) && e.past_photos.length > 0 ? { past_photos: e.past_photos } : {}),
    ...(ticketing && { ticketing: ticketing as unknown as Event["ticketing"] }),
    ...(venueRevealed && e.venue_name ? { venue_name: e.venue_name } : {}),
    ...(venueRevealed && Array.isArray(e.venue_photos) && e.venue_photos.length > 0 ? { venue_photos: e.venue_photos } : {}),
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
    ...(Number(data.min_age) > 0 ? { min_age: Number(data.min_age) } : {}),
    includes: Array.isArray(data.includes) ? data.includes : [],
    faq: Array.isArray(data.faq)
      ? data.faq
          .map((f) => ({ q: String(f.q || "").trim(), a: String(f.a || "").trim() }))
          .filter((f) => f.q && f.a)
      : [],
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
    past_photos: sanitizePastPhotos(data.past_photos),
    // Config blocks — without these, "create as published" and event
    // duplication silently lost tiers/checkout/seating until the next edit
    // (updateEvent always passed them through, which masked the gap).
    ...(data.ticketing ? { ticketing: data.ticketing } : {}),
    ...(data.checkout ? { checkout: data.checkout } : {}),
    ...(data.seating ? { seating: data.seating } : {}),
    ...(data.post_booking ? { post_booking: data.post_booking } : {}),
    ...(typeof data.is_free === "boolean" ? { is_free: data.is_free } : {}),
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

  // Sanitize past photos if present (empty array = admin cleared the gallery)
  if ("past_photos" in safeData) {
    safeData.past_photos = sanitizePastPhotos(safeData.past_photos);
  }

  // Keep the age gate numeric — 0 clears it
  if ("min_age" in safeData) {
    safeData.min_age = Number(safeData.min_age) > 0 ? Number(safeData.min_age) : 0;
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

/** Hard-delete an event (admin) — drafts only, so a booking or waitlist row
 *  can never end up pointing at a missing event. Anything that was ever
 *  public gets cancelled instead. */
export async function deleteDraftEvent(
  eventId: string,
): Promise<"deleted" | "not_found" | "not_draft"> {
  const db = await getDb();
  const ref = db.collection("events").doc(eventId);
  const doc = await ref.get();
  if (!doc.exists) return "not_found";
  if (doc.data()?.status !== "draft") return "not_draft";

  await ref.delete();
  return "deleted";
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
