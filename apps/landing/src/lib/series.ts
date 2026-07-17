import { POSTER_CAMPAIGNS } from "@/lib/posterCampaigns";

/**
 * Repeatable-IP series grouping for public surfaces. Two events are editions
 * of the same thing when:
 *  - a poster campaign declares the series and both titles contain its
 *    `series.titleMatch` (case-insensitive) — "friends house", "Friends
 *    House — vol 2" — or
 *  - their titles match exactly (case/space-insensitive), so any event
 *    duplicated onto a new date groups automatically.
 * Admin "sets" dates by duplicating an edition; nothing here needs a deploy.
 */
export function seriesKeyFor(title: string | undefined): string {
  const t = (title || "").trim().toLowerCase();
  for (const campaign of Object.values(POSTER_CAMPAIGNS)) {
    if (campaign.series && t.includes(campaign.series.titleMatch.toLowerCase())) return campaign.slug;
  }
  return `title:${t.replace(/\s+/g, " ")}`;
}

/** All events in `all` that share a series with `event` (event included),
 *  in the order given. Empty when the event is the only edition — callers
 *  can render nothing in both cases. */
export function seriesSiblings<T extends { id: string; title?: string }>(event: T, all: T[]): T[] {
  const key = seriesKeyFor(event.title);
  const siblings = all.filter((e) => seriesKeyFor(e.title) === key);
  return siblings.length >= 2 ? siblings : [];
}

export interface SeriesGroup<T> {
  /** Representative edition shown on the card — earliest still-open date */
  event: T;
  /** Every edition in the series (representative included), feed order */
  siblings: T[];
}

function isOpen(e: { status?: string; total_spots?: number; spots_taken?: number }): boolean {
  if (e.status === "sold_out") return false;
  return (e.total_spots ?? 0) - (e.spots_taken ?? 0) > 0;
}

/** Collapse a feed (date-ascending) to one card per series. The card shows
 *  the earliest edition with spots left (falling back to the earliest), and
 *  the detail sheet offers the full date list. */
export function groupSeries<
  T extends { id: string; title?: string; status?: string; total_spots?: number; spots_taken?: number },
>(events: T[]): SeriesGroup<T>[] {
  const groups = new Map<string, T[]>();
  const order: string[] = [];
  for (const e of events) {
    const key = seriesKeyFor(e.title);
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key)!.push(e);
  }
  return order.map((key) => {
    const siblings = groups.get(key)!;
    return { event: siblings.find(isOpen) ?? siblings[0], siblings };
  });
}
