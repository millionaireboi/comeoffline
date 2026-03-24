import { Router } from "express";
import express from "express";
import { requireAdmin, type AuthRequest } from "../../middleware/auth";
import { asyncHandler } from "../../middleware/errorHandler";
import { getStorageService } from "../../config/firebase-admin";
import crypto from "crypto";

const router = Router();

/** Route-specific JSON parser with higher limit for media uploads */
const largeJsonParser = express.json({ limit: "60mb" });

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_VIDEO_SIZE = 30 * 1024 * 1024; // 30MB
const MAX_BATCH_SIZE = 10;
const ALLOWED_IMAGE_TYPES = ["png", "jpeg", "jpg", "gif", "webp"];
const ALLOWED_VIDEO_TYPES = ["mp4", "webm", "quicktime", "mov"];
const ALLOWED_PATH_PREFIXES = [
  "admin/uploads",
  "events",
  "avatars",
  "floorplans",
  "brands",
  "content",
];

function validateDataUri(dataUri: string): { mediaType: "image" | "video"; ext: string } {
  const imageMatch = dataUri.match(/^data:image\/(\w+);base64,(.+)$/);
  const videoMatch = dataUri.match(/^data:video\/(\w+);base64,(.+)$/);

  if (!imageMatch && !videoMatch) {
    const err = new Error("Invalid media data URI") as Error & { statusCode?: number };
    err.statusCode = 400;
    throw err;
  }

  if (imageMatch) {
    if (!ALLOWED_IMAGE_TYPES.includes(imageMatch[1].toLowerCase())) {
      const err = new Error("Unsupported image type. Allowed: png, jpeg, gif, webp") as Error & { statusCode?: number };
      err.statusCode = 400;
      throw err;
    }
    const estimatedSize = Math.ceil(imageMatch[2].length * 3 / 4);
    if (estimatedSize > MAX_IMAGE_SIZE) {
      const err = new Error(`Image exceeds maximum size of ${MAX_IMAGE_SIZE / (1024 * 1024)}MB`) as Error & { statusCode?: number };
      err.statusCode = 413;
      throw err;
    }
    return { mediaType: "image", ext: imageMatch[1] };
  }

  const videoType = videoMatch![1].toLowerCase();
  if (!ALLOWED_VIDEO_TYPES.includes(videoType)) {
    const err = new Error("Unsupported video type. Allowed: mp4, webm, mov") as Error & { statusCode?: number };
    err.statusCode = 400;
    throw err;
  }
  const estimatedSize = Math.ceil(videoMatch![2].length * 3 / 4);
  if (estimatedSize > MAX_VIDEO_SIZE) {
    const err = new Error(`Video exceeds maximum size of ${MAX_VIDEO_SIZE / (1024 * 1024)}MB`) as Error & { statusCode?: number };
    err.statusCode = 413;
    throw err;
  }
  return { mediaType: "video", ext: videoType };
}

/** Upload a single media file to Firebase Storage */
async function uploadSingle(dataUri: string, prefix: string): Promise<{ url: string; media_type: "image" | "video" }> {
  const imageMatch = dataUri.match(/^data:image\/(\w+);base64,(.+)$/);
  const videoMatch = dataUri.match(/^data:video\/(\w+);base64,(.+)$/);

  const match = imageMatch || videoMatch;
  if (!match) throw new Error("Invalid media data URI");

  const mediaType: "image" | "video" = imageMatch ? "image" : "video";
  const mimeSubtype = match[1];
  const ext = mimeSubtype === "jpeg" ? "jpg" : mimeSubtype === "quicktime" ? "mov" : mimeSubtype;
  const buffer = Buffer.from(match[2], "base64");
  const filename = `${crypto.randomUUID()}.${ext}`;
  const filePath = `${prefix}/${filename}`;

  const storage = await getStorageService();
  const bucket = storage.bucket();
  const file = bucket.file(filePath);

  await file.save(buffer, {
    metadata: { contentType: `${mediaType}/${mimeSubtype}` },
  });
  await file.makePublic();

  return {
    url: `https://storage.googleapis.com/${bucket.name}/${filePath}`,
    media_type: mediaType,
  };
}

/** POST /api/admin/upload — Upload image(s) or video to Firebase Storage */
router.post(
  "/upload",
  largeJsonParser,
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res) => {
    const { image, images, path_prefix } = req.body;

    if (!image && (!images || !Array.isArray(images))) {
      res.status(400).json({ success: false, error: "image or images required" });
      return;
    }

    if (images && (images as string[]).length > MAX_BATCH_SIZE) {
      res.status(400).json({ success: false, error: `Maximum ${MAX_BATCH_SIZE} images per upload` });
      return;
    }

    // Validate all images before uploading any
    if (image) {
      validateDataUri(image);
    } else {
      (images as string[]).forEach(validateDataUri);
    }

    const rawPrefix = (path_prefix || "admin/uploads") as string;
    const prefix = rawPrefix.replace(/^\/+|\/+$/g, "");

    if (
      prefix.includes("..") ||
      prefix.includes("//") ||
      !ALLOWED_PATH_PREFIXES.some((allowed) => prefix === allowed || prefix.startsWith(allowed + "/"))
    ) {
      res.status(400).json({ success: false, error: "Invalid upload path" });
      return;
    }

    if (image) {
      const result = await uploadSingle(image, prefix);
      res.json({ success: true, data: { url: result.url, media_type: result.media_type } });
    } else {
      const results = await Promise.all(
        (images as string[]).map((img) => uploadSingle(img, prefix))
      );
      res.json({ success: true, data: { urls: results.map((r) => r.url) } });
    }
  })
);

/** DELETE /api/admin/upload — Delete an image from Firebase Storage */
router.delete(
  "/upload",
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res) => {
    const { url } = req.body;
    if (!url) {
      res.status(400).json({ success: false, error: "url required" });
      return;
    }

    const storage = await getStorageService();
    const bucket = storage.bucket();
    const bucketName = bucket.name;

    const escapedBucket = bucketName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pathMatch = (url as string).match(
      new RegExp(`^https://storage\\.googleapis\\.com/${escapedBucket}/(.+)$`)
    );
    if (!pathMatch) {
      res.status(400).json({ success: false, error: "Invalid storage URL" });
      return;
    }

    await bucket.file(pathMatch[1]).delete();
    res.json({ success: true });
  })
);

export default router;
