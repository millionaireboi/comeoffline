"use client";

import { useInView } from "@/hooks/useInView";
import { P } from "@/components/shared/P";
import { HandNote } from "@/components/shared/HandNote";

const comparisons = [
  {
    typical: "10,000 impressions",
    ours: "60 people who actually held your product",
  },
  {
    typical: "influencer story, swipe up",
    ours: "someone telling their friend about you at brunch next week",
  },
  {
    typical: "logo on a banner",
    ours: "an experience zone people line up for",
  },
  {
    typical: "CPM, CTR, ROAS",
    ours: "\u201Cwhere did you get that?\u201D conversations",
  },
];

export function WhyUs() {
  const [ref, vis] = useInView();

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="relative overflow-hidden bg-near-black px-5 py-14 sm:px-7 sm:py-18"
    >
      {/* Ghost number */}
      <div
        className="pointer-events-none absolute -top-5 -right-3 font-serif font-normal leading-none select-none"
        style={{
          fontSize: "clamp(140px, 30vw, 220px)",
          color: P.muted + "04",
        }}
      >
        03
      </div>

      <div className="relative z-[2] mx-auto max-w-full sm:max-w-[440px]">
        {/* Header */}
        <div
          className="mb-8 transition-opacity duration-500"
          style={{ opacity: vis ? 1 : 0 }}
        >
          <span className="font-mono text-[10px] uppercase tracking-[3px] text-muted">
            the difference
          </span>
          <h2
            className="mt-3 font-serif font-normal text-cream leading-[1.2]"
            style={{ fontSize: "clamp(24px, 5.5vw, 32px)" }}
          >
            what you&apos;re used to vs.{" "}
            <span className="italic" style={{ color: P.caramel }}>
              what we do.
            </span>
          </h2>
        </div>

        {/* Comparison rows */}
        <div className="flex flex-col gap-3">
          {comparisons.map((c, i) => (
            <div
              key={i}
              className="grid grid-cols-2 gap-2 transition-all duration-600"
              style={{
                opacity: vis ? 1 : 0,
                transform: vis ? "translateY(0)" : "translateY(16px)",
                transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)",
                transitionDelay: `${0.1 + i * 0.1}s`,
              }}
            >
              {/* Typical side */}
              <div
                className="rounded-xl p-4"
                style={{
                  background: P.cream + "04",
                  border: `1px solid ${P.cream}06`,
                }}
              >
                {i === 0 && (
                  <span
                    className="mb-2 block font-mono text-[8px] uppercase tracking-[1.5px]"
                    style={{ color: P.muted + "40" }}
                  >
                    typical
                  </span>
                )}
                <p
                  className="m-0 font-sans text-[12px] leading-[1.6]"
                  style={{
                    color: P.muted + "50",
                    textDecoration: "line-through",
                    textDecorationColor: P.muted + "25",
                  }}
                >
                  {c.typical}
                </p>
              </div>

              {/* Come offline side */}
              <div
                className="rounded-xl p-4"
                style={{
                  background: P.caramel + "08",
                  border: `1px solid ${P.caramel}15`,
                }}
              >
                {i === 0 && (
                  <span
                    className="mb-2 block font-mono text-[8px] uppercase tracking-[1.5px]"
                    style={{ color: P.caramel + "80" }}
                  >
                    come offline
                  </span>
                )}
                <p
                  className="m-0 font-sans text-[12px] leading-[1.6] font-medium text-cream"
                >
                  {c.ours}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* HandNote */}
        <div
          className="mt-6 text-center transition-opacity duration-600"
          style={{ opacity: vis ? 1 : 0, transitionDelay: "0.6s" }}
        >
          <HandNote rotation={-2} className="text-sm" style={{ color: P.caramel + "60" }}>
            brand love &gt; brand awareness
          </HandNote>
        </div>
      </div>
    </section>
  );
}
