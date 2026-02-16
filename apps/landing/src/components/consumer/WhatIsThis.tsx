"use client";

import { useInView } from "@/hooks/useInView";
import { P } from "@/components/shared/P";
import { HandNote } from "@/components/shared/HandNote";
import { Polaroid } from "@/components/shared/Polaroid";

export function WhatIsThis() {
  const [ref, vis] = useInView();
  return (
    <section ref={ref as React.RefObject<HTMLElement>} className="relative overflow-hidden bg-cream px-5 pt-14 pb-8 sm:px-7 sm:pt-18 sm:pb-10">
      <div className="pointer-events-none absolute top-[30px] -right-10 h-40 w-40 rounded-full blur-[40px]" style={{ background: P.caramel + "05" }} />
      <div className="pointer-events-none absolute -top-10 -right-5 font-serif font-normal leading-none" style={{ fontSize: "clamp(120px, 28vw, 200px)", color: P.nearBlack + "03" }}>?</div>

      <div className="relative z-[2] mx-auto max-w-full sm:max-w-[440px]">
        <div className="transition-all duration-700" style={{ opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(20px)", transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)" }}>
          <span className="font-mono text-[10px] uppercase tracking-[3px] text-muted">so what is this</span>
          <h2 className="my-3 font-serif font-normal text-near-black leading-[1.2]" style={{ fontSize: "clamp(24px, 5.5vw, 32px)" }}>
            we throw events for people<br />who deserve better than<br /><span className="italic text-caramel">random nightlife.</span>
          </h2>
          <p className="relative font-sans text-sm leading-[1.8] text-warm-brown">
            come offline is an invite-only community in bangalore. we curate the people, the venue, and the experience. you show up, put your phone down, and actually connect with humans.
          </p>
          <div className="mt-1 text-right transition-opacity duration-600" style={{ opacity: vis ? 1 : 0, transitionDelay: "0.5s" }}>
            <HandNote rotation={3} className="text-[13px]" style={{ color: P.caramel + "60" }}>wild concept, we know {"\u2191"}</HandNote>
          </div>
        </div>
        <div className="mt-8 flex gap-3 overflow-x-auto pt-2.5 pb-5 transition-opacity duration-800" style={{ WebkitOverflowScrolling: "touch", opacity: vis ? 1 : 0, transitionDelay: "0.3s" }}>
          <Polaroid color={P.blush} rotation={-4} caption="galentines '26" emoji={"\u{1F485}"} />
          <Polaroid color={P.caramel} rotation={2} caption="yapping room" emoji={"\u{1F4AC}"} />
          <Polaroid color={P.sage} rotation={-2} caption="0 phones used" emoji={"\u{1F4F5}"} />
          <Polaroid color={P.lavender} rotation={5} caption="3am vibes" emoji={"\u{1F319}"} />
        </div>
      </div>
    </section>
  );
}
