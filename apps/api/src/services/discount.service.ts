import { getDb } from "../config/firebase-admin";
import type { DiscountCode, DiscountValidation, DiscountType } from "@comeoffline/types";
import type { DocumentSnapshot } from "firebase-admin/firestore";

/**
 * Discount codes live in the `discount_codes` collection, doc ID = the
 * normalized (uppercase) code. That makes lookup a single doc read and
 * enforces uniqueness for free. Redemptions are counted on the `uses`
 * field — incremented inside the createTicket transaction (so a code can
 * never oversell its max_uses under concurrency) and refunded when a
 * pending_payment ticket dies without being paid.
 */

export function normalizeDiscountCode(code: string): string {
  return code.trim().toUpperCase();
}

/** Rupees off for a discount applied to a subtotal. Always an integer, never exceeds the subtotal. */
export function computeDiscountAmount(
  discount: { type: DiscountType; value: number },
  subtotal: number,
): number {
  if (subtotal <= 0) return 0;
  const raw = discount.type === "percent" ? (subtotal * discount.value) / 100 : discount.value;
  return Math.min(subtotal, Math.max(0, Math.round(raw)));
}

/**
 * Validate a discount doc (already read — plain or transactional) against an
 * event and subtotal. Shared by the checkout preview endpoint and the
 * authoritative check inside the createTicket transaction.
 *
 * usesAdjustment offsets the stored `uses` for redemptions being released in
 * the same transaction (e.g. the buyer's own expired pending ticket).
 */
export function evaluateDiscountSnapshot(
  snap: DocumentSnapshot,
  eventId: string,
  subtotal: number,
  usesAdjustment = 0,
): DiscountValidation {
  if (!snap.exists) {
    return { valid: false, error: "Invalid code" };
  }
  const d = snap.data() as DiscountCode;
  if (!d.active) {
    return { valid: false, error: "This code is no longer active" };
  }
  if (d.event_id && d.event_id !== eventId) {
    return { valid: false, error: "This code is for a different event" };
  }
  if (d.expires_at && new Date(d.expires_at) < new Date()) {
    return { valid: false, error: "This code has expired" };
  }
  if (d.max_uses != null && d.uses + usesAdjustment >= d.max_uses) {
    return { valid: false, error: "This code has been fully redeemed" };
  }
  return {
    valid: true,
    code: d.code,
    type: d.type,
    value: d.value,
    discount_amount: computeDiscountAmount(d, subtotal),
  };
}

/** Non-transactional validation — used by checkout to preview a code before purchase */
export async function validateDiscountCode(
  code: string,
  eventId: string,
  subtotal: number,
): Promise<DiscountValidation> {
  const normalized = normalizeDiscountCode(code);
  if (!normalized) return { valid: false, error: "Invalid code" };
  const db = await getDb();
  const snap = await db.collection("discount_codes").doc(normalized).get();
  return evaluateDiscountSnapshot(snap, eventId, subtotal);
}

/* ── Admin CRUD ───────────────────────────────────── */

export async function listDiscountCodes(): Promise<DiscountCode[]> {
  const db = await getDb();
  const snap = await db.collection("discount_codes").orderBy("created_at", "desc").get();
  return snap.docs.map((d) => d.data() as DiscountCode);
}

export async function createDiscountCode(input: {
  code: string;
  type: DiscountType;
  value: number;
  event_id?: string | null;
  event_title?: string | null;
  max_uses?: number | null;
  expires_at?: string | null;
  created_by?: string;
}): Promise<{ success: boolean; data?: DiscountCode; error?: string }> {
  const code = normalizeDiscountCode(input.code);
  if (!/^[A-Z0-9_-]{3,32}$/.test(code)) {
    return { success: false, error: "Code must be 3-32 characters (letters, numbers, - or _)" };
  }
  if (input.type === "percent" && (input.value < 1 || input.value > 100)) {
    return { success: false, error: "Percent must be between 1 and 100" };
  }
  if (input.type === "flat" && input.value < 1) {
    return { success: false, error: "Flat discount must be at least ₹1" };
  }

  const db = await getDb();
  const ref = db.collection("discount_codes").doc(code);
  const existing = await ref.get();
  if (existing.exists) {
    return { success: false, error: "A code with this name already exists" };
  }

  const data: DiscountCode = {
    code,
    type: input.type,
    value: Math.round(input.value),
    event_id: input.event_id || null,
    event_title: input.event_title || null,
    max_uses: input.max_uses ?? null,
    uses: 0,
    active: true,
    expires_at: input.expires_at || null,
    created_at: new Date().toISOString(),
    created_by: input.created_by,
  };
  await ref.set(data);
  return { success: true, data };
}

export async function updateDiscountCode(
  code: string,
  updates: Partial<Pick<DiscountCode, "active" | "max_uses" | "expires_at">>,
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  const ref = db.collection("discount_codes").doc(normalizeDiscountCode(code));
  const snap = await ref.get();
  if (!snap.exists) return { success: false, error: "Code not found" };

  const allowed: Record<string, unknown> = {};
  if (typeof updates.active === "boolean") allowed.active = updates.active;
  if (updates.max_uses !== undefined) allowed.max_uses = updates.max_uses;
  if (updates.expires_at !== undefined) allowed.expires_at = updates.expires_at;
  if (Object.keys(allowed).length === 0) return { success: false, error: "Nothing to update" };

  await ref.update(allowed);
  return { success: true };
}

export async function deleteDiscountCode(code: string): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  const ref = db.collection("discount_codes").doc(normalizeDiscountCode(code));
  const snap = await ref.get();
  if (!snap.exists) return { success: false, error: "Code not found" };
  await ref.delete();
  return { success: true };
}
