import { db } from "../config/firebase-admin";
import type { VouchCode } from "@comeoffline/types";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No I/O/0/1

function generateCode(length = 6): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

/** Get vouch codes owned by a user */
export async function getUserVouchCodes(userId: string): Promise<VouchCode[]> {
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
  const batch = db.batch();
  const codes: VouchCode[] = [];

  for (let i = 0; i < count; i++) {
    const ref = db.collection("vouch_codes").doc();
    const code = `OFF-${generateCode()}`;
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

/** Check if user already has codes for an event */
export async function hasCodesForEvent(
  userId: string,
  eventId: string,
): Promise<boolean> {
  const snap = await db
    .collection("vouch_codes")
    .where("owner_id", "==", userId)
    .where("earned_from_event", "==", eventId)
    .limit(1)
    .get();

  return !snap.empty;
}
