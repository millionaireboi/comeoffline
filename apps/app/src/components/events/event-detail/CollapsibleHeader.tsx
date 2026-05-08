import { useState, useEffect, useCallback } from "react";
import { useAnalytics, EVENT_SHARED } from "@comeoffline/analytics";
import type { Event } from "@comeoffline/types";
import { formatDate } from "@comeoffline/ui";

interface CollapsibleHeaderProps {
  event: Event;
  onClose: () => void;
}

async function shareEvent(event: Event, track: (e: string, p?: Record<string, unknown>) => void) {
  const url = `https://comeoffline.com/events/${event.id}`;
  const shareData = { title: event.title, text: event.tagline, url };

  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share(shareData);
      track(EVENT_SHARED, { event_id: event.id, method: "native" });
    } catch {
      // User cancelled — no-op
    }
  } else {
    try {
      await navigator.clipboard.writeText(url);
      track(EVENT_SHARED, { event_id: event.id, method: "clipboard" });
    } catch {
      // Fallback
    }
  }
}

export function CollapsibleHeader({ event, onClose }: CollapsibleHeaderProps) {
  const { track } = useAnalytics();

  const hasCover = !!event.cover_url;
  const isVideo = event.cover_type === "video";
  const carouselImages = hasCover && !isVideo
    ? [event.cover_url!, ...(event.gallery_urls || [])]
    : [];
  const hasCarousel = carouselImages.length > 1;

  const [activeSlide, setActiveSlide] = useState(0);

  // Auto-advance carousel
  useEffect(() => {
    if (!hasCarousel) return;
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % carouselImages.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [hasCarousel, carouselImages.length]);

  const goToSlide = useCallback((idx: number) => setActiveSlide(idx), []);

  // Hero is sized to ~22% of viewport — image carries the title (Option A).
  // Typeset title is intentionally not duplicated below; the image's branding does that job.
  const HERO_HEIGHT = 170;
  const venueLine =
    event.venue_area || event.venue_name || (event.venue_reveal_date ? "venue revealed soon" : null);

  return (
    <div className="relative shrink-0 overflow-hidden">
      {/* Cover media */}
      {hasCover && (
        <div className="relative overflow-hidden" style={{ height: HERO_HEIGHT }}>
          {isVideo ? (
            <video
              src={event.cover_url}
              className="h-full w-full object-cover"
              style={{ objectPosition: event.cover_focus || "center" }}
              muted
              loop
              playsInline
              autoPlay
              preload="metadata"
            />
          ) : hasCarousel ? (
            <div className="relative h-full w-full overflow-hidden">
              <div
                className="flex h-full transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${activeSlide * 100}%)` }}
              >
                {carouselImages.map((url, i) => (
                  <img
                    key={url}
                    src={url}
                    alt={i === 0 ? event.title : `${event.title} ${i + 1}`}
                    className="h-full w-full shrink-0 object-cover"
                    style={{ objectPosition: event.cover_focus || "center" }}
                  />
                ))}
              </div>
              {/* Dots */}
              <div className="absolute bottom-2.5 left-1/2 flex -translate-x-1/2 gap-1.5">
                {carouselImages.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goToSlide(i)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === activeSlide
                        ? "w-4 bg-white"
                        : "w-1.5 bg-white/50"
                    }`}
                    aria-label={`Go to slide ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          ) : (
            <img
              src={event.cover_url}
              alt={event.title}
              className="h-full w-full object-cover"
              style={{ objectPosition: event.cover_focus || "center" }}
            />
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/15" />
          {/* Top buttons over cover */}
          <div className="absolute right-3 top-3 flex items-center gap-1.5">
            <button
              onClick={() => shareEvent(event, track)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/40 text-xs text-white backdrop-blur-sm"
              aria-label="Share event"
            >
              ↗
            </button>
            <button
              onClick={onClose}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/40 text-xs text-white backdrop-blur-sm"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Title block — pill + tagline + date/location row.
          Title itself is NOT duplicated here when there's a cover image; the cover carries it. */}
      <div
        className="relative px-5 pb-3 pt-3"
        style={{
          background: hasCover
            ? "#FAF6F0"
            : `linear-gradient(135deg, ${event.accent || "#D4A574"}40 0%, ${event.accent || "#D4A574"}15 50%, #FAF6F0 100%)`,
          borderBottom: `1px solid ${event.accent || "#D4A574"}20`,
        }}
      >
        {/* Top accent line (only when no cover) */}
        {!hasCover && (
          <div
            className="absolute left-0 right-0 top-0 h-[3px]"
            style={{
              background: `linear-gradient(90deg, ${event.accent || "#D4A574"}, ${event.accent_dark || "#B8845A"})`,
            }}
          />
        )}

        {/* Top row: tag pill + share/close (close only floats here when there's no cover) */}
        <div className="mb-2 flex items-center justify-between gap-2">
          <span
            className="rounded-full px-2.5 py-0.5 font-mono text-[9px] font-medium uppercase tracking-[1.5px]"
            style={{
              color: event.accent_dark || "#B8845A",
              background: (event.accent || "#D4A574") + "30",
            }}
          >
            {event.tag}
          </span>
          {!hasCover && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => shareEvent(event, track)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs text-warm-brown"
                style={{ background: "rgba(26,23,21,0.08)" }}
                aria-label="Share event"
              >
                ↗
              </button>
              <button
                onClick={onClose}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs text-warm-brown"
                style={{ background: "rgba(26,23,21,0.08)" }}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Title only renders when there's no cover — otherwise the cover carries it */}
        {!hasCover && (
          <h2 className="font-serif text-[24px] font-normal leading-[1.1] tracking-tight text-near-black">
            {event.title}
          </h2>
        )}

        {/* Tagline */}
        {event.tagline && (
          <p className={`${hasCover ? "" : "mt-1"} font-sans text-[13px] italic leading-snug text-warm-brown`}>
            {event.tagline}
          </p>
        )}

        {/* Date · location — single quiet row replacing the 4-chip block */}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-sans text-[12px] text-warm-brown">
          <span className="inline-flex items-center gap-1.5">
            <span className="text-[11px]">📅</span>
            <span>
              {formatDate(event.date)} · {event.time}
            </span>
          </span>
          {venueLine && (
            <>
              <span className="text-[10px] opacity-50">·</span>
              <span className="inline-flex items-center gap-1.5">
                <span className="text-[11px]">📍</span>
                <span className="truncate">{venueLine}</span>
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
