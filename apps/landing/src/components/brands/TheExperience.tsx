"use client";

import { useInView } from "@/hooks/useInView";
import { P } from "@/components/shared/P";
import { HandNote } from "@/components/shared/HandNote";
import { Polaroid } from "@/components/shared/Polaroid";

export function TheExperience() {
  const [ref, vis] = useInView();

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="relative overflow-hidden bg-cream px-5 pt-14 pb-8 sm:px-7 sm:pt-18 sm:pb-10"
    >
      {/* Ghost number */}
      <div
        className="pointer-events-none absolute -top-5 -right-3 font-serif font-normal leading-none select-none"
        style={{
          fontSize: "clamp(140px, 30vw, 220px)",
          color: P.nearBlack + "03",
        }}
      >
        01
      </div>

      <div className="relative z-[2] mx-auto max-w-full sm:max-w-[440px]">
        <div
          className="transition-all duration-700"
          style={{
            opacity: vis ? 1 : 0,
            transform: vis ? "translateY(0)" : "translateY(20px)",
            transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          {/* Eyebrow */}
          <span className="font-mono text-[10px] uppercase tracking-[3px] text-muted">
            the experience
          </span>

          {/* Headline */}
          <h2
            className="my-3 font-serif font-normal text-near-black leading-[1.2]"
            style={{ fontSize: "clamp(24px, 5.5vw, 32px)" }}
          >
            picture a room where nobody&apos;s looking at a screen.{" "}
            <span className="italic text-caramel">
              now picture your brand in that room.
            </span>
          </h2>

          {/* Description */}
          <p className="relative font-sans text-sm leading-[1.8] text-warm-brown">
            every come offline event is a phone-free, invite-only gathering of 40-80 people who
            actually want to be present. no scrolling, no stories, no distractions. just real
            conversations and real experiences.
          </p>

          {/* HandNote */}
          <div
            className="mt-1 text-right transition-opacity duration-600"
            style={{ opacity: vis ? 1 : 0, transitionDelay: "0.5s" }}
          >
            <HandNote rotation={3} className="text-[13px]" style={{ color: P.caramel + "60" }}>
              that&apos;s a come offline. event &uarr;
            </HandNote>
          </div>
        </div>

        {/* Polaroid carousel */}
        <div
          className="mt-8 flex gap-3 overflow-x-auto pt-2.5 pb-5 transition-opacity duration-800"
          style={{
            WebkitOverflowScrolling: "touch",
            opacity: vis ? 1 : 0,
            transitionDelay: "0.3s",
          }}
        >
          <Polaroid color={P.blush} rotation={-4} caption="secret venue reveal" emoji={"\uD83D\uDD10"} />
          <Polaroid color={P.caramel} rotation={2} caption="phones in a box" emoji={"\uD83D\uDCF5"} />
          <Polaroid color={P.sage} rotation={-2} caption="curated guest list" emoji={"\u2728"} />
          <Polaroid color={P.lavender} rotation={5} caption="experience zones" emoji={"\uD83C\uDFAA"} />
        </div>
      </div>
    </section>
  );
}
