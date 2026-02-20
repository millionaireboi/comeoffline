import type { PostBookingSection } from "@comeoffline/types";
import { SectionLabel } from "./SectionLabel";
import { GhostWatermark } from "./GhostWatermark";

interface ScheduleSectionProps {
  sections: PostBookingSection[];
  accent: string;
  accentDark: string;
}

export function ScheduleSection({ sections, accent, accentDark }: ScheduleSectionProps) {
  // Only show schedule-type sections pre-booking
  const scheduleSections = sections.filter((s) => s.type === "schedule");
  if (scheduleSections.length === 0) return null;

  return (
    <>
      {scheduleSections.map((sec, si) => (
        <div
          key={si}
          className="relative -mx-6 mb-7 overflow-hidden bg-near-black px-6 py-7"
        >
          <GhostWatermark
            text={String(si + 2).padStart(2, "0")}
            dark
            className="text-[160px] -top-2.5 right-3"
          />
          <SectionLabel
            label={sec.title}
            icon="📋"
            sticker="loosely. very loosely."
            stickerColor={accent}
            stickerRotation={-1}
            dark
          />
          <div className="flex flex-col">
            {sec.items.map((item, ii) => (
              <div
                key={ii}
                className="relative flex items-start gap-3.5 py-2.5"
                style={{
                  borderBottom:
                    ii < sec.items.length - 1
                      ? "1px solid rgba(155,142,130,0.12)"
                      : "none",
                }}
              >
                {/* Timeline dot + line */}
                <div className="flex w-3 shrink-0 flex-col items-center pt-1.5">
                  <div
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{
                      background: ii === 0 ? accentDark : accent + "40",
                      border: ii === 0 ? "none" : `1.5px solid ${accent}60`,
                    }}
                  />
                  {ii < sec.items.length - 1 && (
                    <div className="mt-1 min-h-4 flex-1" style={{ width: "1.5px", background: "rgba(155,142,130,0.15)" }} />
                  )}
                </div>
                <span className="font-sans text-[13px] leading-relaxed text-cream/80">
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
