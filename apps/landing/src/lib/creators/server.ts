import { getCreator, makeCreator, type CreatorPageConfig } from "./index";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

/** Firestore-driven creator page (admin → creators tab → "page"). Field names
 *  are snake_case on the wire (creators.service CreatorPage). */
interface ApiCreatorPage {
  handle: string;
  name: string;
  discount_code: string | null;
  page: {
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
  };
}

/** API page → full config: admin-set fields over the shared template
 *  defaults, so a half-filled Firestore creator still renders complete. */
function creatorFromApi(data: ApiCreatorPage): CreatorPageConfig {
  const p = data.page ?? {};
  const base = makeCreator({ handle: data.handle, name: data.name, discountCode: data.discount_code });
  return makeCreator({
    handle: data.handle,
    name: data.name,
    discountCode: data.discount_code,
    ...(p.photo_url && {
      photo: { src: p.photo_url, alt: `${data.name} at a come offline event`, caption: p.photo_caption || base.photo.caption },
    }),
    ...(p.hero_line && { heroLine: p.hero_line }),
    ...(p.headline && { headline: p.headline }),
    ...(p.turn && p.turn.length > 0 && { turn: p.turn }),
    ...(p.turn_sign && { turnSign: p.turn_sign }),
    ...(p.rooms && p.rooms.length > 0 && { rooms: p.rooms.map((r) => ({ titleMatch: r.title_match, tie: r.tie })) }),
    ...(p.seal && { seal: p.seal }),
    ...(p.proof_lines && p.proof_lines.length > 0 && { proof: { ...base.proof, lines: p.proof_lines } }),
    ...(p.objection_q && { objectionQ: p.objection_q }),
    ...(p.objection_a && p.objection_a.length > 0 && { objectionA: p.objection_a }),
    ...(p.friction && { friction: p.friction }),
    ...(p.close_lede && { closeLede: p.close_lede }),
    ...(p.close && { close: p.close }),
    ...(p.whatsapp_prefill && base.whatsapp && { whatsapp: { ...base.whatsapp, prefill: p.whatsapp_prefill } }),
  });
}

/**
 * Resolve a creator page: Firestore (admin-managed, no deploy) first, code
 * registry as fallback — so onboarding a creator in admin is enough to make
 * /with/<handle> live, while template placeholders keep working locally.
 */
export async function resolveCreator(handle: string): Promise<CreatorPageConfig | null> {
  try {
    const res = await fetch(`${API_URL}/api/creators/public/${encodeURIComponent(handle)}`, {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.data) return creatorFromApi(data.data as ApiCreatorPage);
    }
  } catch {
    // fall through to the code registry
  }
  return getCreator(handle);
}

/** Upcoming events the creator is tied to, earliest first — full public
 *  payloads, so the page renders them with the same FeedEventCard /
 *  FeedEventDetail the events feed already uses (covers, price pills,
 *  scarcity, tiers, past_photos). A bio-link click must never land on an
 *  error page, so every failure degrades to []. */
export async function getCreatorEvents(config: CreatorPageConfig): Promise<any[]> {
  try {
    const res = await fetch(`${API_URL}/api/events/public`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.success || !Array.isArray(data.data)) return [];
    return (data.data as any[])
      .filter((e) => {
        const title = (e.title ?? "").toLowerCase();
        return config.rooms.some((r) => title.includes(r.titleMatch.toLowerCase()));
      })
      .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  } catch {
    return [];
  }
}
