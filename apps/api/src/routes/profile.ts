import { Router } from "express";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { getUserProfile, updateUserProfile } from "../services/profile.service";

const router = Router();

/** GET /api/users/me — Get current user's profile */
router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const profile = await getUserProfile(req.uid!);
    if (!profile) {
      res.status(404).json({ success: false, error: "User not found" });
      return;
    }
    res.json({ success: true, data: profile });
  } catch (err) {
    console.error("[profile] fetch error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch profile" });
  }
});

/** PUT /api/users/me — Update current user's profile */
router.put("/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { name, handle, vibe_tag, instagram_handle } = req.body;
    const updates: Record<string, string> = {};
    if (name) updates.name = name;
    if (handle) updates.handle = handle;
    if (vibe_tag) updates.vibe_tag = vibe_tag;
    if (instagram_handle !== undefined) updates.instagram_handle = instagram_handle;

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ success: false, error: "No fields to update" });
      return;
    }

    await updateUserProfile(req.uid!, updates);
    res.json({ success: true });
  } catch (err) {
    console.error("[profile] update error:", err);
    res.status(500).json({ success: false, error: "Failed to update profile" });
  }
});

export default router;
