"use client";

import { useInView } from "@/hooks/useInView";
import { P } from "@/components/shared/P";

export function Events() {
  const [ref, vis] = useInView();
  const events = [
    {
      emoji: "\u{1F4F5}",
      title: "No Phone House Party",
      date: "Mar 8, 2026",
      tag: "phone-free",
      spots: "28 left of 60",
      accent: P.caramel,
      pct: 53,
    },
    {
      emoji: "\u{1F90D}",
      title: "No Color Holi",
      date: "Mar 14, 2026",
      tag: "all white",
      spots: "45 left of 80",
      accent: P.sage,
      pct: 44,
    },
  ];
  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="relative bg-near-black px-5 py-14 sm:px-7 sm:py-18"
    >
      <div className="mx-auto max-w-full sm:max-w-[440px]">
        <div className="mb-6 transition-opacity duration-500" style={{ opacity: vis ? 1 : 0 }}>
          <span className="font-mono text-[10px] uppercase tracking-[3px] text-muted">coming up</span>
          <h2
            className="mt-3 font-serif font-normal text-cream leading-[1.2]"
            style={{ fontSize: "clamp(24px, 5.5vw, 32px)" }}
          >
            next events
          </h2>
        </div>
        <div className="flex flex-col gap-3">
          {events.map((ev, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-[18px] transition-all duration-600"
              style={{
                background: P.cream + "05",
                border: `1px solid ${P.cream}08`,
                opacity: vis ? 1 : 0,
                transform: vis ? "translateY(0)" : "translateY(16px)",
                transitionDelay: `${i * 0.12}s`,
              }}
            >
              <div
                className="h-[3px]"
                style={{ background: `linear-gradient(90deg, ${ev.accent}, ${ev.accent}40)` }}
              />
              <div className="p-5">
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{ev.emoji}</span>
                    <div>
                      <div className="font-sans text-[15px] font-medium text-cream">{ev.title}</div>
                      <div className="font-mono text-[10px] text-muted">{ev.date}</div>
                    </div>
                  </div>
                  <span
                    className="rounded-full font-mono text-[9px] uppercase tracking-[1px]"
                    style={{
                      color: ev.accent,
                      background: ev.accent + "15",
                      padding: "4px 10px",
                    }}
                  >
                    {ev.tag}
                  </span>
                </div>
                {/* Fill bar */}
                <div>
                  <div className="mb-1 flex justify-between">
                    <span className="font-mono text-[10px] text-muted">{ev.spots}</span>
                    <span className="font-mono text-[10px]" style={{ color: ev.accent }}>
                      {ev.pct}%
                    </span>
                  </div>
                  <div
                    className="h-[3px] overflow-hidden rounded-[2px]"
                    style={{ background: P.cream + "10" }}
                  >
                    <div
                      className="h-full rounded-[2px] transition-all"
                      style={{
                        width: vis ? `${ev.pct}%` : "0%",
                        background: ev.accent,
                        transitionDuration: "1.2s",
                        transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)",
                        transitionDelay: `${0.3 + i * 0.15}s`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-5 text-center font-hand text-sm" style={{ color: P.muted + "50" }}>
          you need to be in to RSVP {"\u{1F512}"}
        </p>
      </div>
    </section>
  );
}
