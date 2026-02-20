import type { PickupPoint } from "@comeoffline/types";
import { SectionLabel } from "./SectionLabel";

interface PickupSectionProps {
  pickupPoints: PickupPoint[];
  accent: string;
  accentDark: string;
}

export function PickupSection({ pickupPoints, accent, accentDark }: PickupSectionProps) {
  if (pickupPoints.length === 0) return null;

  return (
    <div className="mb-7">
      <SectionLabel
        label="pickup & drop"
        sticker="we got you"
        stickerColor="#D4A574"
        stickerRotation={-1.5}
      />
      <div className="flex flex-col gap-2.5">
        {pickupPoints.map((p, i) => (
          <div
            key={i}
            className="flex items-center gap-3.5 rounded-[14px] border border-sand/40 bg-white p-4 shadow-[0_1px_3px_rgba(26,23,21,0.03)]"
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] text-base"
              style={{
                background: `linear-gradient(135deg, ${accent}15, ${accent}08)`,
              }}
            >
              🚘
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-sans text-[13px] font-medium text-near-black">
                {p.name}
              </p>
              <div className="flex items-center gap-3">
                <span className="font-mono text-[11px]" style={{ color: accentDark }}>
                  {p.time}
                </span>
                {p.capacity > 0 && (
                  <span className="font-mono text-[10px] text-muted">
                    {p.capacity} seats
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2.5 text-center font-mono text-[10px] italic text-muted/80">
        you&apos;ll pick your point after booking
      </p>
    </div>
  );
}
