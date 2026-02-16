import { getDb } from "../config/firebase-admin";
import { getAuthService } from "../config/firebase-admin";
import type { Application, VibeCheckAnswer } from "@comeoffline/types";

/** Submit a prove-yourself application */
export async function submitApplication(
  name: string,
  answers: VibeCheckAnswer[],
): Promise<Application> {
  const db = await getDb();
  const ref = db.collection("applications").doc();
  const data = {
    user_id: "", // Set after approval when user is created
    name,
    answers,
    status: "pending" as const,
    submitted_at: new Date().toISOString(),
  };

  await ref.set(data);
  return { id: ref.id, ...data };
}

/** Get all applications (admin) */
export async function getApplications(
  status?: string,
): Promise<Application[]> {
  const db = await getDb();
  // Simple orderBy-only query avoids needing a composite index
  const snap = await db.collection("applications").orderBy("submitted_at", "desc").get();
  let apps = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Application);

  if (status) {
    apps = apps.filter((a) => a.status === status);
  }

  return apps;
}

/** Get a single application */
export async function getApplication(id: string): Promise<Application | null> {
  const db = await getDb();
  const doc = await db.collection("applications").doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as Application;
}

/** Approve an application — creates user and sends magic link */
export async function approveApplication(
  applicationId: string,
  reviewerId: string,
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  const appDoc = await db.collection("applications").doc(applicationId).get();
  if (!appDoc.exists) return { success: false, error: "Application not found" };

  const application = appDoc.data() as Application;
  if (application.status !== "pending") {
    return { success: false, error: "Application already reviewed" };
  }

  try {
    // Create a unique invite code for this approved user
    const code = `PROVED-${applicationId.slice(0, 6).toUpperCase()}`;
    const codeRef = db.collection("vouch_codes").doc();
    await codeRef.set({
      code,
      owner_id: "system",
      status: "unused",
      earned_from_event: "prove_yourself",
      created_at: new Date().toISOString(),
    });

    // Update application
    await db.collection("applications").doc(applicationId).update({
      status: "approved",
      reviewed_by: reviewerId,
      invite_code: code,
    });

    return { success: true };
  } catch (err) {
    console.error("[applications] approve error:", err);
    return { success: false, error: "Failed to approve application" };
  }
}

/** Reject an application */
export async function rejectApplication(
  applicationId: string,
  reviewerId: string,
): Promise<boolean> {
  const db = await getDb();
  const doc = await db.collection("applications").doc(applicationId).get();
  if (!doc.exists) return false;

  await db.collection("applications").doc(applicationId).update({
    status: "rejected",
    reviewed_by: reviewerId,
  });

  return true;
}

/** Get all users (admin) */
// In-memory cache for users list (3 minute TTL)
let usersCache: {
  data: Array<{
    id: string;
    name: string;
    handle: string;
    vibe_tag: string;
    entry_path: string;
    status: string;
    created_at: string;
    events_count: number;
  }>;
  timestamp: number;
} | null = null;
const USERS_CACHE_TTL = 3 * 60 * 1000; // 3 minutes

export async function getUsers(): Promise<Array<{
  id: string;
  name: string;
  handle: string;
  vibe_tag: string;
  entry_path: string;
  status: string;
  created_at: string;
  events_count: number;
}>> {
  // Return cached data if available and fresh
  if (usersCache && Date.now() - usersCache.timestamp < USERS_CACHE_TTL) {
    return usersCache.data;
  }

  try {
    const db = await getDb();
    const usersSnap = await db.collection("users").orderBy("created_at", "desc").get();

    const users = usersSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        handle: data.handle,
        vibe_tag: data.vibe_tag,
        entry_path: data.entry_path,
        status: data.status,
        created_at: data.created_at,
        events_count: 0, // Would need to aggregate from RSVPs
      };
    });

    // Update cache
    usersCache = { data: users, timestamp: Date.now() };

    return users;
  } catch (error: unknown) {
    const err = error as { code?: number; message?: string };

    // Handle quota exhaustion gracefully
    if (err.code === 8 || (err.message && err.message.includes('RESOURCE_EXHAUSTED'))) {
      // If we have cached data, return it even if stale
      if (usersCache) {
        console.warn('[applications.service] Quota exceeded, returning stale cache');
        return usersCache.data;
      }
      throw new Error('Firestore quota exceeded. Please try again later.');
    }

    throw error;
  }
}
