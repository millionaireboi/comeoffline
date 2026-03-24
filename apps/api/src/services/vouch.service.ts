import { getDb } from "../config/firebase-admin";
import { FieldValue, type Firestore } from "firebase-admin/firestore";
import type { VouchCode, VouchCodeUsage, VouchCodeRules, VouchCodeType, VouchCodeStatus } from "@comeoffline/types";
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
async function generateUniqueCode(db: Firestore, prefix = "OFF"): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = `${prefix}-${generateCode()}`;
    const existing = await db
      .collection("vouch_codes")
      .where("code", "==", code)
      .limit(1)
      .get();
    if (existing.empty) return code;
  }
  return `${prefix}-${generateCode(8)}`;
}

/** Check if a code is currently usable (not expired, not paused, not depleted) */
export function isCodeUsable(code: VouchCode, source?: string): { usable: boolean; reason?: string } {
  if (code.status === "paused") return { usable: false, reason: "Code is paused" };
  if (code.status === "expired") return { usable: false, reason: "Code has expired" };
  if (code.status === "depleted") return { usable: false, reason: "Code has reached max uses" };

  const now = new Date();

  if (code.rules.expires_at && new Date(code.rules.expires_at) < now) {
    return { usable: false, reason: "Code has expired" };
  }

  if (code.rules.valid_from && new Date(code.rules.valid_from) > now) {
    return { usable: false, reason: "Code is not yet active" };
  }

  if (code.rules.max_uses !== null && code.uses >= code.rules.max_uses) {
    return { usable: false, reason: "Code has reached max uses" };
  }

  if (code.rules.allowed_sources && code.rules.allowed_sources.length > 0 && source) {
    if (!code.rules.allowed_sources.includes(source as import("@comeoffline/types").DiscoverySource)) {
      return { usable: false, reason: "Code is not valid for this source" };
    }
  }

  return { usable: true };
}

/** Compute effective status from rules + usage */
function computeStatus(code: Pick<VouchCode, "status" | "rules" | "uses">): VouchCodeStatus {
  if (code.status === "paused") return "paused";
  const now = new Date();
  if (code.rules.expires_at && new Date(code.rules.expires_at) < now) return "expired";
  if (code.rules.max_uses !== null && code.uses >= code.rules.max_uses) return "depleted";
  return "active";
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
    const data: Omit<VouchCode, "id"> = {
      code,
      owner_id: userId,
      type: "single",
      status: "active",
      rules: { max_uses: 1 },
      uses: 0,
      used_by: [],
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

interface CreateCodeOptions {
  adminId: string;
  type: VouchCodeType;
  rules: VouchCodeRules;
  label?: string;
  description?: string;
  customCode?: string; // admin can set a custom code like "COMEOFFLINE"
  count?: number; // how many codes to create (for batch single-use)
}

/** Admin: create vouch codes with full rule support */
export async function createAdminCodes(opts: CreateCodeOptions): Promise<VouchCode[]> {
  const db = await getDb();
  const batch = db.batch();
  const codes: VouchCode[] = [];
  const count = opts.count || 1;

  for (let i = 0; i < count; i++) {
    const ref = db.collection("vouch_codes").doc();
    const codeStr = opts.customCode && count === 1
      ? opts.customCode.toUpperCase().trim()
      : await generateUniqueCode(db);

    const data: Omit<VouchCode, "id"> = {
      code: codeStr,
      owner_id: "admin",
      type: opts.type,
      status: "active",
      rules: opts.rules,
      uses: 0,
      used_by: [],
      created_by_admin: opts.adminId,
      created_at: new Date().toISOString(),
      ...(opts.label && { label: opts.label }),
      ...(opts.description && { description: opts.description }),
    };

    batch.set(ref, data);
    codes.push({ id: ref.id, ...data });
  }

  await batch.commit();
  invalidateCache();
  return codes;
}

/** Admin: update code rules / status */
export async function updateCode(
  codeId: string,
  updates: Partial<Pick<VouchCode, "status" | "rules" | "label" | "description">>,
): Promise<void> {
  const db = await getDb();
  await db.collection("vouch_codes").doc(codeId).update(updates);
  invalidateCache();
}

/** Admin: delete a code */
export async function deleteCode(codeId: string): Promise<void> {
  const db = await getDb();
  await db.collection("vouch_codes").doc(codeId).delete();
  invalidateCache();
}

/** Record a code usage — called from auth.service when someone redeems a code.
 *  Re-checks usability inside the transaction to prevent over-redemption under concurrency. */
export async function recordCodeUsage(
  codeId: string,
  usage: VouchCodeUsage,
  source?: string,
): Promise<void> {
  const db = await getDb();
  const ref = db.collection("vouch_codes").doc(codeId);

  await db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    if (!doc.exists) throw new Error("Code not found");

    const data = doc.data() as VouchCode;

    // Migrate legacy fields for the check
    if (!data.type) data.type = "single";
    if (!data.rules) data.rules = { max_uses: 1 };
    if (data.uses === undefined) data.uses = 0;
    if (!data.used_by) data.used_by = [];

    // Atomic usability re-check — prevents over-redemption
    const check = isCodeUsable(data as VouchCode, source);
    if (!check.usable) {
      throw new Error(`CODE_DEPLETED:${check.reason || "Code is no longer valid"}`);
    }

    const newUses = data.uses + 1;
    const newUsedBy = [...data.used_by, usage];

    const updatedCode = { ...data, uses: newUses, used_by: newUsedBy };
    const newStatus = computeStatus(updatedCode);

    tx.update(ref, {
      uses: FieldValue.increment(1),
      used_by: FieldValue.arrayUnion(usage),
      status: newStatus,
    });
  });

  invalidateCache();
}

