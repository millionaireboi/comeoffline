import { getDb } from "../config/firebase-admin";
import type { Firestore } from "firebase-admin/firestore";
import type { VouchCode } from "@comeoffline/types";
import crypto from "crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No I/O/0/1

function generateCode(length = 6): string {
  const bytes = crypto.randomBytes(length);
  let code = "";
  for (let i = 0; i < length; i++) {
    code += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return code;
}

/** Generate a unique code that doesn't exist in the DB */
async function generateUniqueCode(db: Firestore): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = `OFF-${generateCode()}`;
    const existing = await db
      .collection("vouch_codes")
      .where("code", "==", code)
      .limit(1)
      .get();
    if (existing.empty) return code;
  }
  // Fallback: use longer code to avoid collision
  return `OFF-${generateCode(8)}`;
}

/** Get vouch codes owned by a user */
export async function getUserVouchCodes(userId: string): Promise<VouchCode[]> {
  const db = await getDb();
  const snap = await db
    .collection("vouch_codes")
    .where("owner_id", "==", userId)
    .orderBy("created_at", "desc")
    .get();

  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as VouchCode);
}

/** Generate vouch codes for a user after attending an event */
export async function generateVouchCodes(
  userId: string,
  eventId: string,
  count: number,
): Promise<VouchCode[]> {
  const db = await getDb();
  const batch = db.batch();
  const codes: VouchCode[] = [];

  for (let i = 0; i < count; i++) {
    const ref = db.collection("vouch_codes").doc();
    const code = await generateUniqueCode(db);
    const data = {
      code,
      owner_id: userId,
      status: "unused" as const,
      earned_from_event: eventId,
      created_at: new Date().toISOString(),
    };

    batch.set(ref, data);
    codes.push({ id: ref.id, ...data });
  }

  await batch.commit();
  return codes;
}

/** Admin: manually generate codes for a user */
export async function adminGenerateVouchCodes(
  userId: string,
  eventId: string,
  count: number,
): Promise<VouchCode[]> {
  return generateVouchCodes(userId, eventId, count);
}

/** Admin: create seed invite codes for bootstrapping the community */
export async function createSeedCodes(
  adminId: string,
  count: number,
  label?: string,
): Promise<VouchCode[]> {
  const db = await getDb();
  const batch = db.batch();
  const codes: VouchCode[] = [];

  for (let i = 0; i < count; i++) {
    const ref = db.collection("vouch_codes").doc();
    const code = await generateUniqueCode(db);
    const data = {
      code,
      owner_id: "admin",
      status: "unused" as const,
      created_by_admin: adminId,
      created_at: new Date().toISOString(),
      ...(label && { label }),
    };

    batch.set(ref, data);
    codes.push({ id: ref.id, ...data });
  }

  await batch.commit();
  return codes;
}

// In-memory cache for seed codes (expires after 2 minutes)
let seedCodesCache: { data: VouchCode[]; timestamp: number } | null = null;
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

/** Get all admin-created seed codes with usage tracking */
export async function getSeedCodes(): Promise<VouchCode[]> {
  // Return cached data if available and fresh
  if (seedCodesCache && Date.now() - seedCodesCache.timestamp < CACHE_TTL) {
    return seedCodesCache.data;
  }

  try {
    const db = await getDb();
    const snap = await db
      .collection("vouch_codes")
      .where("owner_id", "==", "admin")
      .orderBy("created_at", "desc")
      .get();

    const codes = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as VouchCode);

    // Update cache
    seedCodesCache = { data: codes, timestamp: Date.now() };

    return codes;
  } catch (error: unknown) {
    const err = error as { code?: number; message?: string };

    // Handle quota exhaustion gracefully
    if (err.code === 8 || (err.message && err.message.includes('RESOURCE_EXHAUSTED'))) {
      // If we have cached data, return it even if stale
      if (seedCodesCache) {
        console.warn('[vouch.service] Quota exceeded, returning stale cache');
        return seedCodesCache.data;
      }
      // Otherwise, return empty array to prevent crash
      throw new Error('Firestore quota exceeded. Please try again later.');
    }

    throw error;
  }
}

/** Check if user already has codes for an event */
export async function hasCodesForEvent(
  userId: string,
  eventId: string,
): Promise<boolean> {
  const db = await getDb();
  const snap = await db
    .collection("vouch_codes")
    .where("owner_id", "==", userId)
    .where("earned_from_event", "==", eventId)
    .limit(1)
    .get();

  return !snap.empty;
}
