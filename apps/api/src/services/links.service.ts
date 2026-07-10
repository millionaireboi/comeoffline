import { getDb } from "../config/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import type { TrackableLink } from "@comeoffline/types";
import { posthog } from "../config/posthog";

/**
 * Trackable short links live in the `short_links` collection, doc ID = the
 * normalized (lowercase) code — single doc read on the hot redirect path and
 * uniqueness for free, same shape as discount codes. Hits are counted with
 * FieldValue.increment so concurrent scans never lose a count, and bucketed
 * per IST day for the admin's recent-activity view.
 */

export function normalizeLinkCode(code: string): string {
  return code.trim().toLowerCase();
}

/** Today's date key in IST — posters are scanned in Bangalore, so day buckets
 *  should roll over at Indian midnight, not UTC. */
function istDayKey(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

/* ── Redirect hot path ────────────────────────────── */

export interface LinkHitResult {
  destination: string | null; // null = unknown/paused code, caller falls back
}

/**
 * Resolve a code and count the scan in one call. Unknown or paused codes
 * return null destination and count nothing — a reprinted/retired poster
 * just sends people to the fallback instead of erroring.
 */
export async function recordLinkHit(
  code: string,
  meta: { user_agent?: string; referer?: string },
): Promise<LinkHitResult> {
  const normalized = normalizeLinkCode(code);
  if (!/^[a-z0-9_-]{2,32}$/.test(normalized)) return { destination: null };

  const db = await getDb();
  const ref = db.collection("short_links").doc(normalized);
  const snap = await ref.get();
  if (!snap.exists) return { destination: null };

  const link = snap.data() as TrackableLink;
  if (!link.active) return { destination: null };

  // Count first, then return — but never let a counting failure break a scan.
  try {
    await ref.update({
      hits: FieldValue.increment(1),
      [`hits_by_day.${istDayKey()}`]: FieldValue.increment(1),
      last_hit_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error(`[links] hit count failed for ${normalized}:`, err);
  }

  // Server-side capture so scans show up in PostHog even when the destination
  // page's client-side tracking is blocked. distinctId is the code itself —
  // person stitching happens client-side once /hi fires poster_scanned.
  posthog?.capture({
    distinctId: `short_link:${normalized}`,
    event: "short_link_hit",
    properties: {
      link_code: normalized,
      campaign: link.campaign || null,
      destination: link.destination,
      user_agent: meta.user_agent || null,
      referer: meta.referer || null,
    },
  });

  return { destination: link.destination };
}

/* ── Admin CRUD ───────────────────────────────────── */

export async function listLinks(): Promise<TrackableLink[]> {
  const db = await getDb();
  const snap = await db.collection("short_links").orderBy("created_at", "desc").get();
  return snap.docs.map((d) => d.data() as TrackableLink);
}

export async function createLink(input: {
  code: string;
  destination: string;
  label: string;
  campaign?: string | null;
  created_by?: string;
}): Promise<{ success: boolean; data?: TrackableLink; error?: string }> {
  const code = normalizeLinkCode(input.code);
  if (!/^[a-z0-9_-]{2,32}$/.test(code)) {
    return { success: false, error: "Code must be 2-32 characters (lowercase letters, numbers, - or _)" };
  }
  const destination = input.destination.trim();
  // Relative paths stay on comeoffline.com; absolute URLs allow linking out
  // (e.g. an Instagram profile) while still counting the scan.
  if (!destination.startsWith("/") && !/^https?:\/\//.test(destination)) {
    return { success: false, error: "Destination must be a path (/hi?p=…) or a full https:// URL" };
  }
  if (!input.label.trim()) {
    return { success: false, error: "Label is required — future you needs to know where this poster went" };
  }

  const db = await getDb();
  const ref = db.collection("short_links").doc(code);
  const existing = await ref.get();
  if (existing.exists) {
    return { success: false, error: "A link with this code already exists" };
  }

  const data: TrackableLink = {
    code,
    destination,
    label: input.label.trim(),
    campaign: input.campaign?.trim() || null,
    hits: 0,
    hits_by_day: {},
    last_hit_at: null,
    active: true,
    created_at: new Date().toISOString(),
    created_by: input.created_by,
  };
  await ref.set(data);
  return { success: true, data };
}

export async function updateLink(
  code: string,
  updates: { active?: boolean; destination?: string; label?: string; campaign?: string | null },
): Promise<{ success: boolean; error?: string }> {
  const normalized = normalizeLinkCode(code);
  const db = await getDb();
  const ref = db.collection("short_links").doc(normalized);
  const snap = await ref.get();
  if (!snap.exists) return { success: false, error: "Link not found" };

  const patch: Record<string, unknown> = {};
  if (updates.active !== undefined) patch.active = updates.active;
  if (updates.label !== undefined) {
    if (!updates.label.trim()) return { success: false, error: "Label cannot be empty" };
    patch.label = updates.label.trim();
  }
  if (updates.campaign !== undefined) patch.campaign = updates.campaign?.trim() || null;
  if (updates.destination !== undefined) {
    const destination = updates.destination.trim();
    if (!destination.startsWith("/") && !/^https?:\/\//.test(destination)) {
      return { success: false, error: "Destination must be a path (/hi?p=…) or a full https:// URL" };
    }
    patch.destination = destination;
  }
  if (Object.keys(patch).length === 0) return { success: false, error: "Nothing to update" };

  await ref.update(patch);
  return { success: true };
}

export async function deleteLink(code: string): Promise<{ success: boolean; error?: string }> {
  const normalized = normalizeLinkCode(code);
  const db = await getDb();
  const ref = db.collection("short_links").doc(normalized);
  const snap = await ref.get();
  if (!snap.exists) return { success: false, error: "Link not found" };
  await ref.delete();
  return { success: true };
}
