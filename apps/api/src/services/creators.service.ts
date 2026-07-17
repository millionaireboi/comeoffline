import { getDb } from "../config/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Creator affiliate program — the `creators` collection, doc ID = handle
 * (lowercase, same uniqueness trick as short_links / discount_codes).
 *
 * Commission rules (locked with founder, Jul 2026):
 *  - flat rate_per_ticket × confirmed seats (quantity), refunds/cancels
 *    never count — earnings recompute from live tickets, so a late refund
 *    self-corrects instead of needing clawback logic
 *  - a sale attributes by ticket.attribution.utm_campaign == handle (link)
 *    OR ticket.discount_code == creator's code, deduped per ticket; code
 *    sales pay FULL commission
 *  - activation_sales is a lifetime threshold; crossing it pays
 *    RETROACTIVELY from sale #1
 *  - payouts are MANUAL (UPI) — `payouts` is a ledger the admin appends to;
 *    owed = earned − paid. This service never moves money.
 */

const COUNTED_STATUSES = new Set(["confirmed", "checked_in", "partially_checked_in"]);

export interface CreatorPayout {
  amount: number;
  date: string; // ISO date the payment was made
  note?: string;
  recorded_at: string;
}

/** Landing-page config (phase C) — everything /with/<handle> needs beyond
 *  the shared template defaults. All optional; landing falls back per-field. */
export interface CreatorPage {
  photo_url?: string;
  photo_caption?: string;
  hero_line?: string;
  headline?: string;
  turn?: string[];
  turn_sign?: string;
  rooms?: { title_match: string; tie: string }[];
  seal?: string;
  proof_lines?: { quote: string; by: string }[];
  objection_q?: string;
  objection_a?: string[];
  friction?: string;
  close_lede?: string;
  close?: string;
  whatsapp_prefill?: string;
}

export interface Creator {
  handle: string;
  name: string;
  active: boolean;
  rate_per_ticket: number;
  activation_sales: number;
  discount_code: string | null;
  /** Firebase uid of the creator's member account — unlocks their
   *  creator-studio view in the app. Set by admin. */
  user_uid: string | null;
  payouts: CreatorPayout[];
  page: CreatorPage;
  created_at: string;
  created_by?: string;
}

export interface CreatorEarnings {
  lifetime_seats: number;
  month_seats: number; // current IST month
  activated: boolean;
  earned: number;
  paid: number;
  owed: number;
  seats_by_month: Record<string, number>; // "2026-07" → seats
  /** Anonymized, newest first — safe to show the creator. NO buyer PII. */
  recent_sales: { date: string; event_title: string; seats: number; via: "link" | "code" }[];
}

export function normalizeHandle(handle: string): string {
  return handle.trim().toLowerCase();
}

function istMonthKey(iso: string): string {
  // "2026-07" in IST — sales and payouts roll over at Indian midnight
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit" }).format(
    new Date(iso)
  );
}

/* ── Earnings ─────────────────────────────────────── */

/**
 * Compute a creator's earnings from live tickets. Two equality queries
 * (auto-indexed single fields), merged and deduped by ticket id; status is
 * filtered in code so no composite index is needed.
 */
export async function computeEarnings(creator: Creator): Promise<CreatorEarnings> {
  const db = await getDb();

  const [byLink, byCode] = await Promise.all([
    db.collection("tickets").where("attribution.utm_campaign", "==", creator.handle).get(),
    creator.discount_code
      ? db.collection("tickets").where("discount_code", "==", creator.discount_code).get()
      : Promise.resolve(null),
  ]);

  const tickets = new Map<string, { data: FirebaseFirestore.DocumentData; via: "link" | "code" }>();
  for (const doc of byLink.docs) tickets.set(doc.id, { data: doc.data(), via: "link" });
  if (byCode) {
    for (const doc of byCode.docs) {
      // A ticket matching both counts ONCE; code label wins (they typed it)
      tickets.set(doc.id, { data: doc.data(), via: "code" });
    }
  }

  const counted = [...tickets.values()].filter((t) => COUNTED_STATUSES.has(t.data.status));

  const seatsByMonth: Record<string, number> = {};
  let lifetimeSeats = 0;
  const eventIds = new Set<string>();
  for (const t of counted) {
    const seats = typeof t.data.quantity === "number" && t.data.quantity > 0 ? t.data.quantity : 1;
    lifetimeSeats += seats;
    const month = t.data.purchased_at ? istMonthKey(t.data.purchased_at) : "unknown";
    seatsByMonth[month] = (seatsByMonth[month] ?? 0) + seats;
    if (t.data.event_id) eventIds.add(t.data.event_id);
  }

  // Titles for the anonymized feed — one batched read, small volume
  const titles = new Map<string, string>();
  if (eventIds.size > 0) {
    const refs = [...eventIds].map((id) => db.collection("events").doc(id));
    const snaps = await db.getAll(...refs);
    for (const snap of snaps) titles.set(snap.id, (snap.data()?.title as string) ?? "an event");
  }

  const recentSales = counted
    .sort((a, b) => (b.data.purchased_at ?? "").localeCompare(a.data.purchased_at ?? ""))
    .slice(0, 25)
    .map((t) => ({
      date: (t.data.purchased_at ?? "").slice(0, 10),
      event_title: titles.get(t.data.event_id) ?? "an event",
      seats: typeof t.data.quantity === "number" && t.data.quantity > 0 ? t.data.quantity : 1,
      via: t.via,
    }));

  const activated = lifetimeSeats >= creator.activation_sales;
  // Retroactive: crossing the threshold pays from sale #1
  const earned = activated ? lifetimeSeats * creator.rate_per_ticket : 0;
  const paid = (creator.payouts ?? []).reduce((sum, p) => sum + (p.amount || 0), 0);

  return {
    lifetime_seats: lifetimeSeats,
    month_seats: seatsByMonth[istMonthKey(new Date().toISOString())] ?? 0,
    activated,
    earned,
    paid,
    owed: Math.max(0, earned - paid),
    seats_by_month: seatsByMonth,
    recent_sales: recentSales,
  };
}

