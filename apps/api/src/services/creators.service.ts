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
  /** Creator-submitted edits awaiting admin review — nothing a creator types
   *  reaches the public page until publishDraft copies it over. */
  page_draft?: CreatorPage | null;
  page_draft_at?: string | null;
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
  /** Anonymized, newest first — safe to show the creator. NO buyer PII.
   *  `earned` is that sale's commission (seats × the event's resolved rate). */
  recent_sales: { date: string; event_title: string; seats: number; via: "link" | "code"; earned: number }[];
}

/**
 * Event campaign — admin sets a per-event commission + content brief.
 * Keyed by normalized event TITLE (doc id = slugged title) so one campaign
 * covers every date of a series, same matching rule as page rooms. The
 * campaign rate applies to EVERY creator's sale of that event (locked with
 * founder); enrollment is the "i'm making content for this" signal.
 */
export interface CampaignFormat {
  /** e.g. "1 reel (30-60s, you at the event)" */
  label: string;
  /** Optional example to emulate — an IG/YT link the creator can open */
  ref_url: string | null;
}

export interface CreatorCampaign {
  /** Normalized title this campaign matches (lowercase, single spaces) */
  title_match: string;
  commission_per_seat: number;
  /** What we want from creators — the brief, admin-written */
  brief: string;
  /** Content formats expected, each with an optional reference link */
  formats: CampaignFormat[];
  active: boolean;
  enrollments: Record<string, { enrolled_at: string }>; // keyed by handle
  created_at: string;
  updated_at: string;
}

/** Accept both the current {label, ref_url} shape and the legacy plain-string
 *  arrays still stored on early campaign docs. Links must be http(s). */
