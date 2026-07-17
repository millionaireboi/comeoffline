import type { Event } from "@comeoffline/types";
import { eventSeriesKey } from "@comeoffline/types";

/**
 * Repeatable-IP series grouping — the app-side mirror of the landing feed's
 * behavior. Editions share a series via the EVENT_SERIES registry ("friends
 * house" anywhere in the title) or, failing that, an exact title match — so
 * any event duplicated onto a new date groups into one card automatically.
 */
function seriesKeyFor(title: string | undefined): string {
  const registry = eventSeriesKey(title);
  if (registry) return registry;
  return `title:${(title || "").trim().toLowerCase().replace(/\s+/g, " ")}`;
}

/** All editions of `event`'s series (event included), feed order. Empty when
 *  it's the only edition. */
export function seriesSiblings(event: Event, all: Event[]): Event[] {
  const key = seriesKeyFor(event.title);
  const siblings = all.filter((e) => seriesKeyFor(e.title) === key);
  return siblings.length >= 2 ? siblings : [];
}

export interface SeriesGroup {
  /** Representative edition shown on the card — earliest still-open date */
  event: Event;
  /** Every edition in the series (representative included), feed order */
  siblings: Event[];
}

function isOpen(e: Event): boolean {
  if (e.status === "sold_out") return false;
  return (e.total_spots ?? 0) - (e.spots_taken ?? 0) > 0;
}

/** Collapse the feed (date-ascending) to one card per series. */
export function groupSeries(events: Event[]): SeriesGroup[] {
  const groups = new Map<string, Event[]>();
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
