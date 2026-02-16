"use client";

import { useInView } from "@/hooks/useInView";
import { P } from "@/components/shared/P";
import { CountUp } from "@/components/shared/CountUp";
import { ScribbleCircle } from "@/components/shared/Scribbles";

export function StatsStripe() {
  const [ref, vis] = useInView();
  const stats = [
    { n: "38", l: "humans, last event" },
    { n: "0", l: "phones used" },
    { n: "127", l: "mimosas downed" },
    { n: "95", l: "% show rate" },
  ];
  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="relative bg-near-black px-5 py-9 sm:px-7"
      style={{ borderTop: `1px solid ${P.muted}10`, borderBottom: `1px solid ${P.muted}10` }}
    >
      <div className="mx-auto grid max-w-[440px] grid-cols-4 gap-2 text-center">
        {stats.map((s, i) => (
          <div
            key={i}
            className="relative transition-opacity duration-500"
            style={{ opacity: vis ? 1 : 0, transitionDelay: `${i * 0.1}s` }}
          >
            <div
              className="font-mono text-[22px] font-medium"
              style={{ color: i === 1 ? P.sage : P.cream }}
            >
              <CountUp target={s.n} vis={vis} />
            </div>
            <div
              className="mt-1 font-mono text-[8px] uppercase leading-[1.3] tracking-[1px] text-muted"
            >
              {s.l}
            </div>
          </div>
        ))}
      </div>
      {/* Scribble circle around the "0" */}
      <div
        className="pointer-events-none absolute top-[22px] transition-opacity duration-500"
        style={{
          left: "calc(37.5% - 12px)",
          opacity: vis ? 0.5 : 0,
          transitionDelay: "0.5s",
        }}
      >
        <ScribbleCircle width={50} color={P.sage} />
      </div>
    </section>
  );
}
