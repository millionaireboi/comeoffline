"use client";

import { P } from "@/components/shared/P";

export function MarqueeSection() {
  const items = "invite only \u2022 real people \u2022 no phones \u2022 curated vibes \u2022 bangalore \u2022 earn your spot \u2022 secret venues \u2022 ";
  return (
    <div className="overflow-hidden bg-cream py-3.5" style={{ borderBottom: `1px solid ${P.sand}` }}>
      <div className="flex animate-marquee whitespace-nowrap">
        {[0, 1].map((i) => (
          <span key={i} className="font-mono text-[10px] uppercase tracking-[3px]" style={{ color: P.muted + "70" }}>
            {items.repeat(5)}
          </span>
        ))}
      </div>
    </div>
  );
}