/* ── Admin CRUD ───────────────────────────────────── */

export async function listCreators(): Promise<(Creator & { earnings: CreatorEarnings })[]> {
  const db = await getDb();
  const snap = await db.collection("creators").get();
  const creators = snap.docs.map((d) => d.data() as Creator);
  return Promise.all(creators.map(async (c) => ({ ...c, earnings: await computeEarnings(c) })));
}

export async function getCreatorByHandle(handle: string): Promise<Creator | null> {
  const db = await getDb();
  const snap = await db.collection("creators").doc(normalizeHandle(handle)).get();
  return snap.exists ? (snap.data() as Creator) : null;
}

export async function getCreatorByUid(uid: string): Promise<Creator | null> {
  const db = await getDb();
  const snap = await db.collection("creators").where("user_uid", "==", uid).limit(1).get();
  return snap.empty ? null : (snap.docs[0].data() as Creator);
}

type CreateResult = { success: true; data: Creator } | { success: false; error: string };

export async function createCreator(input: {
  handle: string;
  name: string;
  rate_per_ticket: number;
  activation_sales?: number;
  discount_code?: string | null;
  user_uid?: string | null;
  page?: CreatorPage;
  created_by?: string;
}): Promise<CreateResult> {
  const handle = normalizeHandle(input.handle);
  if (!/^[a-z0-9_-]{2,32}$/.test(handle)) {
    return { success: false, error: "handle must be 2-32 chars: a-z, 0-9, - or _" };
  }
  if (!(input.rate_per_ticket >= 0)) {
    return { success: false, error: "rate_per_ticket must be a number ≥ 0" };
  }

  const db = await getDb();
  const ref = db.collection("creators").doc(handle);
  if ((await ref.get()).exists) {
    return { success: false, error: `creator "${handle}" already exists` };
  }

  const creator: Creator = {
    handle,
    name: input.name || handle,
    active: true,
    rate_per_ticket: input.rate_per_ticket,
    activation_sales: input.activation_sales ?? 10,
    discount_code: input.discount_code ? input.discount_code.trim().toUpperCase() : handle.toUpperCase(),
    user_uid: input.user_uid ?? null,
    payouts: [],
    page: input.page ?? {},
    created_at: new Date().toISOString(),
    created_by: input.created_by,
  };
  await ref.set(creator);
  return { success: true, data: creator };
}

export async function updateCreator(
  handle: string,
  updates: Partial<Pick<Creator, "name" | "active" | "rate_per_ticket" | "activation_sales" | "discount_code" | "user_uid" | "page">>
): Promise<CreateResult> {
  const db = await getDb();
  const ref = db.collection("creators").doc(normalizeHandle(handle));
  const snap = await ref.get();
  if (!snap.exists) return { success: false, error: "creator not found" };

  const clean: Record<string, unknown> = {};
  if (typeof updates.name === "string") clean.name = updates.name;
  if (typeof updates.active === "boolean") clean.active = updates.active;
  if (typeof updates.rate_per_ticket === "number" && updates.rate_per_ticket >= 0)
    clean.rate_per_ticket = updates.rate_per_ticket;
  if (typeof updates.activation_sales === "number" && updates.activation_sales >= 0)
    clean.activation_sales = updates.activation_sales;
  if (updates.discount_code !== undefined)
    clean.discount_code = updates.discount_code ? String(updates.discount_code).trim().toUpperCase() : null;
  if (updates.user_uid !== undefined) clean.user_uid = updates.user_uid || null;
  if (updates.page && typeof updates.page === "object") clean.page = updates.page;

  await ref.update(clean);
  return { success: true, data: (await ref.get()).data() as Creator };
}

/** Append a manual payout to the ledger — records money already sent by UPI. */
export async function recordPayout(
  handle: string,
  payout: { amount: number; date?: string; note?: string }
): Promise<CreateResult> {
  if (!(payout.amount > 0)) return { success: false, error: "amount must be > 0" };
  const db = await getDb();
  const ref = db.collection("creators").doc(normalizeHandle(handle));
  const snap = await ref.get();
  if (!snap.exists) return { success: false, error: "creator not found" };

  const entry: CreatorPayout = {
    amount: payout.amount,
    date: payout.date || new Date().toISOString().slice(0, 10),
    note: payout.note || "",
    recorded_at: new Date().toISOString(),
  };
  await ref.update({ payouts: FieldValue.arrayUnion(entry) });
  return { success: true, data: (await ref.get()).data() as Creator };
}

export async function deleteCreator(handle: string): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  const ref = db.collection("creators").doc(normalizeHandle(handle));
  if (!(await ref.get()).exists) return { success: false, error: "creator not found" };
  await ref.delete();
  return { success: true };
}

/* ── Public (landing) ─────────────────────────────── */

/** Sanitized page config for /with/<handle> — page fields + identity only.
 *  NEVER include rates, payouts, uid, or earnings here. */
export async function getPublicCreatorPage(
  handle: string
): Promise<{ handle: string; name: string; discount_code: string | null; page: CreatorPage } | null> {
  const creator = await getCreatorByHandle(handle);
  if (!creator || !creator.active) return null;
  return {
    handle: creator.handle,
    name: creator.name,
    discount_code: creator.discount_code,
    page: creator.page ?? {},
  };
}
