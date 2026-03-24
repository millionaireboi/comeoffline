"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Noise } from "@/components/shared/Noise";
import { useAppStore } from "@/store/useAppStore";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";
import {
  SIGN_KEYS,
  SIGNS,
  COMPAT_MATRIX,
  QUESTIONS,
  QUIZ_HINTS,
  getWinnerSign,
  getMatchLabel,
  type SignKey,
} from "@comeoffline/types";

/* ═══════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════ */
type QuizScreen = "quiz" | "reveal" | "result";

interface SignQuizProps {
  onComplete: () => void;
  mode?: "onboarding" | "pre_checkout";
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */
export function SignQuiz({ onComplete, mode = "onboarding" }: SignQuizProps) {
  const { user, setUser } = useAppStore();
  const { getIdToken } = useAuth();

  const [screen, setScreen] = useState<QuizScreen>("quiz");
  const [currentQ, setCurrentQ] = useState(0);
  const [scores, setScores] = useState<Record<SignKey, number>>(
    Object.fromEntries(SIGN_KEYS.map((k) => [k, 0])) as Record<SignKey, number>,
  );
  const [selected, setSelected] = useState<number | null>(null);
  const [animating, setAnimating] = useState(false);
  const [resultSign, setResultSign] = useState<SignKey | null>(null);
  const [revealPhase, setRevealPhase] = useState(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Cleanup all pending timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout);
    };
  }, []);

  const handleSelect = useCallback(
    (optIndex: number) => {
      if (animating) return;
      setSelected(optIndex);
      setAnimating(true);

      const opt = QUESTIONS[currentQ].opts[optIndex];
      const newScores = { ...scores };
      Object.entries(opt.scores).forEach(([sign, pts]) => {
        newScores[sign as SignKey] += pts;
      });
      setScores(newScores);

      timersRef.current.push(setTimeout(() => {
        if (currentQ < QUESTIONS.length - 1) {
          setSelected(null);
          setCurrentQ(currentQ + 1);
          setAnimating(false);
        } else {
          const winner = getWinnerSign(newScores);
          setResultSign(winner);
          setScreen("reveal");
          setRevealPhase(0);
          timersRef.current.push(setTimeout(() => setRevealPhase(1), 400));
          timersRef.current.push(setTimeout(() => setRevealPhase(2), 1200));
          timersRef.current.push(setTimeout(() => setRevealPhase(3), 2000));
          timersRef.current.push(setTimeout(() => {
            setScreen("result");
            setAnimating(false);
          }, 2800));
        }
      }, 600));
    },
    [animating, currentQ, scores],
  );

  const handleFinish = useCallback(async () => {
    if (!resultSign) return;
    const signData = SIGNS[resultSign];

    // Update Zustand immediately
    if (user) {
      setUser({
        ...user,
        sign: resultSign,
        sign_scores: scores,
        sign_label: signData.name,
        sign_emoji: signData.emoji,
        sign_color: signData.color,
        quiz_completed_at: new Date().toISOString(),
      });
    }

    // Persist to API (fire-and-forget)
    try {
      const token = await getIdToken();
      if (token) {
        apiFetch("/api/users/me", {
          method: "PUT",
          token,
          body: JSON.stringify({
            sign: resultSign,
            sign_scores: scores,
            sign_label: signData.name,
            sign_emoji: signData.emoji,
            sign_color: signData.color,
            quiz_completed_at: new Date().toISOString(),
          }),
        }).catch(() => {});
      }
    } catch {
      /* non-blocking */
    }

    onComplete();
  }, [resultSign, scores, user, setUser, getIdToken, onComplete]);

  const sign = resultSign ? SIGNS[resultSign] : null;

  return (
    <div className={`relative flex min-h-screen flex-col bg-gate-black ${screen === "result" ? "overflow-y-auto" : "overflow-hidden"}`}>
      <Noise opacity={0.05} />
      <style>{`
        @keyframes quizFadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes quizSlideIn { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes quizPopIn { 0% { opacity: 0; transform: scale(0.3) rotate(-10deg); } 60% { transform: scale(1.1) rotate(2deg); } 100% { opacity: 1; transform: scale(1) rotate(0deg); } }
        @keyframes quizStampIn { 0% { opacity: 0; transform: scale(2.5) rotate(-15deg); } 40% { opacity: 1; transform: scale(0.95) rotate(2deg); } 60% { transform: scale(1.05) rotate(-1deg); } 100% { transform: scale(1) rotate(0deg); } }
        @keyframes quizFillBar { from { width: 0%; } }
        @keyframes quizFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        .quiz-opt { transition: all 0.2s ease; }
        .quiz-opt:active { transform: scale(0.98); }
      `}</style>

      {/* ─── QUIZ QUESTIONS ─── */}
      {screen === "quiz" && (
        <div className="relative z-[2] flex min-h-screen flex-col px-6">
          {/* Progress */}
          <div className="pb-8 pt-6">
            {/* Back to previous question */}
            {currentQ > 0 && (
              <button
                onClick={() => {
                  if (!animating) {
                    setSelected(null);
                    setCurrentQ((q) => q - 1);
                  }
                }}
                className="mb-4 font-mono text-[11px] text-muted transition-colors hover:text-cream"
              >
                &larr; back
              </button>
            )}
            <div className="mb-5 flex items-center gap-3">
              <div className="h-0.5 flex-1 overflow-hidden rounded-full" style={{ background: "rgba(155,142,130,0.19)" }}>
                <div
                  className="h-full rounded-full bg-caramel transition-all duration-500"
                  style={{ width: `${((currentQ + 1) / QUESTIONS.length) * 100}%` }}
                />
              </div>
              <span className="font-mono text-[11px] text-muted">
                {currentQ + 1}/{QUESTIONS.length}
              </span>
            </div>

            <div key={currentQ} style={{ animation: "quizFadeUp 0.4s ease" }}>
              <p className="mb-3 font-mono text-[9px] uppercase tracking-[3px] text-caramel">
                question {currentQ + 1}
              </p>
              <h2 className="font-serif text-[26px] font-normal leading-[1.3] text-cream">
                {QUESTIONS[currentQ].q}
              </h2>
            </div>
          </div>

          {/* Options */}
          <div key={`o-${currentQ}`} className="flex flex-1 flex-col gap-3">
            {QUESTIONS[currentQ].opts.map((opt, i) => {
              const isSel = selected === i;
              return (
                <button
                  key={i}
                  className="quiz-opt flex items-start gap-3.5 rounded-[14px] text-left"
                  onClick={() => handleSelect(i)}
                  style={{
                    padding: "16px 18px",
                    background: isSel ? "rgba(212,165,116,0.08)" : "rgba(155,142,130,0.05)",
                    border: `1px solid ${isSel ? "#D4A574" : "rgba(155,142,130,0.1)"}`,
                    animation: `quizSlideIn 0.35s ease ${i * 0.08}s both`,
                  }}
                >
                  <span className="min-w-[20px] font-mono text-xs font-medium" style={{ color: isSel ? "#D4A574" : "rgba(155,142,130,0.5)" }}>
                    {["a", "b", "c", "d"][i]}.
                  </span>
                  <span className="font-sans text-sm leading-[1.5]" style={{ color: isSel ? "#FAF6F0" : "#E8DDD0" }}>
                    {opt.text}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Hint */}
          <div className="py-8 text-center">
            <p className="font-hand text-base" style={{ color: "rgba(155,142,130,0.5)" }}>
              {QUIZ_HINTS[currentQ]}
            </p>
          </div>
        </div>
      )}

      {/* ─── REVEAL ANIMATION ─── */}
      {screen === "reveal" && sign && (
        <div className="relative z-[2] flex min-h-screen flex-col items-center justify-center p-10">
          <div
            className="absolute transition-opacity duration-400"
            style={{ opacity: revealPhase < 2 ? 1 : 0 }}
          >
            <p className="font-mono text-xs tracking-[3px] text-caramel uppercase" style={{ animation: "pulse 1s ease infinite" }}>
              reading your vibe...
            </p>
          </div>
          <div
            className="text-center"
            style={{
              opacity: revealPhase >= 2 ? 1 : 0,
              animation: revealPhase >= 2 ? "quizPopIn 0.6s cubic-bezier(0.16,1,0.3,1)" : "none",
            }}
          >
            <div className="mb-4 text-[80px]" style={{ animation: revealPhase >= 2 ? "quizFloat 3s ease infinite" : "none" }}>
              {sign.emoji}
            </div>
            <p
              className="mb-2 font-mono text-[10px] uppercase tracking-[3px] text-muted transition-opacity duration-500"
              style={{ opacity: revealPhase >= 3 ? 1 : 0 }}
            >
              you are
            </p>
            <h1
              className="font-serif text-[40px] font-normal italic transition-all duration-600"
              style={{
                color: sign.color,
                opacity: revealPhase >= 3 ? 1 : 0,
                transform: revealPhase >= 3 ? "translateY(0)" : "translateY(12px)",
              }}
            >
              {sign.name}
            </h1>
          </div>
        </div>
      )}

      {/* ─── RESULT CARD ─── */}
      {screen === "result" && sign && resultSign && (
        <div className="relative z-[2] flex flex-col px-6 pb-8 pt-10" style={{ animation: "quizFadeUp 0.6s ease" }}>
          {/* Stamp */}
          <div className="mb-6 text-center">
            <div
              className="relative mx-auto inline-block rounded-2xl px-8 py-5"
              style={{ border: `2px solid ${sign.color}`, animation: "quizStampIn 0.5s cubic-bezier(0.16,1,0.3,1)" }}
            >
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-gate-black px-3">
                <span className="font-mono text-[8px] uppercase tracking-[3px]" style={{ color: sign.color }}>
                  your sign is
                </span>
              </div>
              <div className="mb-2 text-5xl">{sign.emoji}</div>
              <h1 className="font-serif text-[34px] font-normal italic" style={{ color: sign.color }}>
                {sign.name}
              </h1>
            </div>
            <p className="mt-4 font-hand text-lg text-sand">{sign.tagline}</p>
          </div>

          {/* Trait pills */}
          <div className="mb-5 flex flex-wrap justify-center gap-2">
            {[
              { l: "energy", v: sign.energy },
              { l: "vibe", v: sign.vibe },
              { l: "superpower", v: sign.superpower },
            ].map((t) => (
              <div
                key={t.l}
                className="rounded-full px-3.5 py-2"
                style={{ background: `${sign.color}10`, border: `1px solid ${sign.color}25` }}
              >
                <span className="font-mono text-[8px] uppercase tracking-[1px]" style={{ color: "rgba(155,142,130,0.56)" }}>
                  {t.l}:{" "}
                </span>
                <span className="font-sans text-[11px] font-medium" style={{ color: sign.color }}>
                  {t.v}
                </span>
              </div>
            ))}
          </div>

          {/* Reading */}
          <div className="relative mb-4 overflow-hidden rounded-2xl p-5" style={{ background: "rgba(155,142,130,0.04)", border: "1px solid rgba(155,142,130,0.1)" }}>
            <div className="absolute left-0 top-0 h-full w-[3px]" style={{ background: `linear-gradient(to bottom, ${sign.color}, transparent)` }} />
            <p className="mb-3 font-mono text-[9px] uppercase tracking-[2px]" style={{ color: sign.color }}>
              your reading
            </p>
            <p className="font-sans text-sm leading-[1.8] text-sand">{sign.desc}</p>
          </div>

          {/* Compatibility chart */}
          <div className="relative mb-4 overflow-hidden rounded-2xl p-5" style={{ background: "rgba(155,142,130,0.04)", border: "1px solid rgba(155,142,130,0.1)" }}>
            <div className="absolute left-0 top-0 h-full w-[3px]" style={{ background: `linear-gradient(to bottom, #B8A9C9, transparent)` }} />
            <p className="mb-5 font-mono text-[9px] uppercase tracking-[2px] text-lavender">compatibility chart</p>

            {/* Best match */}
            <BestWorstCard type="best" userSign={resultSign} sign={sign} />

            {/* Worst match */}
            <BestWorstCard type="worst" userSign={resultSign} sign={sign} />

            {/* Mini grid */}
            <p className="mb-3 font-mono text-[9px] uppercase tracking-[2px] text-muted">all signs</p>
            <div className="grid grid-cols-3 gap-2">
              {SIGN_KEYS.map((key) => {
                const s = SIGNS[key];
                const isYou = key === resultSign;
                const compat = isYou ? null : COMPAT_MATRIX[resultSign][key];
                const ml = compat ? getMatchLabel(compat) : null;
                return (
                  <div
                    key={key}
                    className="relative rounded-xl p-3.5 text-center"
                    style={{
                      background: isYou ? `${s.color}12` : "rgba(155,142,130,0.04)",
                      border: `1px solid ${isYou ? `${s.color}60` : "rgba(155,142,130,0.13)"}`,
                    }}
                  >
                    {isYou && (
                      <div className="absolute -right-1 -top-1.5 rounded-full bg-gate-black px-1.5" style={{ border: `1px solid ${s.color}40` }}>
                        <span className="font-mono text-[7px]" style={{ color: s.color }}>you</span>
                      </div>
                    )}
                    <div className="mb-1 text-[22px]">{s.emoji}</div>
                    <p className="font-sans text-[10px]" style={{ fontWeight: isYou ? 600 : 400, color: isYou ? s.color : "#E8DDD0" }}>
                      {s.short}
                    </p>
                    {!isYou && ml && (
                      <p className="mt-1 font-mono text-[9px] font-medium" style={{ color: ml.color }}>
                        {compat}%
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-center font-hand text-[15px]" style={{ color: "rgba(155,142,130,0.44)" }}>
              opposites attract. similar signs combust. {"\u2726"}
            </p>
          </div>

          {/* Vibe breakdown bars */}
          <div className="mb-8 rounded-2xl p-5" style={{ background: "rgba(155,142,130,0.04)", border: "1px solid rgba(155,142,130,0.1)" }}>
            <p className="mb-4 font-mono text-[9px] uppercase tracking-[2px] text-muted">your vibe breakdown</p>
            {Object.entries(scores)
              .sort((a, b) => b[1] - a[1])
              .map(([key, val]) => {
                const s = SIGNS[key as SignKey];
                const pct = (val / (QUESTIONS.length * 2)) * 100;
                const isWinner = key === resultSign;
                return (
                  <div key={key} className="mb-3">
                    <div className="mb-1.5 flex justify-between">
                      <span className="font-sans text-xs" style={{ color: isWinner ? s.color : "rgba(155,142,130,0.56)", fontWeight: isWinner ? 500 : 400 }}>
                        {s.emoji} {s.name}
                      </span>
                      <span className="font-mono text-[10px]" style={{ color: isWinner ? s.color : "rgba(155,142,130,0.38)" }}>
                        {Math.round(pct)}%
                      </span>
                    </div>
                    <div className="h-1 overflow-hidden rounded-full" style={{ background: "rgba(155,142,130,0.1)" }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          background: isWinner ? s.color : "rgba(155,142,130,0.19)",
                          width: `${pct}%`,
                          animation: "quizFillBar 1.2s cubic-bezier(0.16,1,0.3,1) 0.3s both",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>

          <p className="mb-6 text-center font-hand text-[22px] text-caramel" style={{ transform: "rotate(-2deg)" }}>
            we knew it all along tbh {"\u2726"}
          </p>

          {/* Spacer for sticky button */}
          <div className="h-24" />
        </div>
      )}

      {/* Sticky CTA for result screen */}
      {screen === "result" && (
        <div className="sticky bottom-0 z-10 px-6 pb-8 pt-4" style={{ background: "linear-gradient(to top, #0E0D0B 60%, transparent)" }}>
          <button
            onClick={handleFinish}
            className="w-full rounded-2xl bg-cream py-[18px] font-sans text-base font-medium text-gate-black transition-all duration-300"
          >
            {mode === "pre_checkout" ? "continue to checkout \u2192" : "let\u2019s go \u2192"}
          </button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   SUB-COMPONENT: Best/Worst Match Card
   ═══════════════════════════════════════════ */
function BestWorstCard({
  type,
  userSign,
  sign,
}: {
  type: "best" | "worst";
  userSign: SignKey;
  sign: (typeof SIGNS)[SignKey];
}) {
  const isBest = type === "best";
  const match = isBest ? sign.best : sign.worst;
  const matchSign = SIGNS[match.sign];
  const isSelf = match.sign === userSign;
  const compat = COMPAT_MATRIX[userSign][match.sign];
  const accentColor = isBest ? "#8BB67A" : "#D4736B";

  return (
    <div
      className="relative mb-3 rounded-[14px] p-4 pt-5"
      style={{ background: `${accentColor}0C`, border: `1px solid ${accentColor}25` }}
    >
      <div
        className="absolute -top-2 left-4 rounded-full px-2.5 py-0.5"
        style={{ background: "rgba(155,142,130,0.04)", border: `1px solid ${accentColor}35` }}
      >
        <span className="font-mono text-[8px] uppercase tracking-[2px]" style={{ color: accentColor }}>
          {isBest ? "best match" : "chaos pair"} {"\u2022"} {compat}%
        </span>
      </div>

      <div className="mt-1 flex items-center gap-3.5">
        {/* User sign */}
        <div className="text-center">
          <div
            className="flex h-[52px] w-[52px] items-center justify-center rounded-full text-2xl"
            style={{ background: `${sign.color}18`, border: `2px solid ${sign.color}50` }}
          >
            {sign.emoji}
          </div>
          <p className="mt-1 font-mono text-[8px] text-muted">you</p>
        </div>

        {/* Line */}
        <div className="relative flex flex-1 items-center justify-center">
          <div
            className="h-px w-full"
            style={{
              background: isBest
                ? `linear-gradient(90deg, ${sign.color}40, ${accentColor}60, ${matchSign.color}40)`
                : "none",
              borderTop: isBest ? "none" : `1px dashed ${accentColor}50`,
            }}
          />
          <div className="absolute bg-gate-black px-1.5">
            <span className="text-sm">{isBest ? "\u{1F49A}" : "\u26A1"}</span>
          </div>
        </div>

        {/* Match sign */}
        <div className="text-center">
          <div
            className="flex h-[52px] w-[52px] items-center justify-center rounded-full text-2xl"
            style={{
              background: `${matchSign.color}18`,
              border: `2px ${isBest ? "solid" : "dashed"} ${matchSign.color}50`,
            }}
          >
            {matchSign.emoji}
          </div>
          <p className="mt-1 font-mono text-[8px]" style={{ color: matchSign.color }}>
            {isSelf ? "also you \u{1F480}" : matchSign.short}
          </p>
        </div>
      </div>

      <div className="mt-3.5 rounded-[10px] px-3.5 py-2.5" style={{ background: "rgba(155,142,130,0.05)" }}>
        <p className="text-center font-hand text-base text-sand">&ldquo;{match.reason}&rdquo;</p>
      </div>
    </div>
  );
}
