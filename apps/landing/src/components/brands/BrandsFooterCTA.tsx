"use client";

import { useInView } from "@/hooks/useInView";
import { P } from "@/components/shared/P";

export function BrandsFooterCTA() {
  const [ref, vis] = useInView();

  const scrollToForm = () => {
    document.getElementById("brand-form")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="relative overflow-hidden bg-near-black px-5 py-14 text-center sm:px-7 sm:py-18"
    >
      <div
        className="mx-auto max-w-[420px] transition-all duration-800"
        style={{
          opacity: vis ? 1 : 0,
          transform: vis ? "translateY(0)" : "translateY(24px)",
          transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <p
          className="mb-7 font-serif font-normal text-cream leading-[1.3]"
          style={{ fontSize: "clamp(22px, 5vw, 28px)" }}
        >
          your customers are tired of being marketed to.{" "}
          <span className="italic" style={{ color: P.caramel }}>
            give them a moment instead.
          </span>
        </p>
        <button
          onClick={scrollToForm}
          className="cursor-pointer rounded-full border-none bg-cream px-7 py-4 font-sans text-sm font-medium transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(250,246,240,0.15)]"
          style={{ color: P.gateBlack }}
        >
          get in touch &rarr;
        </button>
      </div>
    </section>
  );
}
