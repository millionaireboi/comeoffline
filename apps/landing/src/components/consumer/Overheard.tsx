"use client";

import { useInView } from "@/hooks/useInView";
import { P } from "@/components/shared/P";
import { HandNote } from "@/components/shared/HandNote";

export function Overheard() {
  const [ref, vis] = useInView();
  const quotes = [
    { q: "wait, is this what parties used to feel like?", c: "dance floor, 9:15 PM", color: P.caramel },
    { q: "i haven't laughed this hard since 2019", c: "yapping room, 7:42 PM", color: P.coral },
    { q: "my cheeks hurt from smiling. is that normal?", c: "fries station, 8:00 PM", color: P.sage },
  ];
  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="relative overflow-hidden bg-cream px-5 py-14 sm:px-7 sm:py-18"
    >
      {/* Giant quote mark */}
      <div
        className="pointer-events-none absolute top-2.5 left-1.5 font-serif leading-none"
        style={{ fontSize: "clamp(120px, 25vw, 180px)", color: P.nearBlack + "03" }}
      >
        {"\u201C"}
      </div>

      <div className="relative z-[2] mx-auto max-w-full sm:max-w-[440px]">
        <span className="font-mono text-[10px] uppercase tracking-[3px] text-muted">
          overheard at come offline
        </span>
        <div className="mt-6 flex flex-col gap-4">
          {quotes.map((q, i) => (
            <div
              key={i}
              className="rounded-r-[14px] bg-white p-5 pl-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-600"
              style={{
                borderLeft: `3px solid ${q.color}`,
                opacity: vis ? 1 : 0,
                transform: vis ? "translateX(0)" : "translateX(-16px)",
                transitionDelay: `${i * 0.12}s`,
              }}
            >
              <p className="mb-1.5 font-serif text-[17px] font-normal italic leading-[1.4] text-near-black">
                &ldquo;{q.q}&rdquo;
              </p>
              <p className="m-0 font-mono text-[10px] text-muted">{q.c}</p>
            </div>
          ))}
        </div>
        <div
          className="mt-3 text-right transition-opacity duration-500"
          style={{ opacity: vis ? 1 : 0, transitionDelay: "0.5s" }}
        >
          <HandNote rotation={2} className="text-[13px]" style={{ color: P.muted + "60" }}>
            real quotes, real people
          </HandNote>
        </div>
      </div>
    </section>
  );
}
