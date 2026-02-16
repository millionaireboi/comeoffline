"use client";

import { useInView } from "@/hooks/useInView";
import { P } from "@/components/shared/P";
import { HandNote } from "@/components/shared/HandNote";
import { ScribbleCircle } from "@/components/shared/Scribbles";

export function BrandProof() {
  const [ref, vis] = useInView();

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="relative overflow-hidden bg-cream px-5 py-14 sm:px-7 sm:py-18"
    >
      <div className="relative z-[2] mx-auto max-w-full sm:max-w-[440px]">
        {/* Header */}
        <div
          className="mb-8 transition-all duration-700"
          style={{
            opacity: vis ? 1 : 0,
            transform: vis ? "translateY(0)" : "translateY(20px)",
            transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          <span className="font-mono text-[10px] uppercase tracking-[3px] text-muted">
            how we grow
          </span>
          <h2
            className="mt-3 font-serif font-normal text-near-black leading-[1.2]"
            style={{ fontSize: "clamp(24px, 5.5vw, 32px)" }}
          >
            zero ads. zero influencers.{" "}
            <span className="italic text-caramel">all word of mouth.</span>
          </h2>
          <p className="mt-3 font-sans text-sm leading-[1.8] text-warm-brown">
            our community grew to hundreds of members without a single paid promotion. every person
            here was vouched for by someone who&apos;s been to an event. that&apos;s the kind of
            trust you can&apos;t buy&mdash;but you can be part of.
          </p>
        </div>

        {/* Big stat card */}
        <div
          className="relative rounded-2xl p-8 text-center transition-all duration-800"
          style={{
            background: P.nearBlack,
            opacity: vis ? 1 : 0,
            transform: vis ? "translateY(0)" : "translateY(20px)",
            transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)",
            transitionDelay: "0.2s",
          }}
        >
          <div className="relative inline-block">
            <span
              className="font-mono text-[64px] font-medium leading-none"
              style={{ color: P.cream }}
            >
              100%
            </span>
            {/* ScribbleCircle overlay */}
            <div
              className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 transition-opacity duration-500"
              style={{ opacity: vis ? 0.5 : 0, transitionDelay: "0.6s" }}
            >
              <ScribbleCircle width={140} color={P.caramel} />
            </div>
          </div>
          <p
            className="mt-2 font-mono text-[10px] uppercase tracking-[2px]"
            style={{ color: P.muted + "60" }}
          >
            organic growth
          </p>
        </div>

        {/* HandNote */}
        <div
          className="mt-4 text-right transition-opacity duration-600"
          style={{ opacity: vis ? 1 : 0, transitionDelay: "0.5s" }}
        >
          <HandNote rotation={3} className="text-[13px]" style={{ color: P.caramel + "60" }}>
            not even a single boosted post. fr.
          </HandNote>
        </div>
      </div>
    </section>
  );
}
