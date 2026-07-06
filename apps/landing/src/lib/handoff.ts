import { APP_URL } from "@/components/shared/P";

export interface HandoffOptions {
  /** Auth handoff token — omitted for open entry, where the visitor signs in/up in the app */
  token?: string;
  /** Event the user was looking at — the app opens this event's detail on arrival */
  eventId?: string;
  /** Tier preselected on landing — the app skips re-picking it */
  tierId?: string | null;
  /** Entry surface, e.g. "landing" — used by app-side analytics */
  source?: string;
  /** utm_* params to forward so app-side attribution doesn't depend on PostHog stitching alone */
  utm?: Record<string, string | undefined>;
}

/**
 * Single builder for every landing → app redirect.
 *
 * Every conversion path (hero code, detail prefilled code, detail manual code,
 * detail sign-in) MUST go through this so params never drift again — a manual
 * code entry losing ?event=&tier= means the ad-clicker lands on the app home
 * feed instead of the event they were sold.
 */
export function buildAppHandoffUrl({ token, eventId, tierId, source = "landing", utm }: HandoffOptions): string {
  const url = new URL(APP_URL);
  if (token) url.searchParams.set("token", token);
  if (eventId) url.searchParams.set("event", eventId);
  if (tierId) url.searchParams.set("tier", tierId);
  url.searchParams.set("source", source);
  if (utm) {
    for (const [key, value] of Object.entries(utm)) {
      if (value) url.searchParams.set(key, value);
    }
  }
  return url.toString();
}
