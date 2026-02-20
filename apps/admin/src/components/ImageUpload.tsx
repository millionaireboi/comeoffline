"use client";

import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { API_URL } from "@/lib/constants";

interface ImageUploadProps {
  value?: string;
  values?: string[];
  onChange?: (url: string) => void;
  onChangeMultiple?: (urls: string[]) => void;
  multiple?: boolean;
  pathPrefix?: string;
  maxWidth?: number;
  quality?: number;
  className?: string;
  label?: string;
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

export function ImageUpload({
  value,
  values = [],
  onChange,
  onChangeMultiple,
  multiple = false,
  pathPrefix = "admin/uploads",
  maxWidth = 1200,
  quality = 0.8,
  className = "",
  label = "upload image",
}: ImageUploadProps) {
  const { getIdToken } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      setError("Please select image files");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not authenticated");

      const compressed = await Promise.all(
        imageFiles.map(f => compressImage(f, maxWidth, quality))
      );

      if (multiple && compressed.length > 1) {
        const res = await fetch(`${API_URL}/api/admin/upload`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ images: compressed, path_prefix: pathPrefix }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        onChangeMultiple?.([...values, ...data.data.urls]);
      } else {
        for (const dataUri of compressed) {
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

          if (multiple) {
            onChangeMultiple?.([...values, data.data.url]);
          } else {
            onChange?.(data.data.url);
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [getIdToken, maxWidth, quality, pathPrefix, multiple, values, onChange, onChangeMultiple]);

  const handleDelete = useCallback(async (url: string) => {
    try {
      const token = await getIdToken();
      if (!token) return;
      await fetch(`${API_URL}/api/admin/upload`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ url }),
      });

      if (multiple) {
        onChangeMultiple?.(values.filter(v => v !== url));
      } else {
        onChange?.("");
      }
    } catch (err) {
      console.error("Delete failed:", err);
    }
  }, [getIdToken, multiple, values, onChange, onChangeMultiple]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files);
    }
  }, [uploadFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const currentImages = multiple ? values : value ? [value] : [];

  return (
    <div className={className}>
      {/* Thumbnails */}
      {currentImages.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {currentImages.map((url) => (
            <div key={url} className="group relative">
              <img
                src={url}
                alt=""
                className="h-20 w-20 rounded-lg object-cover border border-white/10"
              />
              <button
                onClick={() => handleDelete(url)}
                className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white group-hover:flex"
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={() => setDragOver(false)}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 transition-colors ${
          dragOver
            ? "border-caramel/50 bg-caramel/5"
            : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.07]"
        }`}
      >
        {uploading ? (
          <p className="font-mono text-[11px] text-muted animate-pulse">uploading...</p>
        ) : (
          <>
            <svg className="mb-2 h-6 w-6 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.338-2.32 3 3 0 013.182 5.595H6.75z" />
            </svg>
            <p className="font-mono text-[11px] text-muted">{label}</p>
            <p className="mt-1 font-mono text-[9px] text-muted/50">
              click or drag &amp; drop{multiple ? " (multiple)" : ""}
            </p>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        onChange={(e) => e.target.files && uploadFiles(e.target.files)}
        className="hidden"
      />

      {error && (
        <p className="mt-2 font-mono text-[10px] text-red-400">{error}</p>
      )}
    </div>
  );
}
