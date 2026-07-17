import { Router } from "express";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { getStorageService } from "../config/firebase-admin";
import {
  getPublicCreatorPage,
  getCreatorByUid,
  computeEarnings,
  sanitizeDraft,
  saveDraft,
} from "../services/creators.service";

const router = Router();

/**
 * GET /api/creators/public/:handle — sanitized page config for /with/<handle>.
 * Called server-side by the landing app (revalidate 60). Never returns rates,
 * payouts, or earnings.
 */
router.get("/public/:handle", async (req, res) => {
  try {
    const page = await getPublicCreatorPage(req.params.handle as string);
    if (!page) {
      res.status(404).json({ success: false, error: "not found" });
      return;
    }
    res.json({ success: true, data: page });
  } catch (err) {
    console.error("[creators] public page error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/**
 * GET /api/creators/me — the logged-in member's creator record + earnings.
 * Powers the app's creator studio. 404 for non-creators (the app uses that
 * to hide the studio entry point). Sales are anonymized in the service —
 * never buyer PII.
 */
router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const creator = await getCreatorByUid(req.uid as string);
    if (!creator || !creator.active) {
      res.status(404).json({ success: false, error: "not a creator" });
      return;
    }
    const earnings = await computeEarnings(creator);
    res.json({
      success: true,
      data: {
        handle: creator.handle,
        name: creator.name,
        rate_per_ticket: creator.rate_per_ticket,
        activation_sales: creator.activation_sales,
        discount_code: creator.discount_code,
        payouts: creator.payouts ?? [],
        page: creator.page ?? {},
        page_draft: creator.page_draft ?? null,
        page_draft_at: creator.page_draft_at ?? null,
        earnings,
      },
    });
  } catch (err) {
    console.error("[creators] me error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/**
 * PUT /api/creators/me/page — creator submits page edits as a DRAFT.
 * Nothing goes live until admin publishes it (creators tab → review draft).
 * `photo_data` is a base64 data URI (same pattern as avatar upload) —
 * stored to our bucket, so the draft's photo_url is always ours.
 */
router.put("/me/page", requireAuth, async (req: AuthRequest, res) => {
  try {
    const creator = await getCreatorByUid(req.uid as string);
    if (!creator || !creator.active) {
      res.status(404).json({ success: false, error: "not a creator" });
      return;
    }

    let photoUrl: string | undefined;
    const { photo_data } = req.body ?? {};
    if (typeof photo_data === "string" && photo_data.startsWith("data:image/")) {
      const matches = photo_data.match(/^data:image\/(\w+);base64,(.+)$/);
      if (!matches) {
        res.status(400).json({ success: false, error: "invalid image data" });
        return;
      }
      const buffer = Buffer.from(matches[2], "base64");
      if (buffer.length > 5 * 1024 * 1024) {
        res.status(400).json({ success: false, error: "image too large (max 5mb)" });
        return;
      }
      const storage = await getStorageService();
      const bucket = storage.bucket();
      const ext = matches[1] === "jpeg" ? "jpg" : matches[1];
      const file = bucket.file(`creators/${creator.handle}.${ext}`);
      await file.save(buffer, { metadata: { contentType: `image/${matches[1]}` } });
      await file.makePublic();
      // Cache-bust: the path is stable per creator, so browsers/CDN would
      // otherwise keep serving the previous photo after a re-upload
      photoUrl = `https://storage.googleapis.com/${bucket.name}/creators/${creator.handle}.${ext}?v=${Date.now()}`;
    } else if (typeof req.body?.keep_photo === "boolean" && req.body.keep_photo) {
      photoUrl = creator.page_draft?.photo_url ?? creator.page?.photo_url ?? undefined;
    }

    const draft = sanitizeDraft(req.body ?? {}, photoUrl);
    await saveDraft(creator.handle, draft);
    res.json({ success: true, data: { page_draft: draft } });
  } catch (err) {
    console.error("[creators] draft error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;
