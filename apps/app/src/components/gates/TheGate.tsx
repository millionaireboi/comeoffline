"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Noise } from "@/components/shared/Noise";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";

const rejectLines = [
  "nice try, stranger.",
  "nope. who sent you?",
  "that's not it, bestie.",
  "wrong door. keep knocking.",
  "did you just guess that?",
  "not even close, love.",
  "ask your cool friend.",
  "the bouncer says no.",
];

const TAGLINE = "someone thinks you're worth meeting IRL";

interface ConfettiPiece {
  id: number;
  left: number;
  delay: number;
  dur: number;
  color: string;
  size: number;
}

const CONFETTI_COLORS = ["#D4A574", "#DBBCAC", "#A8B5A0", "#D4836B", "#B8A9C9", "#FAF6F0"];

export function TheGate() {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "checking" | "unlocked" | "rejected">("idle");
  const [rejectMsg, setRejectMsg] = useState("");
  const [rejectCount, setRejectCount] = useState(0);
  const [typed, setTyped] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const { loginWithToken } = useAuth();

  // Typewriter effect
  useEffect(() => {
    const timeout = setTimeout(() => {
      let i = 0;
      const iv = setInterval(() => {
        setTyped(TAGLINE.slice(0, i + 1));
        i++;
        if (i >= TAGLINE.length) {
          clearInterval(iv);
          setTimeout(() => setShowInput(true), 400);
        }
      }, 35);
      return () => clearInterval(iv);
    }, 1000);
    return () => clearTimeout(timeout);
  }, []);

  const submit = useCallback(async () => {
    if (!code.trim() || status === "checking") return;
    setStatus("checking");

    try {
      const data = await apiFetch<{ token: string }>("/api/auth/validate-code", {
        method: "POST",
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });

      setStatus("unlocked");
      const pieces: ConfettiPiece[] = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.8,
        dur: 1.5 + Math.random() * 1.5,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        size: 4 + Math.random() * 6,
      }));
      setConfetti(pieces);

      // Login with the token from the API
      await loginWithToken(data.token);
    } catch {
      setStatus("rejected");
      setRejectMsg(rejectLines[rejectCount % rejectLines.length]);
      setRejectCount((c) => c + 1);
      setTimeout(() => {
        setStatus("idle");
        setCode("");
        inputRef.current?.focus();
      }, 1800);
    }
  }, [code, status, rejectCount, loginWithToken]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gate-black px-6 py-10">
      <Noise opacity={0.05} />

      {/* Confetti */}
      {confetti.map((p) => (
        <div
          key={p.id}
          className="fixed top-0 z-[999]"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            borderRadius: p.size > 7 ? "50%" : "1px",
            background: p.color,
            animation: `confettiFall ${p.dur}s ease-in ${p.delay}s both`,
          }}
        />
      ))}

      {/* Subtle glow */}
      <div
        className="absolute left-1/2 top-[20%] h-[300px] w-[300px] -translate-x-1/2 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(212,165,116,0.03), transparent 70%)",
          animation: "pulse 4s ease infinite",
        }}
      />

      {/* Logo */}
      <div className="animate-fadeSlideUp mb-12 text-center" style={{ animationDelay: "0.2s" }}>
        <h1 className="font-serif text-4xl tracking-tight text-cream" style={{ letterSpacing: "-1px" }}>
          come offline
        </h1>
        <div className="mt-2 font-mono text-[11px] uppercase tracking-[4px] text-muted/50">
          bangalore
        </div>
      </div>

      {/* Tagline */}
      <div className="mb-10 min-h-[28px]" style={{ animation: "fadeIn 0.5s ease 0.8s both" }}>
        <p className="text-center font-sans text-base italic text-muted">
          {typed}
          {typed.length < TAGLINE.length && (
            <span
              className="ml-0.5 inline-block h-4 w-0.5 align-middle bg-caramel"
              style={{ animation: "blink 0.8s step-end infinite" }}
            />
          )}
        </p>
      </div>

      {/* Unlocked state */}
      {status === "unlocked" ? (
        <div className="animate-scaleIn relative text-center">
          <div
            className="absolute left-1/2 top-1/2 h-[60px] w-[60px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-caramel"
            style={{ animation: "unlockPulse 1.2s ease-out infinite" }}
          />
          <div className="mb-5 text-5xl" style={{ animation: "float 2s ease infinite" }}>
            🚪
          </div>
          <p className="font-serif text-2xl text-cream">you&apos;re in.</p>
          <p className="mt-2 font-sans text-sm text-muted">welcome to the other side.</p>
        </div>
      ) : (
        /* Code input */
        <div
          className="w-full transition-all duration-600"
          style={{
            maxWidth: 320,
            opacity: showInput ? 1 : 0,
            transform: showInput ? "translateY(0)" : "translateY(16px)",
          }}
        >
          <div
            className="relative mb-4"
            style={{ animation: status === "rejected" ? "shake 0.4s ease" : "none" }}
          >
            <input
              ref={inputRef}
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 12))}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="enter invite code"
              maxLength={12}
              disabled={status === "checking"}
              className="w-full rounded-2xl border-[1.5px] bg-gate-dark px-5 py-[18px] text-center font-mono text-base uppercase tracking-[3px] text-cream outline-none transition-all duration-300 placeholder:text-sand"
              style={{
                borderColor:
                  status === "rejected"
                    ? "rgba(196,112,77,0.5)"
                    : status === "checking"
                      ? "rgba(212,165,116,0.4)"
                      : "rgba(155,142,130,0.15)",
                animation: status === "checking" ? "gateGlow 1.5s ease infinite" : "none",
              }}
            />
            {status === "checking" && (
              <div
                className="absolute -bottom-0.5 left-[10%] right-[10%] h-0.5 rounded-sm"
                style={{
                  background: "linear-gradient(90deg, transparent, #D4A574, transparent)",
                  backgroundSize: "200% 100%",
                  animation: "shimmer 1s ease infinite",
                }}
              />
            )}
          </div>

          {status === "rejected" && (
            <p className="animate-fadeSlideDown mb-4 text-center font-sans text-sm italic text-terracotta">
              {rejectMsg}
            </p>
          )}

          <button
            onClick={submit}
            disabled={status === "checking" || !code.trim()}
            className="w-full rounded-[14px] border-none py-4 font-sans text-[15px] font-medium transition-all duration-300"
            style={{
              background: code.trim() ? "#FAF6F0" : "rgba(155,142,130,0.12)",
              color: code.trim() ? "#0E0D0B" : "rgba(155,142,130,0.4)",
              cursor: code.trim() ? "pointer" : "default",
              opacity: status === "checking" ? 0.5 : 1,
            }}
          >
            {status === "checking" ? "checking..." : "unlock →"}
          </button>

          {rejectCount >= 3 && status === "idle" && (
            <p
              className="mt-6 text-center font-mono text-[10px] text-muted/25"
              style={{ animation: "fadeIn 0.5s ease both" }}
            >
              psst... the code is what we want you to come.
            </p>
          )}

          {/* Sign in link */}
          <div className="mt-8 text-center" style={{ animation: "fadeIn 0.5s ease 1.5s both" }}>
            <p className="font-mono text-[11px] text-muted/50">already a member?</p>
            <a
              href="/sign-in"
              className="mt-2 inline-block font-mono text-[11px] uppercase tracking-[3px] text-caramel transition-opacity hover:opacity-70"
            >
              sign in
            </a>
          </div>
        </div>
      )}

      <div className="absolute bottom-8 font-mono text-[10px] uppercase tracking-[2px] text-muted/20">
        invite only · est. 2026
      </div>
    </div>
  );
}
