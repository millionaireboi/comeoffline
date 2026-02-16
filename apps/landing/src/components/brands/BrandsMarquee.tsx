"use client";

import { P } from "@/components/shared/P";

export function BrandsMarquee() {
  const items =
    "curated audience \u2022 real moments \u2022 no ad fatigue \u2022 phones away \u2022 bangalore \u2022 invite-only community \u2022 brand love > brand awareness \u2022 ";
  return (
    <div
      className="overflow-hidden bg-cream py-3.5"
      style={{ borderBottom: `1px solid ${P.sand}` }}
    >
      <div className="flex animate-marquee whitespace-nowrap">
        {[0, 1].map((i) => (
          <span
            key={i}
            className="font-mono text-[10px] uppercase tracking-[3px]"
            style={{ color: P.muted + "70" }}
          >
            {items.repeat(5)}
          </span>
        ))}
      </div>
    </div>
  );
}
