import { Router } from "express";
import { requireAdmin, type AuthRequest } from "../../middleware/auth";
import { asyncHandler } from "../../middleware/errorHandler";
import { getStorageService } from "../../config/firebase-admin";
import crypto from "crypto";

const router = Router();

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

    const prefix = path_prefix || "admin/uploads";

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

    const pathMatch = (url as string).match(
      new RegExp(`storage\\.googleapis\\.com/${bucketName}/(.+)$`)
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
