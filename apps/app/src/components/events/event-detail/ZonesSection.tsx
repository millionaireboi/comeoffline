import type { Zone } from "@comeoffline/types";
import { SectionLabel } from "./SectionLabel";
import { GhostWatermark } from "./GhostWatermark";

interface ZonesSectionProps {
  zones: Zone[];
  accent: string;
  accentDark: string;
}

export function ZonesSection({ zones, accent, accentDark }: ZonesSectionProps) {
  if (zones.length === 0) return null;

  return (
    <div className="relative -mx-6 mb-7 overflow-hidden bg-near-black px-6 py-7">
      <GhostWatermark text="01" dark className="text-[180px] -top-2.5 right-3" />
      <SectionLabel
        label="what's inside"
        sticker="the good stuff ↓"
        stickerColor={accent}
        dark
      />
      <div className="grid grid-cols-2 gap-2.5">
        {zones.map((z, i) => (
          <div
            key={i}
            className="rounded-2xl border border-muted/[0.12] bg-soft-black p-4 transition-all duration-300"
            style={{ animationDelay: `${i * 0.08}s` }}
          >
            <span className="mb-2.5 block text-2xl">{z.icon}</span>
            <p className="mb-0.5 font-sans text-[13px] font-medium text-cream">
              {z.name}
            </p>
            <p className="font-mono text-[10px] leading-snug text-muted">{z.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
