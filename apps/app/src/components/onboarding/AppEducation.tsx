"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Noise } from "@/components/shared/Noise";
import { useAppStore } from "@/store/useAppStore";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";

/* ═══════════════════════════════════════════════
   EDUCATION CARD COMPONENTS
   ═══════════════════════════════════════════════ */

// Card: What is come offline (Direct PWA only)
function EduCardWhatIs() {
  return (
    <div className="px-2 text-center">
      <div className="mb-5 text-5xl leading-none" style={{ animation: "float 3s ease infinite" }}>{"\u{1F30D}"}</div>
      <p className="mb-4 font-mono text-[10px] uppercase tracking-[3px] text-caramel">what is come offline?</p>
      <h2 className="mb-3.5 font-serif text-[28px] font-normal leading-[1.25] text-cream">
        we throw curated, invite-only events in bangalore.
      </h2>
      <p className="mx-auto max-w-[300px] font-sans text-sm leading-[1.7] text-muted">
        every detail is planned — the venue, the food, the music, your ride. you just show up.
      </p>
    </div>
  );
}

// Card: Why come offline (Direct PWA only)
function EduCardWhy() {
  return (
    <div className="px-2 text-center">
      <div className="mb-5 text-5xl leading-none">{"\u{1F4A1}"}</div>
      <p className="mb-4 font-mono text-[10px] uppercase tracking-[3px] text-caramel">why come offline?</p>
      <h2 className="mb-3.5 font-serif text-[28px] font-normal leading-[1.25] text-cream">
        the best nights of your life won&apos;t happen on a screen.
      </h2>
      <p className="mx-auto max-w-[300px] font-sans text-sm leading-[1.7] text-muted">
        no awkward networking. no planning in group chats. just show up and meet people who actually want to be there.
      </p>
    </div>
  );
}

// Card: How it works (All paths)
function EduCardHowItWorks() {
  return (
    <div className="px-2 text-center">
      <div className="mb-5 text-5xl leading-none">{"\u{1F3AB}"}</div>
      <p className="mb-4 font-mono text-[10px] uppercase tracking-[3px] text-caramel">how it works</p>
      <h2 className="mb-3.5 font-serif text-[28px] font-normal leading-[1.25] text-cream">
        grab a ticket. we handle the rest.
      </h2>
      <p className="mx-auto max-w-[300px] font-sans text-sm leading-[1.7] text-muted">
        the venue&apos;s a secret until we reveal it. we assign your pickup point. just show up on time.
      </p>
    </div>
  );
}

// Card: The one rule — phones go dark (All paths)
function EduCardRules() {
  const [dimmed, setDimmed] = useState(false);
  useEffect(() => { const t = setTimeout(() => setDimmed(true), 600); return () => clearTimeout(t); }, []);
  return (
    <div
      className="px-2 text-center transition-all duration-1500"
      style={{ filter: dimmed ? "brightness(0.85)" : "brightness(1)" }}
    >
      <div className="mb-5 text-[56px] leading-none" style={{ animation: "moonGlow 3s ease infinite" }}>{"\u{1F319}"}</div>
      <p className="mb-4 font-mono text-[10px] uppercase tracking-[3px] text-caramel">the one rule</p>
      <h2 className="mb-3.5 font-serif text-[28px] font-normal leading-[1.25] text-cream">
        phones go away at the door.
      </h2>
      <p
        className="mx-auto max-w-[280px] font-sans text-sm leading-[1.7] text-muted transition-opacity duration-1000"
        style={{ opacity: dimmed ? 1 : 0, transitionDelay: "0.3s" }}
      >
        no filming. no scrolling. just real conversations.
      </p>
    </div>
  );
}

