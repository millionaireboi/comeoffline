"use client";

import { useState, useEffect } from "react";
import { Noise } from "@/components/shared/Noise";
import { useAppStore } from "@/store/useAppStore";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";

const rules = [
  { icon: "🤝", text: "be kind. be real. be present." },
  { icon: "🎯", text: "every person here was curated. respect the room." },
  { icon: "📵", text: "some events are phone-free. embrace it." },
  { icon: "✨", text: "the best connections happen face to face." },
];

export function AcceptanceScreen() {
  const [phase, setPhase] = useState(0);
  const { setStage, setUser, user } = useAppStore();
  const { getIdToken } = useAuth();

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 600);
    const t2 = setTimeout(() => setPhase(2), 1800);
    const t3 = setTimeout(() => setPhase(3), 3000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const handleContinue = async () => {
    try {
      const token = await getIdToken();
      if (token) {
        await apiFetch("/api/users/me", {
          method: "PUT",
          token,
          body: JSON.stringify({ has_seen_welcome: true }),
        });
      }
    } catch {
      // Non-blocking — still navigate even if persist fails
    }
    if (user) {
      setUser({ ...user, has_seen_welcome: true });
    }
    setStage("feed");
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gate-black px-6 py-10">
      <Noise opacity={0.04} />

      {/* Warm glow */}
      <div
        className="absolute left-1/2 top-[30%] h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(212,165,116,0.025), transparent 70%)",
          animation: "welcomeGlow 4s ease infinite",
        }}
      />

      <div className="relative z-10 max-w-[340px] text-center">
        {/* Globe + welcome */}
        <div
          className="transition-all duration-800"
          style={{
            opacity: phase >= 0 ? 1 : 0,
            transform: phase >= 0 ? "translateY(0)" : "translateY(20px)",
          }}
        >
          <div
            className="mb-6 text-6xl"
            style={{ animation: phase >= 1 ? "float 3s ease infinite" : "none" }}
          >
            🌍
          </div>
          <h2
            className="mb-2 font-serif text-[32px] font-normal text-cream"
            style={{ letterSpacing: "-1px" }}
          >
            welcome to come offline.
          </h2>
          <p className="font-sans text-[15px] leading-relaxed text-muted">
            you&apos;re part of the community now. here&apos;s what that means.
          </p>
        </div>

        {/* Rules */}
        {phase >= 2 && (
          <div className="animate-fadeSlideUp mt-10">
            <div className="flex flex-col gap-3.5 text-left">
              {rules.map((r, i) => (
                <div
                  key={i}
                  className="animate-fadeSlideUp flex items-start gap-3.5"
                  style={{ animationDelay: `${i * 0.12}s` }}
                >
                  <span className="mt-0.5 shrink-0 text-lg">{r.icon}</span>
                  <p className="font-sans text-sm leading-relaxed text-muted/80">{r.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        {phase >= 3 && (
          <div className="animate-fadeSlideUp mt-10">
            <button
              onClick={handleContinue}
              className="rounded-full bg-cream px-10 py-[18px] font-sans text-base font-medium text-gate-black transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(212,165,116,0.2)] active:scale-[0.98]"
            >
              show me what&apos;s happening →
            </button>
            <p className="mt-3.5 font-hand text-sm text-muted/30">
              the fun part starts now
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
