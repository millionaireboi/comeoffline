"use client";

import { useInView } from "@/hooks/useInView";
import { P } from "@/components/shared/P";
import { HandNote } from "@/components/shared/HandNote";
import { PassportStamp } from "@/components/shared/PassportStamp";
import { ScribbleArrow } from "@/components/shared/Scribbles";

export function HowItWorks() {
  const [ref, vis] = useInView();
  const steps = [
    { num: "01", title: "get invited", desc: "someone vouches for you, or you charm our chatbot", icon: "\u{1F39F}\uFE0F", note: null },
    { num: "02", title: "RSVP + wait", desc: "grab your spot. venue stays secret until we say so.", icon: "\u23F3", note: "the anticipation is part of it" },
    { num: "03", title: "show up, go dark", desc: "we pick you up. phone goes away. real life begins.", icon: "\u{1F319}", note: null },
    { num: "04", title: "connect after", desc: "next morning: memories, mutual connections, vouch codes.", icon: "\u{1F91D}", note: "the morning after hits different" },
  ];
  return (
    <section ref={ref as React.RefObject<HTMLElement>} className="relative overflow-hidden bg-near-black px-5 py-14 sm:px-7 sm:py-18">
      <div className="pointer-events-none absolute top-10 right-5 transition-opacity duration-800" style={{ opacity: vis ? 0.4 : 0, transitionDelay: "0.5s" }}>
        <PassportStamp text={"VIBE\nCHECKED"} color={P.sage} rotation={-12} />
      </div>
      <div className="pointer-events-none absolute bottom-[50px] right-[35px] transition-opacity duration-800" style={{ opacity: vis ? 0.3 : 0, transitionDelay: "0.7s" }}>
        <PassportStamp text={"PHONE\nFREE"} color={P.coral} rotation={8} />
      </div>

      <div className="mx-auto max-w-full sm:max-w-[440px]">
        <div className="mb-8 transition-opacity duration-500" style={{ opacity: vis ? 1 : 0 }}>
          <span className="font-mono text-[10px] uppercase tracking-[3px] text-muted">how it works</span>
          <h2 className="mt-3 font-serif font-normal text-cream leading-[1.2]" style={{ fontSize: "clamp(24px, 5.5vw, 32px)" }}>
            four steps to<br /><span className="italic text-caramel">actually living.</span>
          </h2>
        </div>
        <div className="flex flex-col gap-3">
          {steps.map((s, i) => (
            <div key={i} className="relative">
              <div className="flex items-start gap-4 rounded-2xl p-5 transition-all duration-600" style={{ background: P.cream + "05", border: `1px solid ${P.cream}08`, opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(16px)", transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)", transitionDelay: `${0.1 + i * 0.1}s` }}>
                <span className="mt-0.5 shrink-0 text-2xl">{s.icon}</span>
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="font-mono text-[10px] tracking-[1px] text-caramel">{s.num}</span>
                    <span className="font-sans text-[15px] font-semibold text-cream">{s.title}</span>
                  </div>
                  <p className="m-0 font-sans text-[13px] leading-[1.6] text-muted">{s.desc}</p>
                </div>
              </div>
              {s.note && (
                <div className="pointer-events-none absolute -right-1 -bottom-2.5 transition-opacity duration-500" style={{ opacity: vis ? 0.7 : 0, transitionDelay: `${0.4 + i * 0.15}s` }}>
                  <HandNote rotation={3} className="text-[11px]" style={{ color: P.caramel + "70" }}>^ {s.note}</HandNote>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-6 text-center transition-opacity duration-600" style={{ opacity: vis ? 1 : 0, transitionDelay: "0.6s" }}>
          <ScribbleArrow className="mx-auto rotate-90" />
          <HandNote rotation={-1} className="mt-1 block text-sm" style={{ color: P.muted + "50" }}>that&apos;s it. seriously.</HandNote>
        </div>
      </div>
    </section>
  );
}