// Legacy compat wrapper
export async function createSeedCodes(
  adminId: string,
  count: number,
  label?: string,
): Promise<VouchCode[]> {
  return createAdminCodes({
    adminId,
    type: "single",
    rules: { max_uses: 1 },
    label,
    count,
  });
}

// In-memory cache for admin codes
let adminCodesCache: { data: VouchCode[]; timestamp: number } | null = null;
const CACHE_TTL = 2 * 60 * 1000;

function invalidateCache() {
  adminCodesCache = null;
}

/** Get all admin-created codes */
export async function getAdminCodes(): Promise<VouchCode[]> {
  if (adminCodesCache && Date.now() - adminCodesCache.timestamp < CACHE_TTL) {
    return adminCodesCache.data;
  }

  try {
    const db = await getDb();
    const snap = await db
      .collection("vouch_codes")
      .where("owner_id", "==", "admin")
      .orderBy("created_at", "desc")
      .get();

    const codes = snap.docs.map((doc) => {
      const data = { id: doc.id, ...doc.data() } as VouchCode;
      // Migrate legacy codes that don't have new fields
      if (!data.type) data.type = "single";
      if (!data.rules) data.rules = { max_uses: 1 };
      if (data.uses === undefined) data.uses = data.used_by?.length || 0;
      if (!data.used_by) data.used_by = [];
      if (!data.status || data.status === ("unused" as string) || data.status === ("used" as string)) {
        data.status = data.uses > 0 && data.type === "single" ? "depleted" : "active";
      }
      return data;
    });

    adminCodesCache = { data: codes, timestamp: Date.now() };
    return codes;
  } catch (error: unknown) {
    const err = error as { code?: number; message?: string };
    if (err.code === 8 || (err.message && err.message.includes('RESOURCE_EXHAUSTED'))) {
      if (adminCodesCache) {
        console.warn('[vouch.service] Quota exceeded, returning stale cache');
        return adminCodesCache.data;
      }
      throw new Error('Firestore quota exceeded. Please try again later.');
    }
    throw error;
  }
}

// Legacy compat
export const getSeedCodes = getAdminCodes;

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
