import { Router } from "express";
import { requireAdmin, type AuthRequest } from "../../middleware/auth";
import { asyncHandler } from "../../middleware/errorHandler";
import { getUsers } from "../../services/applications.service";
import { getUserProfile, deleteUser } from "../../services/profile.service";
import { getDb, getAuthService } from "../../config/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

const router = Router();

/** GET /api/admin/members — List all members */
router.get("/", requireAdmin, async (_req: AuthRequest, res) => {
  try {
    const users = await getUsers();
    res.json({ success: true, data: users });
  } catch (err) {
    console.error("[admin/members] list error:", err);

    const error = err as Error;

    // Check if it's a quota error
    if (error.message && error.message.includes('quota')) {
      res.status(429).json({
        success: false,
        error: "Firestore quota exceeded. Data may be cached. Try again in a few minutes.",
        cached: true
      });
      return;
    }

    res.status(500).json({ success: false, error: "Failed to fetch members" });
  }
});

/**
 * GET /api/admin/members/lookup-phone?phone=+91...
 * Diagnostic: surface every place a phone number is referenced — Firestore users,
 * phone_otps, and Firebase Auth — so we can tell if an admin-deleted member left
 * orphaned state that's blocking re-onboarding.
 *
 * NOTE: declared before /:id so Express doesn't match "lookup-phone" as an id.
 */
router.get("/lookup-phone", requireAdmin, asyncHandler(async (req: AuthRequest, res) => {
  const phone = (req.query.phone as string | undefined)?.trim();
  if (!phone) {
    res.status(400).json({ success: false, error: "phone query param required" });
    return;
  }

  const db = await getDb();
  const auth = await getAuthService();

  const usersSnap = await db.collection("users").where("phone_number", "==", phone).get();
  const users = usersSnap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      handle: data.handle ?? null,
      full_name: data.full_name ?? null,
      status: data.status ?? null,
      phone_number: data.phone_number ?? null,
      phone_verified_at: data.phone_verified_at ?? null,
      created_at: data.created_at ?? null,
    };
  });

  const otpsSnap = await db.collection("phone_otps").where("phone", "==", phone).get();
  const phone_otps = otpsSnap.docs.map((d) => {
    const data = d.data();
    return {
      user_id: d.id,
      phone: data.phone ?? null,
      consumed: data.consumed ?? null,
      verified_at: data.verified_at ?? null,
      created_at: data.created_at ?? null,
      expires_at: data.expires_at ?? null,
    };
  });

  let firebase_auth_user: { uid: string; phoneNumber: string | undefined; disabled: boolean } | null = null;
  let firebase_auth_error: string | null = null;
  try {
    const u = await auth.getUserByPhoneNumber(phone);
    firebase_auth_user = { uid: u.uid, phoneNumber: u.phoneNumber, disabled: u.disabled };
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    firebase_auth_error = code === "auth/user-not-found" ? "not-found" : (code ?? "unknown");
  }

  res.json({
    success: true,
    data: {
      phone,
      users,
      phone_otps,
      firebase_auth_user,
      firebase_auth_error,
      verdict:
        users.length === 0 && !firebase_auth_user && phone_otps.length === 0
          ? "clean — phone is fully free"
          : users.length > 1
          ? "duplicate users with same phone — manual cleanup needed"
          : users.length === 1
          ? `users doc ${users[0].id} owns this phone`
          : firebase_auth_user
          ? `firebase auth user ${firebase_auth_user.uid} still has phone (no firestore doc)`
          : "orphaned phone_otps record only",
    },
  });
}));

/**
 * POST /api/admin/members/lookup-phone/cleanup
 * Body: { phone: string, confirm: true }
 * Force-cleans orphaned state for a phone: deletes any matching phone_otps docs,
 * and deletes the Firebase Auth user if present. Refuses if a users doc still
 * owns the phone — delete the member first via DELETE /api/admin/members/:id.
 */
