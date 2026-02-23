import { Router } from "express";
import { requireAdmin, type AuthRequest } from "../../middleware/auth";
import { asyncHandler } from "../../middleware/errorHandler";
import { getUsers } from "../../services/applications.service";
import { getUserProfile, deleteUser } from "../../services/profile.service";
import { getDb } from "../../config/firebase-admin";
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

export default router;
