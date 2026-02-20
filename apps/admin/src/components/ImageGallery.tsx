"use client";

import { useState } from "react";

interface ImageGalleryProps {
  images: string[];
  onDelete?: (url: string) => void;
  columns?: number;
}

export function ImageGallery({ images, onDelete, columns = 3 }: ImageGalleryProps) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  if (images.length === 0) return null;

  return (
    <>
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
      >
        {images.map((url) => (
          <div key={url} className="group relative aspect-square">
            <img
              src={url}
              alt=""
              onClick={() => setLightbox(url)}
              className="h-full w-full cursor-pointer rounded-lg object-cover border border-white/10 transition-opacity hover:opacity-80"
            />
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(url);
                }}
                className="absolute right-1.5 top-1.5 hidden h-6 w-6 items-center justify-center rounded-full bg-black/60 text-[10px] text-white backdrop-blur-sm group-hover:flex hover:bg-red-500"
              >
                x
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw]">
            <img
              src={lightbox}
              alt=""
              className="max-h-[85vh] max-w-[85vw] rounded-lg object-contain"
            />
            <button
              onClick={() => setLightbox(null)}
              className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 font-mono text-sm text-white backdrop-blur-sm hover:bg-white/20"
            >
              x
            </button>
          </div>
        </div>
      )}
    </>
  );
}
