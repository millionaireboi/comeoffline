import { getDb } from "../config/firebase-admin";
import type { BrandInquiry } from "@comeoffline/types";

export async function submitBrandInquiry(
  name: string,
  email: string,
  brand: string,
  role: string,
  interest: string,
): Promise<BrandInquiry> {
  const db = await getDb();
  const ref = db.collection("brand_inquiries").doc();
  const data = {
    name,
    email,
    brand,
    role,
    interest,
    status: "new" as const,
    submitted_at: new Date().toISOString(),
  };
  await ref.set(data);
  return { id: ref.id, ...data };
}

export async function getBrandInquiries(
  status?: string,
): Promise<BrandInquiry[]> {
  const db = await getDb();
  const snap = await db.collection("brand_inquiries").orderBy("submitted_at", "desc").get();
  let inquiries = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as BrandInquiry);
  if (status) {
    inquiries = inquiries.filter((i) => i.status === status);
  }
  return inquiries;
}

export async function updateBrandStatus(
  id: string,
  adminId: string,
  status: string,
  notes?: string,
): Promise<boolean> {
  const db = await getDb();
  const doc = await db.collection("brand_inquiries").doc(id).get();
  if (!doc.exists) return false;
  const update: Record<string, unknown> = {
    status,
    responded_by: adminId,
    responded_at: new Date().toISOString(),
  };
  if (notes !== undefined) update.notes = notes;
  await db.collection("brand_inquiries").doc(id).update(update);
  return true;
}
