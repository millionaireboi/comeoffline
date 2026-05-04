"use client";

import { useState, useCallback, useRef } from "react";
import { Noise } from "@/components/shared/Noise";
import { useAppStore } from "@/store/useAppStore";

const SIGN_EMOJIS = [
  "\u{1F412}", // bandar (monkey)
  "\u{1F415}", // labrador (dog)
  "\u{1F408}‍⬛", // cat (black cat)
  "\u{1F426}", // mynah (bird)
  "\u{1F43E}", // redpanda (paws — placeholder)
  "\u{1F99A}", // peacock
];

/* ═══════════════════════════════════════════════
   CARDS
   ═══════════════════════════════════════════════ */

function CardConcept() {
  return (
    <div className="px-2 text-center">
      {/* Two shapes drawing together — abstract connection visual */}
      <div className="relative mx-auto mb-7 h-[140px] w-[200px]">
        <div
          className="absolute left-[14%] top-[25%] h-16 w-16 rounded-full"
          style={{
            background: "radial-gradient(circle at 30% 30%, rgba(212,165,116,0.6), rgba(212,165,116,0.15))",
            animation: "shapeFloatLeft 4s ease-in-out infinite",
            border: "1px solid rgba(212,165,116,0.3)",
          }}
        />
        <div
          className="absolute right-[14%] top-[25%] h-16 w-16 rounded-full"
          style={{
            background: "radial-gradient(circle at 70% 30%, rgba(168,181,160,0.6), rgba(168,181,160,0.15))",
            animation: "shapeFloatRight 4s ease-in-out infinite",
            border: "1px solid rgba(168,181,160,0.3)",
          }}
        />
        <div
          className="absolute left-1/2 top-1/2 h-px w-[60%] -translate-x-1/2 -translate-y-1/2"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(155,142,130,0.4), transparent)",
            animation: "connectPulse 4s ease-in-out infinite",
          }}
        />
      </div>

      <p className="mb-4 font-mono text-[10px] uppercase tracking-[3px] text-caramel">concept</p>
      <h2 className="mb-3 font-serif text-[28px] font-normal leading-[1.25] text-cream">
        the best parts of our events aren&apos;t the food or the venue.
      </h2>
      <p className="mx-auto mb-3 max-w-[300px] font-serif text-[20px] italic leading-[1.4] text-cream/85">
        it&apos;s finding people you actually click with.
      </p>
      <p className="mx-auto max-w-[300px] font-sans text-sm leading-[1.7] text-muted">
        we help you find them with one quick personality quiz.
      </p>
    </div>
  );
}

function CardYourSign() {
  return (
    <div className="px-2 text-center">
      {/* Floating sign emojis — reused from previous offer screen */}
      <div className="mb-7 flex justify-center gap-3 text-[32px]">
        {SIGN_EMOJIS.map((e, i) => (
          <span
            key={i}
            style={{
              animation: `offerFloat ${3 + i * 0.4}s ease infinite ${i * 0.15}s`,
              opacity: 0.85,
            }}
          >
            {e}
          </span>
        ))}
      </div>

      <p className="mb-4 font-mono text-[10px] uppercase tracking-[3px] text-caramel">your sign</p>
      <h2 className="mb-3 font-serif text-[28px] font-normal leading-[1.25] text-cream">
        one of six come offline signs.
      </h2>
      <p className="mx-auto mb-4 max-w-[300px] font-sans text-[13px] tracking-[0.5px] text-sand">
        bandar &middot; labrador &middot; cat &middot; mynah &middot; redpanda &middot; peacock
      </p>
      <p className="mx-auto max-w-[300px] font-sans text-sm leading-[1.7] text-muted">
        a vibe profile that captures how you connect. we use it to surface people who match your energy.
      </p>
    </div>
  );
}

