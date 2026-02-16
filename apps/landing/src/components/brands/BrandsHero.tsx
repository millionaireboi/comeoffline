"use client";

import { useState, useEffect } from "react";
import { P } from "@/components/shared/P";
import { HandNote } from "@/components/shared/HandNote";
import { Sticker } from "@/components/shared/Sticker";
import { RotatingSeal } from "@/components/shared/RotatingSeal";
import { FilmGrain } from "@/components/shared/FilmGrain";

export function BrandsHero() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 300);
    const t2 = setTimeout(() => setPhase(2), 800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const scrollToForm = () => {
    document.getElementById("brand-form")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative min-h-screen overflow-hidden bg-gate-black">
      <FilmGrain />

      {/* Ghost text */}
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-serif font-normal select-none"
        style={{
          fontSize: "clamp(140px, 28vw, 260px)",
          color: P.muted + "04",
          letterSpacing: "-8px",
        }}
      >
        brands
      </div>

      {/* Rotating seal */}
      <div
        className="pointer-events-none absolute top-[60px] right-3 transition-opacity duration-1000"
        style={{ opacity: phase >= 2 ? 0.7 : 0, transitionDelay: "0.5s" }}
      >
        <RotatingSeal size={78} />
      </div>

      <div className="relative z-[2] mx-auto flex min-h-screen max-w-full flex-col justify-center px-5 pt-16 pb-12 sm:max-w-[540px] sm:px-6 sm:pt-20 sm:pb-15">
        {/* Eyebrow */}
        <div
          className="transition-all duration-700"
          style={{
            opacity: phase >= 1 ? 1 : 0,
            transform: phase >= 1 ? "translateY(0)" : "translateY(12px)",
            transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          <span
            className="font-mono text-[10px] uppercase tracking-[3px]"
            style={{ color: P.caramel }}
          >
            for brands
          </span>
        </div>

        {/* Headline */}
        <div
          className="mt-5 transition-all duration-800"
          style={{
            opacity: phase >= 1 ? 1 : 0,
            transform: phase >= 1 ? "translateY(0)" : "translateY(20px)",
            transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)",
            transitionDelay: "0.1s",
          }}
        >
          <h1
            className="font-serif font-normal text-cream leading-[1.15]"
            style={{ fontSize: "clamp(28px, 7vw, 44px)", letterSpacing: "-1.5px" }}
          >
            nobody here is going to skip your ad.{" "}
            <span className="italic" style={{ color: P.caramel }}>
              because there are no ads here.
            </span>
          </h1>
        </div>

        {/* Strikethrough */}
        <div
          className="mt-4 transition-all duration-700"
          style={{
            opacity: phase >= 2 ? 1 : 0,
            transform: phase >= 2 ? "translateY(0)" : "translateY(12px)",
            transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          <p className="font-sans text-[13px] leading-[1.7]" style={{ color: P.muted + "40" }}>
            <span
              style={{
                textDecoration: "line-through",
                textDecorationColor: P.highlight + "50",
              }}
            >
              another sponsorship deck
            </span>
          </p>
        </div>

        {/* Description */}
        <div
          className="transition-all duration-800"
          style={{
            opacity: phase >= 2 ? 1 : 0,
            transform: phase >= 2 ? "translateY(0)" : "translateY(16px)",
            transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)",
            transitionDelay: "0.15s",
          }}
        >
          <p
            className="mt-2 font-sans text-[14px] leading-[1.8]"
            style={{ color: P.muted + "70" }}
          >
            come offline events are invite-only, phone-free gatherings for a curated community in
            bangalore. your brand doesn&apos;t interrupt the experience&mdash;it becomes part of it.
          </p>
        </div>

        {/* CTA */}
        <div
          className="mt-8 transition-all duration-800"
          style={{
            opacity: phase >= 2 ? 1 : 0,
            transform: phase >= 2 ? "translateY(0)" : "translateY(16px)",
            transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)",
            transitionDelay: "0.25s",
          }}
        >
          <button
            onClick={scrollToForm}
            className="cursor-pointer rounded-full border-none bg-cream px-7 py-4 font-sans text-sm font-medium transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(250,246,240,0.15)]"
            style={{ color: P.gateBlack }}
          >
            let&apos;s talk &rarr;
          </button>
        </div>

        {/* HandNote */}
        <div
          className="mt-5 transition-opacity duration-600"
          style={{
            opacity: phase >= 2 ? 1 : 0,
            transitionDelay: "0.5s",
          }}
        >
          <HandNote rotation={-3} className="text-[13px]" style={{ color: P.caramel + "60" }}>
            we&apos;re picky about this too.
          </HandNote>
        </div>
      </div>

      {/* Stickers */}
      <Sticker
        text="no logo walls"
        rotation={-4}
        color={P.coral}
        top="18%"
        right="16px"
        visible={phase >= 2}
        delay={0.4}
      />
      <Sticker
        text="no banner ads"
        rotation={3}
        color={P.sage}
        bottom="22%"
        right="20px"
        visible={phase >= 2}
        delay={0.6}
      />
    </section>
  );
}
