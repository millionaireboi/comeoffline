import { Router } from "express";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { getUserProfile, updateUserProfile, checkHandleAvailable } from "../services/profile.service";
import { getEnrichedConnections } from "../services/connections.service";
import { getStorageService } from "../config/firebase-admin";
import { CURATED_INTERESTS } from "@comeoffline/types";
import { isValidPin, hashPin } from "../services/pin.service";

const router = Router();

const VALID_AGE_RANGES = ["21-24", "25-28", "29-32", "33+"];
const VALID_GENDERS = ["male", "female", "non-binary", "prefer not to say"];
const VALID_SIGNS = ["bandar", "labrador", "cat", "mynah", "redpanda", "peacock"];
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
      name, handle, vibe_tag, email, instagram_handle, has_seen_welcome, fcm_token,
      avatar_url, avatar_type, area, age_range, gender, hot_take, bio,
      interests, date_of_birth, show_age,
      drink_of_choice, community_intent, referral_source, has_completed_profile,
      has_completed_onboarding, onboarding_source,
      sign, sign_scores, sign_label, sign_emoji, sign_color, quiz_completed_at,
    } = req.body;

    // Length validation for string fields
    const strCheck = (val: unknown, max: number): val is string =>
      typeof val === "string" && val.length <= max;

    const updates: Record<string, unknown> = {};
    if (name) {
      if (!strCheck(name, 100)) { res.status(400).json({ success: false, error: "name must be max 100 characters" }); return; }
      updates.name = name;
    }
    if (handle) {
      if (typeof handle !== "string" || !/^[a-z0-9_]{3,24}$/.test(handle)) { res.status(400).json({ success: false, error: "Invalid handle format" }); return; }
      updates.handle = handle;
    }
    if (vibe_tag) {
      if (!strCheck(vibe_tag, 50)) { res.status(400).json({ success: false, error: "vibe_tag must be max 50 characters" }); return; }
      updates.vibe_tag = vibe_tag;
    }
    if (email !== undefined) {
      if (email !== "" && (typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
        res.status(400).json({ success: false, error: "Invalid email address" }); return;
      }
      updates.email = email;
    }
    if (instagram_handle !== undefined) {
      if (instagram_handle !== "" && !strCheck(instagram_handle, 30)) { res.status(400).json({ success: false, error: "instagram_handle must be max 30 characters" }); return; }
      updates.instagram_handle = instagram_handle;
    }
    if (has_seen_welcome !== undefined) updates.has_seen_welcome = !!has_seen_welcome;
    if (fcm_token !== undefined) {
      if (fcm_token !== "" && !strCheck(fcm_token, 500)) { res.status(400).json({ success: false, error: "fcm_token too long" }); return; }
      updates.fcm_token = fcm_token;
    }

    // New onboarding fields
    if (avatar_type !== undefined) updates.avatar_type = avatar_type;
    if (area !== undefined) {
      if (!strCheck(String(area), 100)) { res.status(400).json({ success: false, error: "area must be max 100 characters" }); return; }
      updates.area = String(area);
    }
    if (age_range !== undefined) {
      if (!VALID_AGE_RANGES.includes(age_range)) {
        res.status(400).json({ success: false, error: "Invalid age_range" });
        return;
      }
      updates.age_range = age_range;
    }
    if (gender !== undefined) {
      if (!VALID_GENDERS.includes(gender)) {
        res.status(400).json({ success: false, error: "Invalid gender" });
        return;
      }
      updates.gender = gender;
    }
    if (hot_take !== undefined) updates.hot_take = String(hot_take).slice(0, 60);
    if (bio !== undefined) {
      if (!strCheck(String(bio), 200)) { res.status(400).json({ success: false, error: "bio must be max 200 characters" }); return; }
      updates.bio = String(bio);
    }
    if (interests !== undefined) {
      if (!Array.isArray(interests) || interests.length > 8) {
        res.status(400).json({ success: false, error: "interests must be an array of up to 8 items" });
        return;
      }
      const validInterests = interests.filter((i: string) => (CURATED_INTERESTS as readonly string[]).includes(i));
      updates.interests = validInterests;
    }
    if (date_of_birth !== undefined) {
      const dob = new Date(date_of_birth);
      if (isNaN(dob.getTime())) { res.status(400).json({ success: false, error: "Invalid date_of_birth" }); return; }
      const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      if (age < 18) { res.status(400).json({ success: false, error: "Must be at least 18 years old" }); return; }
      updates.date_of_birth = date_of_birth;
      // Derive age_range for backward compatibility
      if (age <= 24) updates.age_range = "21-24";
      else if (age <= 28) updates.age_range = "25-28";
      else if (age <= 32) updates.age_range = "29-32";
      else updates.age_range = "33+";
    }
    if (show_age !== undefined) updates.show_age = !!show_age;
    if (drink_of_choice !== undefined) updates.drink_of_choice = String(drink_of_choice).slice(0, 100);
    if (community_intent !== undefined) updates.community_intent = String(community_intent).slice(0, 200);
    if (referral_source !== undefined) updates.referral_source = String(referral_source).slice(0, 100);
    if (has_completed_profile !== undefined) updates.has_completed_profile = !!has_completed_profile;
    if (has_completed_onboarding !== undefined) updates.has_completed_onboarding = !!has_completed_onboarding;
    if (onboarding_source !== undefined) {
      if (!VALID_ONBOARDING_SOURCES.includes(onboarding_source)) {
        res.status(400).json({ success: false, error: "Invalid onboarding_source" });
        return;
      }
      updates.onboarding_source = onboarding_source;
    }

    // Sign quiz fields
    if (sign !== undefined) {
      if (!VALID_SIGNS.includes(sign)) {
        res.status(400).json({ success: false, error: "Invalid sign" });
        return;
      }
      updates.sign = sign;
    }
    if (sign_scores !== undefined && typeof sign_scores === "object" && sign_scores !== null) {
      if (Object.keys(sign_scores).length > 10) { res.status(400).json({ success: false, error: "sign_scores has too many keys" }); return; }
      updates.sign_scores = sign_scores;
    }
    if (sign_label !== undefined) updates.sign_label = String(sign_label).slice(0, 50);
    if (sign_emoji !== undefined) updates.sign_emoji = String(sign_emoji).slice(0, 10);
    if (sign_color !== undefined) updates.sign_color = String(sign_color).slice(0, 20);
    if (quiz_completed_at !== undefined) updates.quiz_completed_at = String(quiz_completed_at).slice(0, 30);

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
    if (err instanceof Error && err.message === "Handle is already taken") {
      res.status(409).json({ success: false, error: "Handle is already taken" });
      return;
    }
    console.error("[profile] update error:", err);
    res.status(500).json({ success: false, error: "Failed to update profile" });
  }
});

/** POST /api/users/me/pin — Set or update the user's 4-digit PIN */
router.post("/me/pin", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { pin } = req.body;

    if (!pin || typeof pin !== "string" || !isValidPin(pin)) {
      res.status(400).json({ success: false, error: "PIN must be exactly 4 digits" });
      return;
    }

    const pinHash = await hashPin(pin);
    await updateUserProfile(req.uid!, {
      pin_hash: pinHash,
      pin_set_at: new Date().toISOString(),
    });

    res.json({ success: true });
  } catch (err) {
    console.error("[profile] set-pin error:", err);
    res.status(500).json({ success: false, error: "Failed to set PIN" });
  }
});

/** GET /api/users/me/connections — Get enriched mutual connections */
router.get("/me/connections", requireAuth, async (req: AuthRequest, res) => {
  try {
    const connections = await getEnrichedConnections(req.uid!);
    res.json({ success: true, data: connections });
  } catch (err) {
    console.error("[profile] connections error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch connections" });
  }
});

export default router;
