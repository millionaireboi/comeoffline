import { useState, useEffect, useCallback } from "react";
import { useAnalytics, EVENT_SHARED } from "@comeoffline/analytics";
import type { Event } from "@comeoffline/types";
import { formatDate } from "@comeoffline/ui";

interface CollapsibleHeaderProps {
  event: Event;
  scrolled: boolean;
  onClose: () => void;
  cheapestPrice?: number | null;
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

export function CollapsibleHeader({
  event,
  scrolled,
  onClose,
  cheapestPrice,
}: CollapsibleHeaderProps) {
  const { track } = useAnalytics();
  const spotsLeft = event.total_spots - event.spots_taken;

  const chips: Array<{ icon: string | null; text: string; accent?: boolean }> = [
    { icon: "📅", text: formatDate(event.date) },
    { icon: "🕒", text: event.time },
    { icon: "👥", text: `${spotsLeft}/${event.total_spots}` },
  ];

  if (cheapestPrice != null && cheapestPrice < Infinity) {
    chips.push({ icon: null, text: `₹${cheapestPrice}+`, accent: true });
  }

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

  return (
    <div className="relative shrink-0 overflow-hidden">
      {/* Cover media */}
      {hasCover && (
        <div
          className="relative overflow-hidden transition-all duration-300"
          style={{
            maxHeight: scrolled ? "0px" : "200px",
            opacity: scrolled ? 1 : 1,
          }}
        >
          {isVideo ? (
            <video
              src={event.cover_url}
              className="h-[200px] w-full object-cover"
              style={{ objectPosition: event.cover_focus || "center" }}
              muted
              loop
              playsInline
              autoPlay
              preload="metadata"
            />
          ) : hasCarousel ? (
            <div className="relative h-[200px] w-full overflow-hidden">
              <div
                className="flex h-full transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${activeSlide * 100}%)` }}
              >
                {carouselImages.map((url, i) => (
                  <img
                    key={url}
                    src={url}
                    alt={i === 0 ? event.title : `${event.title} ${i + 1}`}
                    className="h-[200px] w-full shrink-0 object-cover"
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
              className="h-[200px] w-full object-cover"
              style={{ objectPosition: event.cover_focus || "center" }}
            />
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />
          {/* Top buttons over cover */}
          <div className="absolute right-3 top-3 flex items-center gap-1.5">
            <button
              onClick={() => shareEvent(event, track)}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black/40 text-xs text-white backdrop-blur-sm"
              aria-label="Share event"
            >
              ↗
            </button>
            <button
              onClick={onClose}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black/40 text-xs text-white backdrop-blur-sm"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div
        className="relative transition-[padding] duration-300"
        style={{
          padding: scrolled ? "10px 20px 8px" : "16px 20px 14px",
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

        {/* Ghost emoji (only when no cover) */}
        {!hasCover && (
          <div
            className="pointer-events-none absolute -top-[30px] -right-4 font-serif text-[130px] font-normal leading-[0.9] text-near-black transition-opacity duration-300"
            style={{ opacity: scrolled ? 0 : 0.03 }}
          >
            {event.emoji}
          </div>
        )}

        {/* EXPANDED state */}
        <div
          className="overflow-hidden transition-all duration-300"
          style={{
            maxHeight: scrolled ? "0px" : "200px",
            opacity: scrolled ? 0 : 1,
          }}
        >
          {/* Top row: tag + close */}
          <div className="mb-2.5 flex items-center justify-between">
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
                >
                  ✕
                </button>
              </div>
            )}
          </div>

        {/* Title + Emoji */}
        <div className="mb-2.5 flex items-center justify-between gap-2.5">
          <div className="min-w-0 flex-1">
            <h2 className="font-serif text-[28px] font-normal leading-[1.1] tracking-tight text-near-black">
              {event.title}
            </h2>
            <p className="mt-0.5 truncate font-sans text-[13px] italic leading-snug text-warm-brown">
              {event.tagline}
            </p>
          </div>
          <span className="shrink-0 text-[34px] leading-none">{event.emoji}</span>
        </div>

        {/* Info chips — horizontally scrollable */}
        <div className="-mx-5 flex gap-1.5 overflow-x-auto px-5">
          {chips.map((chip, ci) => (
            <div
              key={ci}
              className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1"
              style={{
                background: chip.accent
                  ? (event.accent_dark || "#B8845A") + "12"
                  : "#fff",
                boxShadow: chip.accent
                  ? "none"
                  : "0 1px 2px rgba(26,23,21,0.04)",
              }}
            >
              {chip.icon && <span className="text-[10px]">{chip.icon}</span>}
              <span
                className="text-[11px]"
                style={{
                  fontFamily: chip.accent
                    ? "var(--font-dm-mono), monospace"
                    : "var(--font-dm-sans), sans-serif",
                  fontWeight: chip.accent ? 600 : 500,
                  color: chip.accent
                    ? event.accent_dark || "#B8845A"
                    : "#2C2520",
                }}
              >
                {chip.text}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* COLLAPSED state — single row */}
      <div
        className="flex items-center justify-between gap-2.5 overflow-hidden transition-all duration-300"
        style={{
          maxHeight: scrolled ? "40px" : "0px",
          opacity: scrolled ? 1 : 0,
        }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className="shrink-0 text-[22px] leading-none">{event.emoji}</span>
          <h2 className="truncate font-serif text-xl font-normal leading-[1.1] text-near-black">
            {event.title}
          </h2>
          <span
            className="shrink-0 rounded-full px-2 py-0.5 font-mono text-[8px] uppercase tracking-[1px]"
            style={{
              color: event.accent_dark || "#B8845A",
              background: (event.accent || "#D4A574") + "30",
            }}
          >
            {event.tag}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => shareEvent(event, track)}
            className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full text-[11px] text-warm-brown"
            style={{ background: "rgba(26,23,21,0.08)" }}
            aria-label="Share event"
          >
            ↗
          </button>
          <button
            onClick={onClose}
            className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full text-[11px] text-warm-brown"
            style={{ background: "rgba(26,23,21,0.08)" }}
          >
            ✕
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