// Card: After the event (All paths)
function EduCardAfter() {
  return (
    <div className="px-2 text-center">
      {/* Polaroid stack */}
      <div className="relative mx-auto mb-6 h-[150px] w-[220px]">
        <div
          className="absolute left-5 top-2.5 w-[120px] rounded bg-white shadow-[0_4px_20px_rgba(0,0,0,0.2)]"
          style={{ padding: "8px 8px 24px", animation: "polaroidDrop 0.8s cubic-bezier(0.16,1,0.3,1) 0.2s both" }}
        >
          <div className="flex h-20 w-full items-center justify-center rounded-sm" style={{ background: "linear-gradient(135deg, rgba(219,188,172,0.38), rgba(212,131,107,0.5))" }}>
            <span className="text-[28px]">{"\u{1F485}"}</span>
          </div>
          <p className="mt-1.5 text-center font-hand text-[11px]" style={{ color: "#3D2E22" }}>best night ever</p>
        </div>
        <div
          className="absolute right-5 top-5 w-[120px] rounded bg-white shadow-[0_4px_20px_rgba(0,0,0,0.2)]"
          style={{ padding: "8px 8px 24px", animation: "polaroidDrop2 0.8s cubic-bezier(0.16,1,0.3,1) 0.6s both" }}
        >
          <div className="flex h-20 w-full items-center justify-center rounded-sm" style={{ background: "linear-gradient(135deg, rgba(212,165,116,0.38), rgba(230,169,126,0.5))" }}>
            <span className="text-[28px]">{"\u{1F942}"}</span>
          </div>
          <p className="mt-1.5 text-center font-hand text-[11px]" style={{ color: "#3D2E22" }}>no regrets</p>
        </div>
        <div
          className="animate-fadeIn absolute bottom-0 left-1/2 -translate-x-1/2 rounded-lg px-2.5 py-1"
          style={{ background: "#1A1715", border: "1px solid rgba(212,165,116,0.25)", animationDelay: "1s" }}
        >
          <span className="font-mono text-[10px] text-caramel" style={{ animation: "countdownTick 1s ease infinite" }}>47:59:58</span>
        </div>
      </div>

      <p className="mb-4 font-mono text-[10px] uppercase tracking-[3px] text-caramel">after the event</p>
      <h2 className="mb-3.5 font-serif text-[28px] font-normal leading-[1.25] text-cream">
        we capture the night. you find your people.
      </h2>
      <p className="mx-auto max-w-[300px] font-sans text-sm leading-[1.7] text-muted">
        photos, quotes, and a 48-hour window to reconnect with anyone you vibed with.
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   PROGRESS DOTS
   ═══════════════════════════════════════════════ */
function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex justify-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="h-2 rounded-full transition-all duration-400"
          style={{
            width: i === current ? "24px" : "8px",
            background: i <= current ? "#D4A574" : "rgba(155,142,130,0.19)",
          }}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MAIN APP EDUCATION COMPONENT
   ═══════════════════════════════════════════════ */
export function AppEducation() {
  const { user, setUser, onboardingSource } = useAppStore();
  const { getIdToken } = useAuth();

  // Restore onboardingSource from localStorage if needed
  useEffect(() => {
    if (!onboardingSource) {
      try {
        const saved = localStorage.getItem("co_onboarding_source");
        if (saved === "landing_code" || saved === "landing_chatbot" || saved === "direct_pwa") {
          useAppStore.getState().setOnboardingSource(saved);
        }
      } catch { /* ignore */ }
    }
  }, [onboardingSource]);

  const showBrandCards = onboardingSource === "direct_pwa";

  const cardComponents = showBrandCards
    ? [EduCardWhatIs, EduCardWhy, EduCardHowItWorks, EduCardRules, EduCardAfter]
    : [EduCardHowItWorks, EduCardRules, EduCardAfter];

  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<number | null>(null);

  // Auto-advance timer with progress bar
  useEffect(() => {
    setProgress(0);
    const start = Date.now();
    const duration = 4000;

    const tick = () => {
      const elapsed = Date.now() - start;
      const pct = Math.min((elapsed / duration) * 100, 100);
      setProgress(pct);
      if (elapsed < duration) {
        timerRef.current = requestAnimationFrame(tick);
      } else {
        if (step < cardComponents.length - 1) {
          setStep((s) => s + 1);
        }
      }
    };

    timerRef.current = requestAnimationFrame(tick);
    return () => {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
    };
  }, [step, cardComponents.length]);

  const goNext = useCallback(() => {
    if (timerRef.current) cancelAnimationFrame(timerRef.current);
    if (step < cardComponents.length - 1) {
      setStep((s) => s + 1);
    }
  }, [step, cardComponents.length]);

  const goPrev = useCallback(() => {
    if (timerRef.current) cancelAnimationFrame(timerRef.current);
    if (step > 0) {
      setStep((s) => s - 1);
    }
  }, [step]);

  const handleComplete = useCallback(async () => {
    if (timerRef.current) cancelAnimationFrame(timerRef.current);
    try {
      const token = await getIdToken();
      if (token) {
        apiFetch("/api/users/me", {
          method: "PUT",
          token,
          body: JSON.stringify({ has_completed_onboarding: true }),
        }).catch(() => { /* non-blocking */ });
      }
    } catch { /* non-blocking */ }

    // Update Zustand user so useStage transitions to feed
    if (user) {
      setUser({ ...user, has_completed_onboarding: true });
    }

    // Clear onboardingSource from localStorage
    try { localStorage.removeItem("co_onboarding_source"); } catch { /* ignore */ }
  }, [getIdToken, user, setUser]);

  const Card = cardComponents[step];
  const isLastCard = step === cardComponents.length - 1;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gate-black">
      <Noise opacity={0.05} />

      {/* Story-style progress bars */}
      <div className="relative z-[2] flex gap-1 px-5 pt-4">
        {cardComponents.map((_, i) => (
          <div key={i} className="h-[3px] flex-1 overflow-hidden rounded-sm" style={{ background: "rgba(155,142,130,0.13)" }}>
            <div
              className="h-full rounded-sm bg-caramel"
              style={{
                width: i < step ? "100%" : i === step ? `${progress}%` : "0%",
                transition: i < step ? "width 0.3s ease" : "none",
              }}
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

      {/* Bottom */}
      <div className="relative z-[4] px-7 pb-8">
        {isLastCard ? (
          <button
            onClick={handleComplete}
            className="w-full rounded-2xl border-none bg-cream py-[18px] font-sans text-base font-medium text-gate-black transition-all duration-300"
            style={{ cursor: "pointer" }}
          >
            {showBrandCards ? "let\u2019s go \u2192" : "show me what\u2019s coming up \u2192"}
          </button>
        ) : (
          <ProgressDots total={cardComponents.length} current={step} />
        )}
        <div className="mt-3 text-center">
          <button
            onClick={handleComplete}
            className="border-none bg-transparent font-mono text-[11px] tracking-[0.5px]"
            style={{ color: "rgba(155,142,130,0.38)", cursor: "pointer" }}
          >
            i&apos;ll figure it out {"\u2192"}
          </button>
        </div>
      </div>
    </div>
  );
}
