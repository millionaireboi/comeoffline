import type { TicketTier } from "@comeoffline/types";

/**
 * Tier availability that works for BOTH event payload shapes:
 * - authed /api/events carries raw `sold` + `capacity` counts
 * - public /api/events/public strips the counts and sends a `sold_out` flag
 * The old `t.sold < t.capacity` checks silently failed on public tiers
 * (undefined < undefined === false), which killed the Buy CTA for logged-out
 * visitors — no tier ever counted as available.
 */
export type PublicishTier = TicketTier & { sold_out?: boolean; low_stock?: boolean };

export function tierSoldOut(t: PublicishTier): boolean {
  if (typeof t.sold_out === "boolean") return t.sold_out;
  if (typeof t.capacity !== "number") return false;
  return (t.sold ?? 0) >= t.capacity;
}

export function tierAvailable(t: PublicishTier): boolean {
  return !tierSoldOut(t);
}

/** Raw seats remaining, or null when the payload doesn't expose counts. */
export function tierRemaining(t: PublicishTier): number | null {
  if (typeof t.capacity !== "number" || typeof t.sold !== "number") return null;
  return Math.max(0, t.capacity - t.sold);
}
