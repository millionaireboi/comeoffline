"use client";

import { useInView } from "@/hooks/useInView";
import { P } from "@/components/shared/P";
import { HandNote } from "@/components/shared/HandNote";
import { PassportStamp } from "@/components/shared/PassportStamp";

export function GoldenTicket() {
  const [ref, vis] = useInView();
  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="relative overflow-hidden bg-cream px-5 py-14 sm:px-7 sm:py-18"
    >
      <div
        className="pointer-events-none absolute -bottom-5 -left-10 h-[200px] w-[200px] rounded-full blur-[50px]"
        style={{ background: P.caramel + "04" }}
      />
      <div className="mx-auto max-w-full sm:max-w-[440px]">
        <div className="mb-7 transition-opacity duration-500" style={{ opacity: vis ? 1 : 0 }}>
          <span className="font-mono text-[10px] uppercase tracking-[3px] text-muted">the venue</span>
          <h2
            className="mt-3 font-serif font-normal text-near-black leading-[1.2]"
            style={{ fontSize: "clamp(24px, 5.5vw, 32px)" }}
          >
            you don&apos;t know where
            <br />
            until <span className="italic text-caramel">we say so.</span>
          </h2>
        </div>
        {/* Ticket */}
        <div
          className="relative overflow-hidden rounded-[20px] p-8 transition-all duration-800"
          style={{
            background: `linear-gradient(135deg, ${P.caramel}15, ${P.deepCaramel}08, ${P.caramel}12)`,
            border: `1px solid ${P.caramel}20`,
            opacity: vis ? 1 : 0,
            transform: vis ? "translateY(0) rotate(0.5deg)" : "translateY(20px) rotate(-1deg)",
            transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)",
            transitionDelay: "0.2s",
          }}
        >
          {/* Washi tape strips */}
          <div
            className="absolute -top-1 left-5 h-[18px] w-[50px] rounded-[2px]"
            style={{
              background: P.sage + "30",
              transform: "rotate(-5deg)",
              border: `0.5px solid ${P.sage}20`,
            }}
          />
          <div
            className="absolute -top-0.5 right-6 h-[18px] w-10 rounded-[2px]"
            style={{
              background: P.blush + "30",
              transform: "rotate(3deg)",
              border: `0.5px solid ${P.blush}20`,
            }}
          />
          {/* Perforated edge */}
          <div
            className="absolute top-0 bottom-0 left-0 w-px"
            style={{ borderLeft: `2px dashed ${P.caramel}20` }}
          />

          <div className="pointer-events-none absolute -top-5 -right-5 text-[100px] opacity-5">{"\u{1F39F}\uFE0F"}</div>
          <span
            className="font-mono text-[9px] uppercase tracking-[2px]"
            style={{ color: P.deepCaramel }}
          >
            your golden ticket
          </span>
          <h3 className="mt-3 mb-1.5 font-serif text-[28px] font-normal text-near-black">The Courtyard</h3>
          <p className="mb-4 font-sans text-sm text-warm-brown">Indiranagar, Bangalore</p>
          <div className="flex gap-6">
            <div>
              <span className="font-mono text-[9px] uppercase tracking-[1px] text-muted">date</span>
              <p className="mt-0.5 font-sans text-[13px] font-medium text-near-black">Feb 14, 2026</p>
            </div>
            <div>
              <span className="font-mono text-[9px] uppercase tracking-[1px] text-muted">pickup</span>
              <p className="mt-0.5 font-sans text-[13px] font-medium text-near-black">4:15 PM</p>
            </div>
          </div>
          {/* Scratch hint */}
          <div
            className="mt-5 inline-block rounded-[10px] px-3.5 py-2"
            style={{ background: P.caramel + "10" }}
          >
            <HandNote rotation={-1} className="text-xs" style={{ color: P.deepCaramel + "80" }}>
              {"\u{1F448}"} you scratch to reveal this in-app
            </HandNote>
          </div>
          {/* Stamp overlay */}
          <div className="pointer-events-none absolute right-4 bottom-4 opacity-25">
            <PassportStamp text={"VENUE\nREVEALED"} color={P.deepCaramel} rotation={12} />
          </div>
        </div>
      </div>
    </section>
  );
}
