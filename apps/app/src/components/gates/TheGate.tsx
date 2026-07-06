"use client";

import { useState, useEffect } from "react";
import { Noise } from "@/components/shared/Noise";

const TAGLINE = "the best connections happen face to face";

/**
 * Open-entry welcome screen. Come Offline dropped invite codes — anyone can
 * join with their phone number (WhatsApp OTP). This screen is atmosphere +
 * one primary action; the actual phone flow lives in SignInScreen, which
 * signs in existing members and creates accounts for new numbers.
 */
export function TheGate({ onSignIn }: { onSignIn?: () => void }) {
  const [typed, setTyped] = useState("");

  // Typewriter effect — purely decorative; never gates the CTA
  useEffect(() => {
    let iv: ReturnType<typeof setInterval> | null = null;
    const timeout = setTimeout(() => {
      let i = 0;
      iv = setInterval(() => {
        setTyped(TAGLINE.slice(0, i + 1));
        i++;
        if (i >= TAGLINE.length && iv) clearInterval(iv);
      }, 35);
    }, 400);
    return () => {
      clearTimeout(timeout);
      if (iv) clearInterval(iv);
    };
  }, []);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gate-black px-6 py-10" style={{ paddingBottom: "max(2.5rem, env(safe-area-inset-bottom, 2.5rem))" }}>
      <Noise opacity={0.05} />

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

      {/* Entry */}
      <div className="w-full" style={{ maxWidth: 320 }}>
        <button
          onClick={onSignIn}
          className="w-full rounded-[14px] border-none bg-cream py-4 font-sans text-[15px] font-medium text-gate-black transition-transform active:scale-[0.98]"
        >
          continue with whatsapp →
        </button>
        <p className="mt-3 text-center font-mono text-[10px] text-muted/50">
          new here or coming back — same door.
        </p>
      </div>

      <div className="absolute bottom-0 pb-2 font-mono text-[10px] uppercase tracking-[2px] text-muted/20" style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom, 0.5rem))" }}>
        phone-free events · bangalore
      </div>
    </div>
  );
}
