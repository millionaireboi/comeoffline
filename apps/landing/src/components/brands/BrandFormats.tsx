"use client";

import { useInView } from "@/hooks/useInView";
import { P } from "@/components/shared/P";
import { HandNote } from "@/components/shared/HandNote";
import { PassportStamp } from "@/components/shared/PassportStamp";

const formats = [
  {
    icon: "\uD83C\uDFAA",
    title: "experience zone takeover",
    desc: "design an interactive moment inside our event. a tasting corner, a maker station, a sensory room\u2014whatever fits your brand story. guests walk in because they want to, not because a banner told them to.",
    note: "this is what people actually remember",
  },
  {
    icon: "\uD83C\uDF81",
    title: "curated product moments",
    desc: "we weave your product into the night naturally. a welcome drink from your brand, a take-home that actually means something, a discovery moment that feels intentional\u2014not transactional.",
    note: null,
  },
  {
    icon: "\uD83E\uDD1D",
    title: "co-created events",
    desc: "we build the entire event around your brand. from concept to curation, it\u2019s yours\u2014but with our community, our taste, and our production quality. your launch, our world.",
    note: "the one brands come back for",
  },
];

export function BrandFormats() {
  const [ref, vis] = useInView();

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="relative overflow-hidden bg-near-black px-5 py-14 sm:px-7 sm:py-18"
    >
      {/* Ghost number */}
      <div
        className="pointer-events-none absolute -top-5 -left-3 font-serif font-normal leading-none select-none"
        style={{
          fontSize: "clamp(140px, 30vw, 220px)",
          color: P.muted + "04",
        }}
      >
        02
      </div>

      {/* PassportStamp */}
      <div
        className="pointer-events-none absolute top-10 right-5 transition-opacity duration-800"
        style={{ opacity: vis ? 0.4 : 0, transitionDelay: "0.5s" }}
      >
        <PassportStamp text={"BRAND\nAPPROVED"} color={P.caramel} rotation={-8} />
      </div>

      <div className="relative z-[2] mx-auto max-w-full sm:max-w-[440px]">
        {/* Header */}
        <div
          className="mb-8 transition-opacity duration-500"
          style={{ opacity: vis ? 1 : 0 }}
        >
          <span className="font-mono text-[10px] uppercase tracking-[3px] text-muted">
            how we work together
          </span>
          <h2
            className="mt-3 font-serif font-normal text-cream leading-[1.2]"
            style={{ fontSize: "clamp(24px, 5.5vw, 32px)" }}
          >
            not sponsorships.{" "}
            <span className="italic" style={{ color: P.caramel }}>
              partnerships.
            </span>
          </h2>
        </div>

        {/* Format cards */}
        <div className="flex flex-col gap-3">
          {formats.map((f, i) => (
            <div key={i} className="relative">
              <div
                className="flex items-start gap-4 rounded-2xl p-5 transition-all duration-600"
                style={{
                  background: P.cream + "05",
                  border: `1px solid ${P.cream}08`,
                  opacity: vis ? 1 : 0,
                  transform: vis ? "translateY(0)" : "translateY(16px)",
                  transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)",
                  transitionDelay: `${0.1 + i * 0.1}s`,
                }}
              >
                <span className="mt-0.5 shrink-0 text-2xl">{f.icon}</span>
                <div>
                  <span className="mb-1 block font-sans text-[15px] font-semibold text-cream">
                    {f.title}
                  </span>
                  <p className="m-0 font-sans text-[13px] leading-[1.6] text-muted">{f.desc}</p>
                </div>
              </div>
              {f.note && (
                <div
                  className="pointer-events-none absolute -right-1 -bottom-2.5 transition-opacity duration-500"
                  style={{
                    opacity: vis ? 0.7 : 0,
                    transitionDelay: `${0.4 + i * 0.15}s`,
                  }}
                >
                  <HandNote rotation={3} className="text-[11px]" style={{ color: P.caramel + "70" }}>
                    ^ {f.note}
                  </HandNote>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Bottom text */}
        <div
          className="mt-10 transition-all duration-700"
          style={{
            opacity: vis ? 1 : 0,
            transform: vis ? "translateY(0)" : "translateY(12px)",
            transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)",
            transitionDelay: "0.5s",
          }}
        >
          <p className="font-sans text-[13px] leading-[1.8]" style={{ color: P.muted + "60" }}>
            no logo walls. no &lsquo;powered by.&rsquo; your brand becomes part of the story, not
            the footnote.
          </p>
        </div>
      </div>
    </section>
  );
}
