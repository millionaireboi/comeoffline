import { Router } from "express";
import express from "express";
import { requireAdmin, type AuthRequest } from "../../middleware/auth";
import { asyncHandler } from "../../middleware/errorHandler";
import { getStorageService } from "../../config/firebase-admin";
import crypto from "crypto";
import { spawn } from "child_process";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import ffmpegPath from "ffmpeg-static";

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

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) return reject(new Error("ffmpeg binary not available"));
    const proc = spawn(ffmpegPath, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    proc.stderr.on("data", (d) => { stderr += d; });
    const timer = setTimeout(() => proc.kill("SIGKILL"), 180_000);
    proc.on("error", (err) => { clearTimeout(timer); reject(err); });
    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-400)}`));
    });
  });
}

/** Transcode a cover video into a light, stream-friendly MP4 and grab a
 *  poster frame. 720p max / H.264 / CRF 28 / no audio (covers autoplay
 *  muted) / +faststart so playback starts before the download finishes —
 *  a 30MB phone clip comes out at a few MB and plays on slow connections.
 *  Length capped at 60s. */
async function transcodeVideo(
  buffer: Buffer,
  ext: string,
): Promise<{ video: Buffer; poster: Buffer }> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "cover-"));
  const inPath = path.join(dir, `in.${ext}`);
  const outPath = path.join(dir, "out.mp4");
  const posterPath = path.join(dir, "poster.jpg");
  try {
    await fs.writeFile(inPath, buffer);
    await runFfmpeg([
      "-y", "-i", inPath,
      "-vf", "scale='min(720,iw)':-2",
      "-c:v", "libx264", "-crf", "28", "-preset", "veryfast",
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      "-an",
      "-t", "60",
      outPath,
    ]);
    await runFfmpeg(["-y", "-i", outPath, "-frames:v", "1", "-q:v", "4", posterPath]);
    return { video: await fs.readFile(outPath), poster: await fs.readFile(posterPath) };
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

async function saveToBucket(buffer: Buffer, filePath: string, contentType: string): Promise<string> {
  const storage = await getStorageService();
  const bucket = storage.bucket();
  const file = bucket.file(filePath);
  await file.save(buffer, { metadata: { contentType } });
  await file.makePublic();
  return `https://storage.googleapis.com/${bucket.name}/${filePath}`;
}

/** Upload a single media file to Firebase Storage */
async function uploadSingle(
  dataUri: string,
  prefix: string,
): Promise<{ url: string; media_type: "image" | "video"; poster_url?: string }> {
  const imageMatch = dataUri.match(/^data:image\/(\w+);base64,(.+)$/);
  const videoMatch = dataUri.match(/^data:video\/(\w+);base64,(.+)$/);

  const match = imageMatch || videoMatch;
  if (!match) throw new Error("Invalid media data URI");

  const mediaType: "image" | "video" = imageMatch ? "image" : "video";
  const mimeSubtype = match[1];
  const ext = mimeSubtype === "jpeg" ? "jpg" : mimeSubtype === "quicktime" ? "mov" : mimeSubtype;
  const buffer = Buffer.from(match[2], "base64");
  const id = crypto.randomUUID();

  if (mediaType === "video") {
    try {
      const { video, poster } = await transcodeVideo(buffer, ext);
      const [url, posterUrl] = await Promise.all([
        saveToBucket(video, `${prefix}/${id}.mp4`, "video/mp4"),
        saveToBucket(poster, `${prefix}/${id}-poster.jpg`, "image/jpeg"),
      ]);
      return { url, media_type: "video", poster_url: posterUrl };
    } catch (err) {
      // Transcode failure shouldn't block the upload — store the original.
      // (No poster in that case; players fall back to first-frame behavior.)
      console.warn("[upload] video transcode failed, storing original:", err);
      const url = await saveToBucket(buffer, `${prefix}/${id}.${ext}`, `video/${mimeSubtype}`);
      return { url, media_type: "video" };
    }
  }

  const url = await saveToBucket(buffer, `${prefix}/${id}.${ext}`, `image/${mimeSubtype}`);
  return { url, media_type: "image" };
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
      res.json({
        success: true,
        data: {
          url: result.url,
          media_type: result.media_type,
          ...(result.poster_url && { poster_url: result.poster_url }),
        },
      });
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