function CardTheQuiz() {
  return (
    <div className="px-2 text-center">
      {/* Progress preview animation */}
      <div className="mx-auto mb-7 w-[220px]">
        <div
          className="mb-2.5 flex justify-between font-mono text-[10px] tracking-[1px]"
          style={{ color: "rgba(155,142,130,0.5)" }}
        >
          <span>1</span>
          <span>2</span>
          <span>3</span>
          <span>4</span>
          <span>5</span>
          <span>6</span>
          <span>7</span>
        </div>
        <div className="h-[5px] w-full overflow-hidden rounded-full" style={{ background: "rgba(155,142,130,0.13)" }}>
          <div
            className="h-full rounded-full bg-caramel"
            style={{
              animation: "quizFill 2.6s ease-in-out infinite",
            }}
          />
        </div>
        <p
          className="mt-3 font-mono text-[10px] uppercase tracking-[2px]"
          style={{ color: "rgba(155,142,130,0.5)" }}
        >
          progress
        </p>
      </div>

      <p className="mb-4 font-mono text-[10px] uppercase tracking-[3px] text-caramel">the quiz</p>
      <h2 className="mb-3 font-serif text-[28px] font-normal leading-[1.25] text-cream">
        7 questions. 2 minutes.
      </h2>
      <p className="mx-auto mb-4 max-w-[300px] font-serif text-[18px] italic leading-[1.4] text-cream/85">
        no wrong answers — just yours.
      </p>
      <p className="mx-auto max-w-[300px] font-sans text-sm leading-[1.7] text-muted">
        your sign shows up on your profile. it&apos;s how the community starts to know you.
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════ */

export function SignQuizOffer({ onStartQuiz }: { onStartQuiz: () => void }) {
  const setStage = useAppStore((s) => s.setStage);
  const cards = [CardConcept, CardYourSign, CardTheQuiz];
  const [step, setStep] = useState(0);
  const isLast = step === cards.length - 1;

  // Swipe gesture support
  const touchStartX = useRef(0);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && step < cards.length - 1) setStep((s) => s + 1);
      else if (diff < 0 && step > 0) setStep((s) => s - 1);
    }
  }, [step, cards.length]);

  const goNext = () => {
    if (step < cards.length - 1) setStep((s) => s + 1);
  };
  const goPrev = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const skipForNow = () => {
    // If they have an active ticket/RSVP, drop them on countdown — they're mid-purchase journey.
    // Otherwise back to the feed. Either way the existing banner reminds them.
    const { activeTicket, activeRsvp } = useAppStore.getState();
    setStage(activeTicket || activeRsvp ? "countdown" : "feed");
  };

  const Card = cards[step];

  return (
    <div
      className="relative flex min-h-screen flex-col overflow-hidden bg-gate-black"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <Noise opacity={0.05} />

      <style>{`
        @keyframes offerFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes shapeFloatLeft { 0%,100% { transform: translateX(0); } 50% { transform: translateX(8px); } }
        @keyframes shapeFloatRight { 0%,100% { transform: translateX(0); } 50% { transform: translateX(-8px); } }
        @keyframes connectPulse { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
        @keyframes quizFill {
          0% { width: 0%; }
          80% { width: 100%; }
          100% { width: 100%; }
        }
      `}</style>

      {/* Story-style progress bars */}
      <div className="relative z-[2] flex gap-1 px-5 pt-4">
        {cards.map((_, i) => (
          <div
            key={i}
            className="h-[3px] flex-1 overflow-hidden rounded-sm"
            style={{ background: "rgba(155,142,130,0.13)" }}
          >
            <div
              className="h-full rounded-sm bg-caramel transition-all duration-300"
              style={{ width: i <= step ? "100%" : "0%" }}
            />
          </div>
        ))}
      </div>

      {/* Tap zones for prev/next */}
      <div className="absolute inset-0 z-[3] flex">
        <div className="flex-1 cursor-pointer" onClick={goPrev} />
        <div className="flex-[2] cursor-pointer" onClick={goNext} />
      </div>

      {/* Card content */}
      <div
        key={step}
        className="animate-cardScale relative z-[2] flex flex-1 flex-col justify-center px-5 py-10"
      >
        <Card />
      </div>

      {/* Bottom CTA */}
      <div className="relative z-[4] px-7" style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom, 2rem))" }}>
        {isLast ? (
          <button
            onClick={onStartQuiz}
            className="w-full rounded-2xl border-none bg-caramel py-[18px] font-sans text-base font-medium text-gate-black transition-all duration-300"
            style={{ cursor: "pointer" }}
          >
            find my sign {"→"}
          </button>
        ) : (
          <button
            onClick={goNext}
            className="w-full rounded-2xl border-none py-[18px] font-sans text-base font-medium transition-all duration-300"
            style={{ background: "#FAF6F0", color: "#0E0D0B", cursor: "pointer" }}
          >
            next {"→"}
          </button>
        )}
        <div className="mt-3 text-center">
          <button
            onClick={skipForNow}
            className="border-none bg-transparent font-mono text-[11px] tracking-[0.5px]"
            style={{ color: "rgba(155,142,130,0.38)", cursor: "pointer" }}
          >
            i&apos;ll do this later {"→"}
          </button>
        </div>
      </div>
    </div>
  );
}
