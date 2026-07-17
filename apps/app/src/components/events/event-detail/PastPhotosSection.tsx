import type { PastPhoto } from "@comeoffline/types";
import { SectionLabel } from "./SectionLabel";

interface PastPhotosSectionProps {
  photos?: PastPhoto[];
  accent: string;
}

/** "from the last one" — photos from previous editions of the event.
 *  The trust block for repeat-IP events; hidden when admin adds none. */
export function PastPhotosSection({ photos, accent }: PastPhotosSectionProps) {
  if (!photos || photos.length === 0) return null;

  return (
    <div className="mb-7">
      <SectionLabel label="from the last one" sticker="proof it's real" stickerColor={accent} />
      <div className="-mx-5 flex gap-2.5 overflow-x-auto px-5 pb-1">
        {photos.map((photo) => (
          <figure key={photo.url} className="m-0 w-[210px] shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt={photo.caption || "a previous edition"}
              loading="lazy"
              className="block h-[150px] w-[210px] rounded-xl border border-sand object-cover"
            />
            {photo.caption && (
              <figcaption className="mt-1.5 px-0.5 font-hand text-[13px] leading-snug text-warm-brown">
                {photo.caption}
              </figcaption>
            )}
          </figure>
        ))}
      </div>
    </div>
  );
}
