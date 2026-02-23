import { Router } from "express";
import { requireAdmin, type AuthRequest } from "../../middleware/auth";
import { asyncHandler } from "../../middleware/errorHandler";
import { getStorageService } from "../../config/firebase-admin";
import crypto from "crypto";

const router = Router();

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_BATCH_SIZE = 10;
const ALLOWED_TYPES = ["png", "jpeg", "jpg", "gif", "webp"];
const ALLOWED_PATH_PREFIXES = [
  "admin/uploads",
  "events",
  "avatars",
  "floorplans",
  "brands",
  "content",
];

function validateDataUri(dataUri: string): void {
  const matches = dataUri.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!matches) {
    const err = new Error("Invalid image data URI") as Error & { statusCode?: number };
    err.statusCode = 400;
    throw err;
  }
  if (!ALLOWED_TYPES.includes(matches[1].toLowerCase())) {
    const err = new Error("Unsupported image type. Allowed: png, jpeg, gif, webp") as Error & { statusCode?: number };
    err.statusCode = 400;
    throw err;
  }
  const estimatedSize = Math.ceil(matches[2].length * 3 / 4);
  if (estimatedSize > MAX_IMAGE_SIZE) {
    const err = new Error(`Image exceeds maximum size of ${MAX_IMAGE_SIZE / (1024 * 1024)}MB`) as Error & { statusCode?: number };
    err.statusCode = 413;
    throw err;
  }
}

/** Upload a single image to Firebase Storage */
async function uploadSingle(dataUri: string, prefix: string): Promise<string> {
  const matches = dataUri.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!matches) throw new Error("Invalid image data URI");

  const ext = matches[1] === "jpeg" ? "jpg" : matches[1];
  const buffer = Buffer.from(matches[2], "base64");
  const filename = `${crypto.randomUUID()}.${ext}`;
  const filePath = `${prefix}/${filename}`;

  const storage = await getStorageService();
  const bucket = storage.bucket();
  const file = bucket.file(filePath);

  await file.save(buffer, {
    metadata: { contentType: `image/${matches[1]}` },
  });
  await file.makePublic();

  return `https://storage.googleapis.com/${bucket.name}/${filePath}`;
}

/** POST /api/admin/upload — Upload image(s) to Firebase Storage */
router.post(
  "/upload",
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
      const url = await uploadSingle(image, prefix);
      res.json({ success: true, data: { url } });
    } else {
      const urls = await Promise.all(
        (images as string[]).map((img) => uploadSingle(img, prefix))
      );
      res.json({ success: true, data: { urls } });
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
