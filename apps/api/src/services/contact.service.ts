import { getDb } from "../config/firebase-admin";
import type { ContactSubmission } from "@comeoffline/types";

export async function submitContact(
  name: string,
  email: string,
  message: string,
): Promise<ContactSubmission> {
  const db = await getDb();
  const ref = db.collection("contact_submissions").doc();
  const data = {
    name,
    email,
    message,
    status: "unread" as const,
    submitted_at: new Date().toISOString(),
  };
  await ref.set(data);
  return { id: ref.id, ...data };
}

export async function getContactSubmissions(
  status?: string,
): Promise<ContactSubmission[]> {
  const db = await getDb();
  const snap = await db.collection("contact_submissions").orderBy("submitted_at", "desc").get();
  let submissions = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as ContactSubmission);
  if (status) {
    submissions = submissions.filter((s) => s.status === status);
  }
  return submissions;
}

export async function markContactRead(
  id: string,
  adminId: string,
  newStatus: "read" | "replied" = "read",
): Promise<boolean> {
  const db = await getDb();
  const doc = await db.collection("contact_submissions").doc(id).get();
  if (!doc.exists) return false;
  await db.collection("contact_submissions").doc(id).update({
    status: newStatus,
    read_by: adminId,
    read_at: new Date().toISOString(),
  });
  return true;
}
