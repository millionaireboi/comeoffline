import { Router } from "express";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { getUserProfile, updateUserProfile, checkHandleAvailable } from "../services/profile.service";
import { getStorageService } from "../config/firebase-admin";

const router = Router();

const VALID_AGE_RANGES = ["21-24", "25-28", "29-32", "33+"];
const VALID_ONBOARDING_SOURCES = ["landing_code", "landing_chatbot", "direct_pwa"];

/** GET /api/users/check-handle/:handle — Check if a handle is available */
router.get("/check-handle/:handle", requireAuth, async (req: AuthRequest, res) => {
  try {
    const handle = req.params.handle as string;

    // Validate handle format
    if (!handle || !/^[a-z0-9_]{3,24}$/.test(handle)) {
      res.status(400).json({ success: false, error: "Handle must be 3-24 characters, lowercase letters, numbers, and underscores only" });
      return;
    }

    const available = await checkHandleAvailable(handle);
    res.json({ success: true, data: { available } });
  } catch (err) {
    console.error("[profile] check-handle error:", err);
    res.status(500).json({ success: false, error: "Failed to check handle" });
  }
});

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
    const {
      name, handle, vibe_tag, instagram_handle, has_seen_welcome, fcm_token,
      avatar_url, avatar_type, area, age_range, hot_take,
      drink_of_choice, referral_source, has_completed_profile,
      has_completed_onboarding, onboarding_source,
    } = req.body;

    const updates: Record<string, unknown> = {};
    if (name) updates.name = name;
    if (handle) updates.handle = handle;
    if (vibe_tag) updates.vibe_tag = vibe_tag;
    if (instagram_handle !== undefined) updates.instagram_handle = instagram_handle;
    if (has_seen_welcome !== undefined) updates.has_seen_welcome = !!has_seen_welcome;
    if (fcm_token !== undefined) updates.fcm_token = fcm_token;

    // New onboarding fields
    if (avatar_type !== undefined) updates.avatar_type = avatar_type;
    if (area !== undefined) updates.area = String(area);
    if (age_range !== undefined) {
      if (!VALID_AGE_RANGES.includes(age_range)) {
        res.status(400).json({ success: false, error: "Invalid age_range" });
        return;
      }
      updates.age_range = age_range;
    }
    if (hot_take !== undefined) updates.hot_take = String(hot_take).slice(0, 60);
    if (drink_of_choice !== undefined) updates.drink_of_choice = String(drink_of_choice);
    if (referral_source !== undefined) updates.referral_source = String(referral_source);
    if (has_completed_profile !== undefined) updates.has_completed_profile = !!has_completed_profile;
    if (has_completed_onboarding !== undefined) updates.has_completed_onboarding = !!has_completed_onboarding;
    if (onboarding_source !== undefined) {
      if (!VALID_ONBOARDING_SOURCES.includes(onboarding_source)) {
        res.status(400).json({ success: false, error: "Invalid onboarding_source" });
        return;
      }
      updates.onboarding_source = onboarding_source;
    }

    // Handle avatar upload: if avatar_url is a base64 data URI, upload to Storage
    if (avatar_url !== undefined) {
      if (typeof avatar_url === "string" && avatar_url.startsWith("data:image/")) {
        try {
          const storage = await getStorageService();
          const bucket = storage.bucket();

          // Extract mime type and base64 data
          const matches = avatar_url.match(/^data:image\/(\w+);base64,(.+)$/);
          if (!matches) {
            res.status(400).json({ success: false, error: "Invalid image data" });
            return;
          }
          const ext = matches[1] === "jpeg" ? "jpg" : matches[1];
          const buffer = Buffer.from(matches[2], "base64");

          // Upload to Firebase Storage
          const filePath = `avatars/${req.uid}.${ext}`;
          const file = bucket.file(filePath);
          await file.save(buffer, {
            metadata: { contentType: `image/${matches[1]}` },
          });
          await file.makePublic();
          updates.avatar_url = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
        } catch (uploadErr) {
          console.error("[profile] avatar upload error:", uploadErr);
          // Don't fail the whole update — skip avatar
        }
      } else {
        // Non-base64 avatar_url (e.g. "gradient:3")
        updates.avatar_url = avatar_url;
      }
    }

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
