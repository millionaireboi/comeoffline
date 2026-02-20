import type { Event } from "@comeoffline/types";

interface CollapsibleHeaderProps {
  event: Event;
  scrolled: boolean;
  onClose: () => void;
  cheapestPrice?: number | null;
}

export function CollapsibleHeader({
  event,
  scrolled,
  onClose,
  cheapestPrice,
}: CollapsibleHeaderProps) {
  const spotsLeft = event.total_spots - event.spots_taken;

  const chips: Array<{ icon: string | null; text: string; accent?: boolean }> = [
    { icon: "📅", text: event.date },
    { icon: "🕒", text: event.time },
    { icon: "👥", text: `${spotsLeft}/${event.total_spots}` },
  ];

  if (cheapestPrice != null && cheapestPrice < Infinity) {
    chips.push({ icon: null, text: `₹${cheapestPrice}+`, accent: true });
  }

  return (
    <div
      className="relative shrink-0 overflow-hidden transition-[padding] duration-300"
      style={{
        padding: scrolled ? "10px 20px 8px" : "16px 20px 14px",
        background: `linear-gradient(135deg, ${event.accent || "#D4A574"}40 0%, ${event.accent || "#D4A574"}15 50%, #FAF6F0 100%)`,
        borderBottom: `1px solid ${event.accent || "#D4A574"}20`,
      }}
    >
      {/* Top accent line */}
      <div
        className="absolute left-0 right-0 top-0 h-[3px]"
        style={{
          background: `linear-gradient(90deg, ${event.accent || "#D4A574"}, ${event.accent_dark || "#B8845A"})`,
        }}
      />

      {/* Ghost emoji */}
      <div
        className="pointer-events-none absolute -top-[30px] -right-4 font-serif text-[130px] font-normal leading-[0.9] text-near-black transition-opacity duration-300"
        style={{ opacity: scrolled ? 0 : 0.03 }}
      >
        {event.emoji}
      </div>

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
          <button
            onClick={onClose}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs text-warm-brown"
            style={{ background: "rgba(26,23,21,0.08)" }}
          >
            ✕
          </button>
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
        <button
          onClick={onClose}
          className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full text-[11px] text-warm-brown"
          style={{ background: "rgba(26,23,21,0.08)" }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