router.post("/lookup-phone/cleanup", requireAdmin, asyncHandler(async (req: AuthRequest, res) => {
  const { phone, confirm } = req.body as { phone?: string; confirm?: boolean };
  if (!phone || confirm !== true) {
    res.status(400).json({ success: false, error: "phone + confirm:true required" });
    return;
  }

  const db = await getDb();
  const auth = await getAuthService();

  const usersSnap = await db.collection("users").where("phone_number", "==", phone).limit(1).get();
  if (!usersSnap.empty) {
    res.status(409).json({
      success: false,
      error: `users doc ${usersSnap.docs[0].id} still owns this phone — delete the member first via DELETE /api/admin/members/:id`,
    });
    return;
  }

  const otpsSnap = await db.collection("phone_otps").where("phone", "==", phone).get();
  const otpDeletes: string[] = [];
  for (const doc of otpsSnap.docs) {
    await doc.ref.delete();
    otpDeletes.push(doc.id);
  }

  let auth_deleted: string | null = null;
  let auth_error: string | null = null;
  try {
    const u = await auth.getUserByPhoneNumber(phone);
    await auth.deleteUser(u.uid);
    auth_deleted = u.uid;
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    auth_error = code === "auth/user-not-found" ? null : (code ?? "unknown");
  }

  res.json({
    success: true,
    data: { phone, phone_otps_deleted: otpDeletes, auth_deleted, auth_error },
  });
}));

/** GET /api/admin/members/:id — Get full member profile */
router.get("/:id", requireAdmin, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.params.id as string;
  const profile = await getUserProfile(userId);

  if (!profile) {
    res.status(404).json({ success: false, error: "Member not found" });
    return;
  }

  res.json({ success: true, data: profile });
}));

/** PUT /api/admin/members/:id/status — Change member status */
router.put("/:id/status", requireAdmin, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.params.id as string;
  const { status } = req.body;

  if (!["active", "provisional", "inactive"].includes(status)) {
    res.status(400).json({ success: false, error: "Invalid status" });
    return;
  }

  const db = await getDb();
  await db.collection("users").doc(userId).update({ status });
  res.json({ success: true });
}));

/** GET /api/admin/members/:id/notes — Get admin notes for a member */
router.get("/:id/notes", requireAdmin, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.params.id as string;
  const db = await getDb();
  const snap = await db
    .collection("admin_notes")
    .where("user_id", "==", userId)
    .orderBy("created_at", "desc")
    .get();

  const notes = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  res.json({ success: true, data: notes });
}));

/** DELETE /api/admin/members/:id — Delete a member and all associated data */
router.delete("/:id", requireAdmin, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.params.id as string;

  // Prevent admins from deleting themselves
  if (userId === req.uid) {
    res.status(400).json({ success: false, error: "Cannot delete your own account" });
    return;
  }

  const db = await getDb();
  const userDoc = await db.collection("users").doc(userId).get();
  if (!userDoc.exists) {
    res.status(404).json({ success: false, error: "Member not found" });
    return;
  }

  await deleteUser(userId);

  // Invalidate users cache so the list refreshes
  const { invalidateUsersCache } = await import("../../services/applications.service");
  invalidateUsersCache();

  res.json({ success: true });
}));

/** POST /api/admin/members/:id/notes — Add admin note for a member */
router.post("/:id/notes", requireAdmin, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.params.id as string;
  const { note } = req.body;

  if (!note || typeof note !== "string" || !note.trim()) {
    res.status(400).json({ success: false, error: "Note text is required" });
    return;
  }

  const db = await getDb();
  const ref = db.collection("admin_notes").doc();
  const data = {
    user_id: userId,
    note: note.trim(),
    created_by: req.uid,
    created_at: FieldValue.serverTimestamp(),
  };

  await ref.set(data);
  res.json({ success: true, data: { id: ref.id, ...data, created_at: new Date().toISOString() } });
}));

/** POST /api/admin/members/:id/reset-pin — Reset a member's PIN (admin only) */
router.post("/:id/reset-pin", requireAdmin, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.params.id as string;
  const db = await getDb();

  const userDoc = await db.collection("users").doc(userId).get();
  if (!userDoc.exists) {
    res.status(404).json({ success: false, error: "Member not found" });
    return;
  }

  await db.collection("users").doc(userId).update({
    pin_hash: FieldValue.delete(),
    pin_set_at: FieldValue.delete(),
  });

  res.json({ success: true });
}));

export default router;