function normalizeFormats(v: unknown): CampaignFormat[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((f): CampaignFormat | null => {
      if (typeof f === "string") {
        const label = f.trim().slice(0, 120);
        return label ? { label, ref_url: null } : null;
      }
      if (f && typeof f === "object") {
        const o = f as Record<string, unknown>;
        const label = typeof o.label === "string" ? o.label.trim().slice(0, 120) : "";
        const url = typeof o.ref_url === "string" ? o.ref_url.trim().slice(0, 500) : "";
        if (!label) return null;
        return { label, ref_url: /^https?:\/\//i.test(url) ? url : null };
      }
      return null;
    })
    .filter((f): f is CampaignFormat => f !== null)
    .slice(0, 12);
}

export function normalizeTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

function campaignDocId(titleMatch: string): string {
  return normalizeTitle(titleMatch).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
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

/** Active campaign rates keyed by normalized event title — fetched once and
 *  passed into computeEarnings so a creators list doesn't refetch per row. */
export async function getCampaignRates(): Promise<Map<string, number>> {
  const db = await getDb();
  const snap = await db.collection("creator_campaigns").where("active", "==", true).get();
  const rates = new Map<string, number>();
  for (const doc of snap.docs) {
    const c = doc.data() as CreatorCampaign;
    if (c.title_match && typeof c.commission_per_seat === "number") {
      rates.set(c.title_match, c.commission_per_seat);
    }
  }
  return rates;
}

/**
 * Compute a creator's earnings from live tickets. Two equality queries
 * (auto-indexed single fields), merged and deduped by ticket id; status is
 * filtered in code so no composite index is needed. A sale's rate is the
 * event's campaign rate when one is active for its title, else the
 * creator's default rate.
 */
export async function computeEarnings(creator: Creator, campaignRates?: Map<string, number>): Promise<CreatorEarnings> {
  const db = await getDb();
  const rates = campaignRates ?? (await getCampaignRates());

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

  /** Rate for one ticket: event campaign rate (matched by title) or default */
  const rateFor = (eventId: string): number => {
    const title = titles.get(eventId);
    if (title) {
      const campaignRate = rates.get(normalizeTitle(title));
      if (campaignRate !== undefined) return campaignRate;
    }
    return creator.rate_per_ticket;
  };

  const recentSales = counted
    .sort((a, b) => (b.data.purchased_at ?? "").localeCompare(a.data.purchased_at ?? ""))
    .slice(0, 25)
    .map((t) => {
      const seats = typeof t.data.quantity === "number" && t.data.quantity > 0 ? t.data.quantity : 1;
      return {
        date: (t.data.purchased_at ?? "").slice(0, 10),
        event_title: titles.get(t.data.event_id) ?? "an event",
        seats,
        via: t.via,
        earned: seats * rateFor(t.data.event_id),
      };
    });

  const activated = lifetimeSeats >= creator.activation_sales;
  // Retroactive: crossing the threshold pays from sale #1, each sale at its
  // event's resolved rate
  const totalCommission = counted.reduce((sum, t) => {
    const seats = typeof t.data.quantity === "number" && t.data.quantity > 0 ? t.data.quantity : 1;
    return sum + seats * rateFor(t.data.event_id);
  }, 0);
  const earned = activated ? totalCommission : 0;
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
  const [snap, rates] = await Promise.all([db.collection("creators").get(), getCampaignRates()]);
  const creators = snap.docs.map((d) => d.data() as Creator);
  return Promise.all(creators.map(async (c) => ({ ...c, earnings: await computeEarnings(c, rates) })));
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

/* ── Event campaigns ──────────────────────────────── */

/** All campaigns for the admin tab, active or not. */
export async function listCampaigns(): Promise<CreatorCampaign[]> {
  const db = await getDb();
  const snap = await db.collection("creator_campaigns").get();
  return snap.docs.map((d) => {
    const c = d.data() as CreatorCampaign;
    return { ...c, formats: normalizeFormats(c.formats) };
  });
}

/** Create or update the campaign for an event title. */
export async function upsertCampaign(input: {
  title_match: string;
  commission_per_seat: number;
  brief?: string;
  formats?: unknown;
  active?: boolean;
}): Promise<{ success: true; data: CreatorCampaign } | { success: false; error: string }> {
  const titleMatch = normalizeTitle(input.title_match);
  if (!titleMatch) return { success: false, error: "title_match is required" };
  if (!(input.commission_per_seat >= 0)) {
    return { success: false, error: "commission_per_seat must be a number ≥ 0" };
  }
  const db = await getDb();
  const ref = db.collection("creator_campaigns").doc(campaignDocId(titleMatch));
  const snap = await ref.get();
  const now = new Date().toISOString();
  const existing = snap.exists ? (snap.data() as CreatorCampaign) : null;
  const campaign: CreatorCampaign = {
    title_match: titleMatch,
    commission_per_seat: input.commission_per_seat,
    brief: typeof input.brief === "string" ? input.brief.trim().slice(0, 2000) : (existing?.brief ?? ""),
    formats: Array.isArray(input.formats) ? normalizeFormats(input.formats) : normalizeFormats(existing?.formats),
    active: typeof input.active === "boolean" ? input.active : (existing?.active ?? true),
    enrollments: existing?.enrollments ?? {},
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };
  await ref.set(campaign);
  return { success: true, data: campaign };
}

export async function deleteCampaign(titleMatch: string): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  const ref = db.collection("creator_campaigns").doc(campaignDocId(titleMatch));
  if (!(await ref.get()).exists) return { success: false, error: "campaign not found" };
  await ref.delete();
  return { success: true };
}

/** Creator enrolls (or leaves) a campaign — a participation signal only;
 *  the campaign rate applies to their sales either way. */
export async function setEnrollment(
  handle: string,
  titleMatch: string,
  enrolled: boolean
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  const ref = db.collection("creator_campaigns").doc(campaignDocId(titleMatch));
  const snap = await ref.get();
  if (!snap.exists) return { success: false, error: "campaign not found" };
  const key = `enrollments.${normalizeHandle(handle)}`;
  if (enrolled) {
    await ref.update({ [key]: { enrolled_at: new Date().toISOString() } });
  } else {
    await ref.update({ [key]: FieldValue.delete() });
  }
  return { success: true };
}

/** Active campaigns with a live upcoming event, shaped for the studio:
 *  what it pays, the brief, and whether this creator has enrolled. */
export async function listCampaignsForCreator(
  creator: Creator
): Promise<
  {
    title_match: string;
    event_title: string;
    next_date: string | null;
    commission_per_seat: number;
    brief: string;
    formats: CampaignFormat[];
    enrolled: boolean;
  }[]
> {
  const db = await getDb();
  const [campaignSnap, eventSnap] = await Promise.all([
    db.collection("creator_campaigns").where("active", "==", true).get(),
    db.collection("events").get(),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  // Earliest upcoming event per normalized title
  const upcoming = new Map<string, { title: string; date: string | null }>();
  for (const doc of eventSnap.docs) {
    const e = doc.data() as { title?: string; date?: string; status?: string };
    if (!e.title) continue;
    if (e.status && ["draft", "cancelled", "completed"].includes(e.status)) continue;
    if (e.date && e.date < today) continue;
    const norm = normalizeTitle(e.title);
    const prev = upcoming.get(norm);
    if (!prev || (e.date && prev.date && e.date < prev.date)) {
      upcoming.set(norm, { title: e.title, date: e.date ?? null });
    }
  }
  return campaignSnap.docs
    .map((d) => d.data() as CreatorCampaign)
    .filter((c) => upcoming.has(c.title_match))
    .map((c) => ({
      title_match: c.title_match,
      event_title: upcoming.get(c.title_match)!.title,
      next_date: upcoming.get(c.title_match)!.date,
      commission_per_seat: c.commission_per_seat,
      brief: c.brief,
      formats: normalizeFormats(c.formats),
      enrolled: !!c.enrollments?.[creator.handle],
    }))
    .sort((a, b) => (a.next_date ?? "9999").localeCompare(b.next_date ?? "9999"));
}

/* ── Creator self-serve drafts ────────────────────── */

/** Escape everything, then re-allow the one tag the page renders. Creator
 *  input lands in dangerouslySetInnerHTML on the landing page, so this is
 *  load-bearing — never store creator text unsanitized. */
function cleanText(v: unknown, max = 400): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim().slice(0, max);
  if (!t) return undefined;
  return t
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/&lt;em&gt;/g, "<em>")
    .replace(/&lt;\/em&gt;/g, "</em>");
}

function cleanLines(v: unknown, maxLines: number): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const lines = v.map((l) => cleanText(l)).filter((l): l is string => !!l);
  return lines.length > 0 ? lines.slice(0, maxLines) : undefined;
}

/** Whitelist + sanitize a creator-submitted page. photo_url is only accepted
 *  from our own storage bucket (the upload endpoint sets it) — never an
 *  arbitrary external url. */
export function sanitizeDraft(input: Record<string, unknown>, photoUrl?: string): CreatorPage {
  const rooms = Array.isArray(input.rooms)
    ? (input.rooms as Record<string, unknown>[])
        .map((r) => ({ title_match: cleanText(r?.title_match, 80) ?? "", tie: cleanText(r?.tie, 120) ?? "" }))
        .filter((r) => r.title_match && r.tie)
        .slice(0, 12)
    : undefined;
  return {
    ...(photoUrl && { photo_url: photoUrl }),
    ...(cleanText(input.photo_caption, 120) && { photo_caption: cleanText(input.photo_caption, 120) }),
    ...(cleanText(input.hero_line, 120) && { hero_line: cleanText(input.hero_line, 120) }),
    ...(cleanLines(input.turn, 8) && { turn: cleanLines(input.turn, 8) }),
    ...(rooms && rooms.length > 0 && { rooms }),
  };
}

export async function saveDraft(handle: string, draft: CreatorPage): Promise<void> {
  const db = await getDb();
  await db.collection("creators").doc(normalizeHandle(handle)).update({
    page_draft: draft,
    page_draft_at: new Date().toISOString(),
  });
}

/** Admin approves: draft becomes the live page. Draft photo/caption merge
 *  over the existing page so admin-set fields the creator can't edit stay. */
export async function publishDraft(handle: string): Promise<CreateResult> {
  const db = await getDb();
  const ref = db.collection("creators").doc(normalizeHandle(handle));
  const snap = await ref.get();
  if (!snap.exists) return { success: false, error: "creator not found" };
  const creator = snap.data() as Creator;
  if (!creator.page_draft) return { success: false, error: "no draft to publish" };
  await ref.update({
    page: { ...creator.page, ...creator.page_draft },
    page_draft: null,
    page_draft_at: null,
  });
  return { success: true, data: (await ref.get()).data() as Creator };
}

export async function discardDraft(handle: string): Promise<CreateResult> {
  const db = await getDb();
  const ref = db.collection("creators").doc(normalizeHandle(handle));
  const snap = await ref.get();
  if (!snap.exists) return { success: false, error: "creator not found" };
  await ref.update({ page_draft: null, page_draft_at: null });
  return { success: true, data: (await ref.get()).data() as Creator };
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
