"use client";

import { useState, useEffect } from "react";
import { Noise } from "@/components/shared/Noise";
import { useAppStore } from "@/store/useAppStore";

const SIGN_EMOJIS = ["\u{1F412}", "\u{1F415}", "\u{1F408}\u200D\u2B1B", "\u{1F426}", "\u{1F43E}", "\u{1F99A}"];

export function SignQuizOffer({ onStartQuiz }: { onStartQuiz: () => void }) {
  const { setStage } = useAppStore();
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 300);
    const t2 = setTimeout(() => setPhase(2), 800);
    const t3 = setTimeout(() => setPhase(3), 1400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gate-black px-8">
      <Noise opacity={0.05} />
      <style>{`
        @keyframes offerFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes offerShimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        @keyframes offerSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      {/* Spinning CO mark */}
      <div
        className="absolute right-6 top-10 flex h-16 w-16 items-center justify-center rounded-full transition-opacity duration-600"
        style={{
          border: "1px solid rgba(155,142,130,0.19)",
          opacity: phase >= 1 ? 1 : 0,
          animation: phase >= 1 ? "offerSpin 20s linear infinite" : "none",
        }}
      >
        <span className="font-mono text-[9px] tracking-[1px] text-muted">CO</span>
      </div>

      {/* Floating emojis */}
      <div
        className="relative z-[2] mb-8 flex gap-4 text-[28px] transition-opacity duration-1000"
        style={{ opacity: phase >= 1 ? 1 : 0 }}
      >
        {SIGN_EMOJIS.map((e, i) => (
          <span
            key={i}
            className="transition-opacity duration-500"
            style={{
              animation: phase >= 1 ? `offerFloat ${3 + i * 0.4}s ease infinite ${i * 0.2}s` : "none",
              opacity: phase >= 1 ? 0.7 : 0,
              transitionDelay: `${i * 0.1}s`,
            }}
          >
            {e}
          </span>
        ))}
      </div>

      {/* Label */}
      <div
        className="relative z-[2] transition-all duration-800"
        style={{
          opacity: phase >= 1 ? 1 : 0,
          transform: phase >= 1 ? "translateY(0)" : "translateY(20px)",
        }}
      >
        <p className="mb-4 text-center font-mono text-[10px] uppercase tracking-[3px] text-muted">
          come offline presents
        </p>
      </div>

      {/* Title */}
      <div
        className="relative z-[2] mb-8 text-center transition-all duration-800"
        style={{
          opacity: phase >= 2 ? 1 : 0,
          transform: phase >= 2 ? "translateY(0)" : "translateY(24px)",
        }}
      >
        <h1 className="mb-2 font-serif text-[44px] font-normal leading-[1.1] text-cream">
          know your
          <br />
          <span
            className="italic"
            style={{
              background: "linear-gradient(90deg, #D4A574, #E6A97E, #D4A574)",
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              animation: "offerShimmer 3s linear infinite",
            }}
          >
            comeoffline sign
          </span>
        </h1>
      </div>

      {/* Description */}
      <div
        className="relative z-[2] mb-12 text-center transition-opacity duration-800"
        style={{ opacity: phase >= 2 ? 1 : 0, transitionDelay: "0.3s" }}
      >
        <p className="max-w-[280px] font-sans text-sm leading-[1.7] text-muted">
          helps us match you with the right people at events.
          <br />
          <span className="text-sand">7 questions. takes 2 mins.</span>
        </p>
      </div>

      {/* CTAs */}
      <div
        className="relative z-[2] flex flex-col items-center gap-4 transition-all duration-600"
        style={{
          opacity: phase >= 3 ? 1 : 0,
          transform: phase >= 3 ? "translateY(0)" : "translateY(16px)",
        }}
      >
        <button
          onClick={onStartQuiz}
          className="rounded-full bg-caramel px-12 py-4 font-sans text-[15px] font-medium text-gate-black transition-all duration-200 active:scale-95"
        >
          find out {"\u2192"}
        </button>
        <button
          onClick={() => setStage("feed")}
          className="rounded-full bg-transparent px-6 py-2.5 font-mono text-[12px] tracking-[0.5px] transition-colors"
          style={{ color: "rgba(155,142,130,0.6)", border: "1px solid rgba(155,142,130,0.2)" }}
        >
          i&apos;ll do this later
        </button>
      </div>

    </div>
  );
}
