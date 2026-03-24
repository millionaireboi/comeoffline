"use client";

import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { API_URL } from "@/lib/constants";

interface MediaUploadProps {
  value?: string;
  mediaType?: "image" | "video";
  onChange: (url: string, type: "image" | "video") => void;
  onClear: () => void;
  pathPrefix?: string;
  maxImageWidth?: number;
  imageQuality?: number;
  className?: string;
}

function compressImage(file: File, maxWidth: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let w = img.width, h = img.height;
        if (w > maxWidth || h > maxWidth) {
          const ratio = Math.min(maxWidth / w, maxWidth / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function readFileAsDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export function MediaUpload({
  value,
  mediaType,
  onChange,
  onClear,
  pathPrefix = "events",
  maxImageWidth = 1200,
  imageQuality = 0.8,
  className = "",
}: MediaUploadProps) {
  const { getIdToken } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(async (file: File) => {
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isVideo) {
      setError("Please select an image or video file");
      return;
    }

    if (isImage && file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5MB (will be compressed)");
    }

    if (isVideo && file.size > 30 * 1024 * 1024) {
      setError("Video must be under 30MB");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not authenticated");

      let dataUri: string;
      if (isImage) {
        dataUri = await compressImage(file, maxImageWidth, imageQuality);
      } else {
        dataUri = await readFileAsDataUri(file);
      }

      const res = await fetch(`${API_URL}/api/admin/upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ image: dataUri, path_prefix: pathPrefix }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      onChange(data.data.url, data.data.media_type || (isImage ? "image" : "video"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [getIdToken, maxImageWidth, imageQuality, pathPrefix, onChange]);

  const handleDelete = useCallback(async () => {
    if (!value) return;
    try {
      const token = await getIdToken();
      if (!token) return;
      await fetch(`${API_URL}/api/admin/upload`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ url: value }),
      });
      onClear();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  }, [getIdToken, value, onClear]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      uploadFile(e.dataTransfer.files[0]);
    }
  }, [uploadFile]);

  return (
    <div className={className}>
      {/* Preview */}
      {value && (
        <div className="group relative mb-3">
          {mediaType === "video" ? (
            <video
              src={value}
              className="h-40 w-full rounded-lg object-cover border border-white/10"
              muted
              loop
              playsInline
              autoPlay
            />
          ) : (
            <img
              src={value}
              alt="Event cover"
              className="h-40 w-full rounded-lg object-cover border border-white/10"
            />
          )}
          <button
            onClick={handleDelete}
            className="absolute right-2 top-2 hidden h-6 w-6 items-center justify-center rounded-full bg-red-500/90 text-[11px] text-white group-hover:flex"
          >
            x
          </button>
          <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 font-mono text-[9px] uppercase text-white">
            {mediaType}
          </span>
        </div>
      )}

      {/* Upload zone */}
      {!value && (
        <>
          <div
            onClick={() => inputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 transition-colors ${
              dragOver
                ? "border-caramel/50 bg-caramel/5"
                : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.07]"
            }`}
          >
            {uploading ? (
              <p className="font-mono text-[11px] text-muted animate-pulse">uploading...</p>
            ) : (
              <>
                <svg className="mb-2 h-8 w-8 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                </svg>
                <p className="font-mono text-[11px] text-muted">upload cover image or video</p>
                <p className="mt-1 font-mono text-[9px] text-muted/50">
                  click or drag & drop — images (5MB) or video (30MB max)
                </p>
              </>
            )}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/mp4,video/webm,video/quicktime"
            onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])}
            className="hidden"
          />
        </>
      )}

      {error && (
        <p className="mt-2 font-mono text-[10px] text-red-400">{error}</p>
      )}
    </div>
  );
}
