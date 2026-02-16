"use client";

import { useInView } from "@/hooks/useInView";
import { P } from "@/components/shared/P";
import { RotatingSeal } from "@/components/shared/RotatingSeal";
import { useChat } from "@/components/chat/ChatProvider";

export function FinalCTA() {
  const [ref, vis] = useInView();
  const { openChat } = useChat();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="relative overflow-hidden bg-cream px-5 pt-14 pb-12 text-center sm:px-7 sm:pt-18 sm:pb-15"
    >
      {/* Rotating seal */}
      <div
        className="pointer-events-none absolute top-5 left-5 transition-opacity duration-800"
        style={{ opacity: vis ? 0.3 : 0 }}
      >
        <RotatingSeal size={70} />
      </div>

      <div
        className="mx-auto max-w-[400px] transition-all duration-800"
        style={{
          opacity: vis ? 1 : 0,
          transform: vis ? "translateY(0)" : "translateY(24px)",
          transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <p
          className="mb-1.5 font-serif font-normal text-near-black leading-[1.3]"
          style={{ fontSize: "clamp(22px, 5vw, 28px)" }}
        >
          still here?
        </p>
        <p
          className="mb-7 font-serif font-normal leading-[1.3]"
          style={{ fontSize: "clamp(22px, 5vw, 28px)" }}
        >
          <span className="italic text-caramel">that says something about you.</span>
        </p>
        <div className="flex flex-wrap justify-center gap-2.5">
          <button
            onClick={scrollToTop}
            className="w-full cursor-pointer rounded-full border-none bg-near-black px-7 py-4 font-sans text-sm font-medium text-cream transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(26,23,21,0.15)] sm:w-auto"
          >
            i have a code
          </button>
          <button
            onClick={openChat}
            className="w-full cursor-pointer rounded-full bg-transparent px-7 py-4 font-sans text-sm font-medium text-near-black transition-all duration-300 hover:bg-caramel/10 sm:w-auto"
            style={{ border: `2px solid ${P.caramel}60` }}
          >
            prove yourself {"\u2192"}
          </button>
        </div>
        <p className="mt-4 font-hand text-sm text-muted">our bot has opinions. you&apos;ve been warned.</p>
      </div>
    </section>
  );
}
