import type { SeatingConfig } from "@comeoffline/types";
import { GhostWatermark } from "./GhostWatermark";

interface SeatingTabProps {
  seating: SeatingConfig;
  accent: string;
  accentDark: string;
}

export function SeatingTab({ seating, accent, accentDark }: SeatingTabProps) {
  if (seating.mode === "none") return null;

  return (
    <div>
      <p className="mb-1.5 font-sans text-sm leading-relaxed text-warm-brown">
        {seating.allow_choice
          ? "pick your section when you book."
          : "we'll seat you based on your vibe."}
      </p>
      <p className="mb-6 font-mono text-[10px] text-muted">
        {seating.mode === "sections"
          ? "section-based seating"
          : seating.mode === "seats"
            ? "assigned seats"
            : "mixed seating"}
      </p>

      {/* Seating map */}
      {seating.sections && seating.sections.length > 0 && (
        <div className="relative -mx-6 overflow-hidden bg-near-black px-6 py-7">
          <GhostWatermark
            text="seats"
            dark
            className="-top-2.5 left-2.5 text-[120px]"
          />

          {/* Stage indicator */}
          <div className="relative mb-6 text-center">
            <div
              className="inline-block rounded-b-[20px] border border-t-0 px-10 py-2.5"
              style={{
                background: `linear-gradient(135deg, ${accent}30, ${accentDark}30)`,
                borderColor: "rgba(155,142,130,0.15)",
              }}
            >
              <span className="font-mono text-[10px] uppercase tracking-[3px] text-cream">
                stage
              </span>
            </div>
            <div
              className="mx-auto mt-0 h-px w-[70%]"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(155,142,130,0.2), transparent)",
              }}
            />
            <span className="mt-2 block font-hand text-xs text-muted/60">
              choose wisely. or don&apos;t. we&apos;ll move you anyway.
            </span>
          </div>

          {/* Section cards */}
          <div className="flex flex-col gap-3">
            {seating.sections.map((sec, i) => (
              <div
                key={sec.id || i}
                className="relative overflow-hidden rounded-2xl border-[1.5px] bg-soft-black p-[18px_20px] transition-all duration-300"
                style={{
                  borderColor: (sec.color || accent) + "25",
                  boxShadow: `0 2px 12px ${(sec.color || accent)}08`,
                }}
              >
                {/* Left accent bar */}
                <div
                  className="absolute bottom-0 left-0 top-0 w-1 rounded-l-2xl"
                  style={{ background: sec.color || accent }}
                />
                {/* Radial glow */}
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background: `radial-gradient(circle at 80% 20%, ${(sec.color || accent)}06, transparent 60%)`,
                  }}
                />
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-xl text-xl"
                      style={{ background: (sec.color || accent) + "15" }}
                    >
                      {sec.emoji || "🪑"}
                    </div>
                    <div>
                      <p className="font-sans text-sm font-medium text-cream">{sec.name}</p>
                      {sec.description && (
                        <p className="font-mono text-[11px] text-muted">{sec.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-medium text-cream">{sec.capacity}</p>
                    <p className="font-mono text-[9px] text-muted">seats</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
