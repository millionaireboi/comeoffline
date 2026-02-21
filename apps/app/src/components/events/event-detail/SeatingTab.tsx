import type { SeatingConfig } from "@comeoffline/types";
import { GhostWatermark } from "./GhostWatermark";

interface SeatingTabProps {
  seating: SeatingConfig;
  accent: string;
  accentDark: string;
}

export function SeatingTab({ seating, accent, accentDark }: SeatingTabProps) {
  if (seating.mode === "none") return null;

  // Custom spot layout — hybrid: compact map + card list
  if (seating.mode === "custom") {
    const spots = seating.spots || [];
    const tables = spots.filter((s) => (s.spot_type || "table") === "table");
    const fixtures = spots.filter((s) => s.spot_type === "fixture");
    const zones = spots.filter((s) => s.spot_type === "zone");
    const hasCoordinates = spots.some((s) => s.x != null && s.y != null);

    return (
      <div>
        <p className="mb-1.5 font-sans text-sm leading-relaxed text-warm-brown">
          {seating.allow_choice
            ? "pick your spot when you book."
            : "we'll find you the perfect spot."}
        </p>
        <p className="mb-6 font-mono text-[10px] text-muted">custom seating layout</p>

        {spots.length > 0 && (
          <div className="relative -mx-6 overflow-hidden bg-near-black px-6 py-7">
            <GhostWatermark
              text="spots"
              dark
              className="-top-2.5 left-2.5 text-[120px]"
            />

            {/* Compact mini map — for spatial orientation */}
            {hasCoordinates && (
              <div className="relative mb-5 h-[140px] w-full overflow-hidden rounded-xl bg-white/[0.03]">
                {/* Fixtures as landmarks */}
                {fixtures.map((f) => (
                  <div
                    key={f.id}
                    className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ left: `${f.x ?? 50}%`, top: `${f.y ?? 50}%` }}
                  >
                    <div className="flex items-center gap-0.5 rounded-full border border-dashed border-white/15 bg-white/[0.04] px-1.5 py-0.5">
                      <span className="text-[8px]">{f.emoji}</span>
                      <span className="font-mono text-[6px] text-muted/60">{f.name}</span>
                    </div>
                  </div>
                ))}
                {/* Zones as labels */}
                {zones.map((z) => (
                  <div
                    key={z.id}
                    className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ left: `${z.x ?? 50}%`, top: `${z.y ?? 50}%` }}
                  >
                    <span className="font-mono text-[6px] text-muted/40">{z.emoji} {z.name}</span>
                  </div>
                ))}
                {/* Table dots */}
                {tables.map((spot) => {
                  const availableSeats = spot.seats ? spot.seats.filter((s) => s.status === "available").length : 0;
                  const remaining = spot.seats && spot.seats.length > 0 ? availableSeats : spot.capacity - (spot.booked || 0);
                  const isFull = remaining <= 0;
                  return (
                    <div
                      key={spot.id}
                      className="absolute -translate-x-1/2 -translate-y-1/2"
                      style={{ left: `${spot.x ?? 50}%`, top: `${spot.y ?? 50}%`, opacity: isFull ? 0.3 : 1 }}
                    >
                      <div
                        className="flex h-4 w-4 items-center justify-center rounded-full text-[7px]"
                        style={{
                          background: isFull ? "rgba(60,60,60,0.4)" : accentDark + "40",
                          border: `1px solid ${isFull ? "rgba(80,80,80,0.3)" : accent + "60"}`,
                        }}
                      >
                        {spot.emoji || "\u{1FA91}"}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Card list — detailed info */}
            <div className="flex flex-col gap-2.5">
              {/* Fixture info badges */}
              {fixtures.length > 0 && (
                <div className="mb-1 flex flex-wrap gap-1.5">
                  {fixtures.map((f) => (
                    <div key={f.id} className="flex items-center gap-1 rounded-full border border-dashed border-white/10 px-2 py-0.5">
                      <span className="text-[10px]">{f.emoji}</span>
                      <span className="font-mono text-[8px] text-muted/60">{f.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Zone info badges */}
              {zones.length > 0 && (
                <div className="mb-1 flex flex-wrap gap-1.5">
                  {zones.map((z) => (
                    <div key={z.id} className="flex items-center gap-1 rounded-lg bg-white/[0.03] px-2 py-0.5">
                      <span className="text-[10px]">{z.emoji}</span>
                      <span className="font-mono text-[8px] text-muted/40">{z.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Table cards */}
              {tables.map((spot) => {
                const availableSeats = spot.seats ? spot.seats.filter((s) => s.status === "available").length : 0;
                const remaining = spot.seats && spot.seats.length > 0 ? availableSeats : spot.capacity - (spot.booked || 0);
                const isFull = remaining <= 0;

                return (
                  <div
                    key={spot.id}
                    className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3"
                    style={{ opacity: isFull ? 0.4 : 1 }}
                  >
                    {/* Emoji */}
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-base"
                      style={{ background: accent + "15" }}
                    >
                      {spot.emoji || "\u{1FA91}"}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className="font-sans text-sm font-medium text-cream">{spot.name}</p>
                      {spot.description && (
                        <p className="truncate font-mono text-[10px] text-muted">{spot.description}</p>
                      )}
                      {/* Seat availability dots */}
                      {spot.seats && spot.seats.length > 0 && (
                        <div className="mt-1 flex items-center gap-0.5">
                          {spot.seats.map((seat) => (
                            <div
                              key={seat.id}
                              className="h-2 w-2 rounded-full"
                              style={{
                                background: seat.status === "available" ? accent : "rgba(100,100,100,0.4)",
                                border: `1px solid ${seat.status === "available" ? accent : "rgba(80,80,80,0.3)"}`,
                              }}
                              title={`${seat.label} — ${seat.status === "available" ? "available" : "taken"}`}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Right — availability */}
                    <div className="shrink-0 text-right">
                      <p className="font-mono text-sm font-medium" style={{ color: isFull ? "#C75050" : accent }}>
                        {isFull ? "full" : remaining}
                      </p>
                      <p className="font-mono text-[8px] text-muted">
                        {isFull ? "" : spot.seats && spot.seats.length > 0 ? "seats left" : "left"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            {tables.some((s) => s.seats && s.seats.length > 0) && (
              <div className="mt-4 flex justify-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full" style={{ background: accent }} />
                  <span className="font-mono text-[8px] text-muted">available</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full" style={{ background: "rgba(100,100,100,0.4)" }} />
                  <span className="font-mono text-[8px] text-muted">taken</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

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
