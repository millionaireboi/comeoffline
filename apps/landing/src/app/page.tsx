"use client";

import { useState, useEffect, useRef } from "react";
import { useInView } from "@/hooks/useInView";

// Force dynamic rendering to prevent build-time hangs
export const dynamic = 'force-dynamic';

// ═══════════════════════════════════════════
// PALETTE — quick access to hex values for inline styles
// ═══════════════════════════════════════════
const P = {
  gateBlack: "#0E0D0B",
  nearBlack: "#1A1715",
  surface: "#161412",
  cream: "#FAF6F0",
  sand: "#E8DDD0",
  warmWhite: "#F5EFE6",
  caramel: "#D4A574",
  deepCaramel: "#B8845A",
  blush: "#DBBCAC",
  coral: "#D4836B",
  sage: "#A8B5A0",
  lavender: "#B8A9C9",
  warmBrown: "#8B6F5A",
  darkBrown: "#3D2E22",
  muted: "#9B8E82",
  highlight: "#C4704D",
};

// ═══════════════════════════════════════════
// HAND NOTE — handwritten annotation feel
// ═══════════════════════════════════════════
function HandNote({
  children,
  rotation = -2,
  className = "",
  style = {},
}: {
  children: React.ReactNode;
  rotation?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={`font-hand inline-block text-[15px] text-muted ${className}`}
      style={{ transform: `rotate(${rotation}deg)`, ...style }}
    >
      {children}
    </span>
  );
}

// ═══════════════════════════════════════════
// STICKER — small floating labels
// ═══════════════════════════════════════════
function Sticker({
  text,
  rotation = -3,
  color = P.caramel,
  top,
  right,
  left,
  bottom,
  delay = 0,
  visible = true,
}: {
  text: string;
  rotation?: number;
  color?: string;
  top?: string;
  right?: string;
  left?: string;
  bottom?: string;
  delay?: number;
  visible?: boolean;
}) {
  return (
    <div
      className="pointer-events-none absolute transition-all duration-600"
      style={{
        top,
        right,
        left,
        bottom,
        transform: `rotate(${rotation}deg)`,
        opacity: visible ? 1 : 0,
        transitionDelay: `${delay}s`,
      }}
    >
      <span
        className="whitespace-nowrap rounded-full font-mono text-[9px] uppercase tracking-[2px]"
        style={{
          color,
          border: `1px solid ${color}40`,
          padding: "6px 14px",
          background: color + "08",
        }}
      >
        {text}
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════
// ROTATING SEAL — slowly spinning circular badge
// ═══════════════════════════════════════════
function RotatingSeal({ size = 90 }: { size?: number }) {
  const text = "COME OFFLINE \u2022 EST 2026 \u2022 BANGALORE \u2022 INVITE ONLY \u2022 ";
  return (
    <div className="animate-spin-slow" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <defs>
          <path
            id="sc"
            d="M 50,50 m -38,0 a 38,38 0 1,1 76,0 a 38,38 0 1,1 -76,0"
            fill="none"
          />
        </defs>
        <text
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "7.5px",
            fill: P.caramel + "55",
            letterSpacing: "2.5px",
            textTransform: "uppercase",
          }}
        >
          <textPath href="#sc">{text}</textPath>
        </text>
        <circle cx="50" cy="50" r="16" fill="none" stroke={P.caramel + "20"} strokeWidth="0.5" />
        <text
          x="50"
          y="54"
          textAnchor="middle"
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "12px",
            fill: P.caramel + "45",
          }}
        >
          CO
        </text>
      </svg>
    </div>
  );
}

// ═══════════════════════════════════════════
// PASSPORT STAMP — rough ink stamp effect
// ═══════════════════════════════════════════
function PassportStamp({
  text,
  color = P.coral,
  rotation = -8,
}: {
  text: string;
  color?: string;
  rotation?: number;
}) {
  return (
    <div
      className="relative flex h-[72px] w-[72px] items-center justify-center rounded-lg"
      style={{
        border: `2px solid ${color}45`,
        transform: `rotate(${rotation}deg)`,
      }}
    >
      <span
        className="text-center font-mono text-[7.5px] uppercase leading-[1.4] font-medium"
        style={{ letterSpacing: "1.5px", color: color + "60" }}
      >
        {text}
      </span>
      <div
        className="absolute rounded-full"
        style={{
          top: "22%",
          right: "-4px",
          width: "10px",
          height: "3px",
          background: color + "12",
          transform: "rotate(15deg)",
        }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════
// SOCIAL PROOF TICKER — cycling live activity
// ═══════════════════════════════════════════
function SocialTicker() {
  const [idx, setIdx] = useState(0);
  const [show, setShow] = useState(true);
  const msgs = [
    { text: "Aisha just got vouched in", time: "2m ago", dot: P.sage },
    { text: "3 spots left for House Party", time: "just now", dot: P.coral },
    { text: "Priya earned 2 vouch codes", time: "5m ago", dot: P.caramel },
    { text: "someone passed the vibe check", time: "1m ago", dot: P.lavender },
    { text: "No Color Holi is 44% full", time: "just now", dot: P.sage },
  ];
  useEffect(() => {
    const iv = setInterval(() => {
      setShow(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % msgs.length);
        setShow(true);
      }, 350);
    }, 3200);
    return () => clearInterval(iv);
  }, [msgs.length]);
  const m = msgs[idx];
  return (
    <div
      className="inline-flex items-center gap-2.5 rounded-full px-4 py-2 backdrop-blur-md transition-all duration-300"
      style={{
        background: P.cream + "06",
        border: `1px solid ${P.cream}10`,
        opacity: show ? 1 : 0,
        transform: show ? "translateY(0)" : "translateY(-6px)",
      }}
    >
      <div
        className="h-1.5 w-1.5 shrink-0 rounded-full animate-pulse-custom"
        style={{ background: m.dot }}
      />
      <span className="font-sans text-xs" style={{ color: P.cream + "bb" }}>
        {m.text}
      </span>
      <span className="whitespace-nowrap font-mono text-[9px]" style={{ color: P.muted + "50" }}>
        {m.time}
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════
// SCRIBBLE SVGs — hand-drawn decorations
// ═══════════════════════════════════════════
function ScribbleArrow({ className = "" }: { className?: string }) {
  return (
    <svg width="40" height="24" viewBox="0 0 40 24" fill="none" className={`block ${className}`}>
      <path
        d="M4 16C8 14 14 8 20 10C26 12 30 6 36 5"
        stroke={P.caramel + "45"}
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
        strokeDasharray="2 3"
      />
      <path
        d="M32 2L37 5L31 8"
        stroke={P.caramel + "45"}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

function ScribbleCircle({
  width = 60,
  color = P.caramel,
}: {
  width?: number;
  color?: string;
}) {
  return (
    <svg width={width} height="30" viewBox={`0 0 ${width} 30`} fill="none" className="block">
      <ellipse
        cx={width / 2}
        cy="15"
        rx={width / 2 - 4}
        ry="11"
        stroke={color + "30"}
        strokeWidth="1.5"
        fill="none"
        strokeDasharray="4 3"
        transform={`rotate(-3 ${width / 2} 15)`}
      />
    </svg>
  );
}

function ScribbleStar({
  color = P.caramel,
  size = 14,
}: {
  color?: string;
  size?: number;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className="block">
      <path
        d="M8 1L9.5 6H14L10.5 9L12 14L8 11L4 14L5.5 9L2 6H6.5L8 1Z"
        fill={color + "20"}
        stroke={color + "35"}
        strokeWidth="0.5"
      />
    </svg>
  );
}

// ═══════════════════════════════════════════
// POLAROID — CSS-only photo card
// ═══════════════════════════════════════════
function Polaroid({
  color,
  rotation = -3,
  caption,
  emoji,
}: {
  color: string;
  rotation?: number;
  caption: string;
  emoji: string;
}) {
  return (
    <div
      className="relative shrink-0 rounded-[3px] bg-white p-2 pb-7"
      style={{
        width: 120,
        boxShadow: "0 3px 12px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.08)",
        transform: `rotate(${rotation}deg)`,
      }}
    >
      <div
        className="flex items-center justify-center rounded-[2px] text-[30px]"
        style={{
          width: 104,
          height: 104,
          background: `linear-gradient(135deg, ${color}25, ${color}50, ${color}15)`,
        }}
      >
        {emoji}
      </div>
      <p className="mt-1.5 text-center font-hand text-[11px] leading-[1.2] text-warm-brown">
        {caption}
      </p>
      {/* Tape strip */}
      <div
        className="absolute -top-1.5 left-1/2 rounded-[2px]"
        style={{
          transform: "translateX(-50%) rotate(2deg)",
          width: 36,
          height: 12,
          background: P.caramel + "18",
          border: `0.5px solid ${P.caramel}10`,
        }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════
// COUNT UP — animated number on scroll
// ═══════════════════════════════════════════
function CountUp({ target, vis }: { target: string; vis: boolean }) {
  const [val, setVal] = useState<string | number>(0);
  useEffect(() => {
    if (!vis) return;
    const num = parseInt(target);
    if (isNaN(num)) {
      setVal(target);
      return;
    }
    let cur = 0;
    const inc = Math.max(1, Math.floor(num / 30));
    const iv = setInterval(() => {
      cur += inc;
      if (cur >= num) {
        setVal(num);
        clearInterval(iv);
      } else setVal(cur);
    }, 40);
    return () => clearInterval(iv);
  }, [vis, target]);
  return <>{val}</>;
}

// ═══════════════════════════════════════════
// HERO — THE FUNNEL
// ═══════════════════════════════════════════
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";

const REJECTION_LINES = [
  "hmm, that's not it. try again?",
  "nope. nice try though.",
  "that code doesn't ring a bell.",
  "invalid. who gave you this?",
  "not a real one. got another?",
  "close but no. ask your friend again.",
  "doesn't work. maybe check the spelling?",
  "that's not it chief.",
];

function Hero({ onOpenChat }: { onOpenChat: () => void }) {
  const [phase, setPhase] = useState(0);
  const [typed, setTyped] = useState("");
  const [code, setCode] = useState("");
  const [codeState, setCodeState] = useState<"idle" | "checking" | "valid" | "invalid">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [failCount, setFailCount] = useState(0);
  const tag = "an invite-only community for people who still go outside.";

  useEffect(() => {
    setTimeout(() => setPhase(1), 400);
  }, []);

  useEffect(() => {
    if (phase < 1) return;
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setTyped(tag.slice(0, i));
      if (i >= tag.length) {
        clearInterval(iv);
        setTimeout(() => setPhase(2), 300);
      }
    }, 30);
    return () => clearInterval(iv);
  }, [phase]);

  const handleCodeSubmit = async () => {
    if (!code.trim() || codeState === "checking") return;
    setCodeState("checking");

    try {
      const res = await fetch(`${API_URL}/api/auth/validate-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });

      const data = await res.json();

      if (data.success && data.data?.handoff_token) {
        setCodeState("valid");
        // Redirect to PWA with handoff token after confetti moment
        setTimeout(() => {
          window.location.href = `${APP_URL}/?token=${data.data.handoff_token}&source=landing`;
        }, 1200);
      } else {
        setCodeState("invalid");
        // Handle specific error types from API
        const apiError = data.error?.toLowerCase() || "";
        if (apiError.includes("expired")) {
          setErrorMsg("that code has expired. ask for a fresh one.");
        } else if (apiError.includes("used") || apiError.includes("claimed")) {
          setErrorMsg("this code's already been claimed. got another?");
        } else {
          const idx = failCount % REJECTION_LINES.length;
          setErrorMsg(REJECTION_LINES[idx]);
        }
        setFailCount((c) => c + 1);
        setTimeout(() => setCodeState("idle"), 3000);
      }
    } catch {
      setCodeState("invalid");
      setErrorMsg("something went wrong. try again?");
      setTimeout(() => setCodeState("idle"), 2000);
    }
  };

  return (
    <section className="relative min-h-screen overflow-hidden bg-gate-black">
      {/* Film grain texture */}
      <div
        className="pointer-events-none absolute inset-0 animate-grain opacity-60"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Ghost text */}
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-serif font-normal"
        style={{
          fontSize: "clamp(120px, 25vw, 220px)",
          color: P.muted + "04",
          letterSpacing: "-8px",
        }}
      >
        offline
      </div>

      {/* Rotating seal — top right */}
      <div
        className="pointer-events-none absolute top-[60px] right-3 transition-opacity duration-1000"
        style={{ opacity: phase >= 2 ? 0.7 : 0, transitionDelay: "0.5s" }}
      >
        <RotatingSeal size={78} />
      </div>

      {/* Scattered stars */}
      <div
        className="pointer-events-none absolute top-[14%] right-[16%] transition-opacity duration-800"
        style={{ opacity: phase >= 2 ? 1 : 0, transitionDelay: "1s" }}
      >
        <ScribbleStar color={P.caramel} />
      </div>
      <div
        className="pointer-events-none absolute bottom-[22%] right-[8%] transition-opacity duration-800"
        style={{ opacity: phase >= 2 ? 1 : 0, transitionDelay: "1.3s" }}
      >
        <ScribbleStar color={P.blush} size={10} />
      </div>
      <div
        className="pointer-events-none absolute top-[35%] left-[5%] transition-opacity duration-800"
        style={{ opacity: phase >= 2 ? 1 : 0, transitionDelay: "1.1s" }}
      >
        <ScribbleStar color={P.sage} size={11} />
      </div>

      <div className="relative z-[2] mx-auto flex min-h-screen max-w-full flex-col justify-center px-5 pt-16 pb-12 sm:max-w-[500px] sm:px-6 sm:pt-20 sm:pb-15">
        {/* Top bar */}
        <div
          className="absolute top-4 right-4 left-4 flex items-center justify-between sm:top-6 sm:right-6 sm:left-6"
          style={{ animation: "fadeIn 0.8s ease 0.2s both" }}
        >
          <span className="font-mono text-[9px] uppercase tracking-[2px] sm:text-[10px] sm:tracking-[3px]" style={{ color: P.muted + "40" }}>
            est. 2026
          </span>
          <span className="font-mono text-[9px] uppercase tracking-[2px] sm:text-[10px] sm:tracking-[3px]" style={{ color: P.muted + "40" }}>
            bangalore
          </span>
        </div>

        {/* Title */}
        <div style={{ animation: "fadeSlideUp 1s cubic-bezier(0.16,1,0.3,1) 0.3s both" }}>
          <h1
            className="mb-1 font-serif font-normal text-cream"
            style={{ fontSize: "clamp(44px, 15vw, 80px)", letterSpacing: "-2.5px", lineHeight: 0.9 }}
          >
            come
          </h1>
          <h1
            className="font-serif font-normal italic text-cream"
            style={{ fontSize: "clamp(44px, 15vw, 80px)", letterSpacing: "-2.5px", lineHeight: 0.9 }}
          >
            offline.
          </h1>
        </div>

        {/* Divider */}
        <div
          className="my-7 h-0.5 bg-caramel transition-all duration-800"
          style={{
            width: phase >= 1 ? "60px" : "0px",
            transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)",
            transitionDelay: "0.5s",
          }}
        />

        {/* Tagline typewriter */}
        <div className="mb-4 min-h-[26px]">
          <p
            className="font-sans italic text-muted"
            style={{ fontSize: "clamp(15px, 3.2vw, 19px)" }}
          >
            {typed}
            {typed.length < tag.length && (
              <span
                className="ml-0.5 inline-block animate-blink align-middle"
                style={{ width: "2px", height: "16px", background: P.caramel }}
              />
            )}
          </p>
        </div>

        {phase >= 2 && (
          <div className="animate-fade-slide-up">
            {/* Crossed-out humor */}
            <p className="mb-1.5 font-sans text-[13px] leading-[1.7]" style={{ color: P.muted + "40" }}>
              <span style={{ textDecoration: "line-through", textDecorationColor: P.highlight + "50" }}>
                another networking event in bangalore
              </span>
            </p>
            <p className="mb-7 font-sans text-[13px] leading-[1.7]" style={{ color: P.muted + "60" }}>
              curated events. curated people. no randos, no algorithms, no startup small talk.
            </p>

            {/* ═══ TWO PATHS ═══ */}
            <div className="flex flex-col gap-3.5">
              {/* PATH 1: CODE */}
              <div
                className="rounded-[18px] p-5 backdrop-blur-[10px]"
                style={{
                  background: P.cream + "08",
                  border: `1px solid ${P.cream}12`,
                  animation: "fadeSlideUp 0.6s ease 0.1s both",
                }}
              >
                <div className="mb-3.5 flex items-center justify-between">
                  <span className="font-sans text-[15px] font-medium text-cream">i have a code</span>
                  <span
                    className="rounded-full font-mono text-[9px] uppercase tracking-[1.5px]"
                    style={{ color: P.sage, background: P.sage + "18", padding: "4px 10px" }}
                  >
                    fast track
                  </span>
                </div>
                <div className="flex gap-2.5">
                  <input
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.toUpperCase());
                      if (codeState === "invalid") setCodeState("idle");
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleCodeSubmit()}
                    placeholder="ENTER YOUR CODE"
                    className="flex-1 rounded-xl font-mono text-[13px] uppercase text-cream transition-all duration-300"
                    style={{
                      padding: "14px 16px",
                      letterSpacing: "2px",
                      border: `1px solid ${
                        codeState === "invalid"
                          ? P.highlight + "60"
                          : codeState === "valid"
                            ? P.sage + "60"
                            : P.cream + "15"
                      }`,
                      background: P.cream + "06",
                      animation: codeState === "invalid" ? "shake 0.4s ease" : "none",
                    }}
                  />
                  <button
                    onClick={handleCodeSubmit}
                    disabled={codeState === "checking" || codeState === "valid"}
                    className="shrink-0 whitespace-nowrap rounded-xl border-none font-sans text-[13px] font-semibold transition-all duration-300"
                    style={{
                      padding: "14px 22px",
                      background: codeState === "valid" ? P.sage : P.cream,
                      color: codeState === "valid" ? "#fff" : P.gateBlack,
                      cursor: codeState === "checking" ? "wait" : "pointer",
                      opacity: codeState === "checking" ? 0.6 : 1,
                    }}
                  >
                    {codeState === "checking" ? "..." : codeState === "valid" ? "\u2713" : "go"}
                  </button>
                </div>
                {codeState === "invalid" && (
                  <p className="mt-2 font-hand text-sm text-highlight" style={{ animation: "fadeIn 0.3s" }}>
                    {errorMsg}
                  </p>
                )}
                {codeState === "invalid" && failCount >= 3 && (
                  <p className="mt-1 font-sans text-[11px]" style={{ color: P.muted + "60", animation: "fadeIn 0.3s" }}>
                    no code? try the{" "}
                    <button onClick={onOpenChat} className="cursor-pointer underline" style={{ color: P.caramel }}>
                      prove yourself
                    </button>{" "}
                    path instead
                  </p>
                )}
                {codeState === "valid" && (
                  <p className="mt-2 font-hand text-sm text-sage" style={{ animation: "fadeIn 0.3s" }}>
                    welcome in. taking you to the app...
                  </p>
                )}
              </div>

              {/* OR */}
              <div className="flex items-center gap-3.5 px-1">
                <div className="h-px flex-1" style={{ background: P.cream + "10" }} />
                <HandNote rotation={0} className="text-sm" style={{ color: P.muted + "50" }}>
                  or
                </HandNote>
                <div className="h-px flex-1" style={{ background: P.cream + "10" }} />
              </div>

              {/* PATH 2: PROVE */}
              <button
                onClick={onOpenChat}
                className="w-full cursor-pointer rounded-[18px] p-5 text-left transition-all duration-300 hover:border-caramel/60"
                style={{
                  border: `1.5px dashed ${P.caramel}40`,
                  background: P.caramel + "06",
                  animation: "fadeSlideUp 0.6s ease 0.2s both",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = P.caramel + "12";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = P.caramel + "06";
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="mb-1 block font-sans text-[15px] font-medium text-cream">
                      no code? prove yourself.
                    </span>
                    <span className="font-sans text-xs" style={{ color: P.muted + "70" }}>
                      chat with our bot, pass the vibe check, get in
                    </span>
                  </div>
                  <span className="ml-3 text-[22px] text-caramel">{"\u2192"}</span>
                </div>
              </button>
            </div>

            {/* Social proof ticker */}
            <div className="mt-6" style={{ animation: "fadeIn 1s ease 0.8s both" }}>
              <SocialTicker />
            </div>
          </div>
        )}
      </div>

      {/* Stickers */}
      <Sticker text="invite only" rotation={-4} color={P.caramel} top="16%" right="16px" visible={phase >= 2} delay={0.4} />
      <Sticker text="phones down" rotation={3} color={P.blush} bottom="20%" right="20px" visible={phase >= 2} delay={0.6} />
    </section>
  );
}

// ═══════════════════════════════════════════
// MARQUEE
// ═══════════════════════════════════════════
function MarqueeSection() {
  const items =
    "invite only \u2022 real people \u2022 no phones \u2022 curated vibes \u2022 bangalore \u2022 earn your spot \u2022 secret venues \u2022 ";
  return (
    <div className="overflow-hidden bg-cream py-3.5" style={{ borderBottom: `1px solid ${P.sand}` }}>
      <div className="flex animate-marquee whitespace-nowrap">
        {[0, 1].map((i) => (
          <span
            key={i}
            className="font-mono text-[10px] uppercase tracking-[3px]"
            style={{ color: P.muted + "70" }}
          >
            {items.repeat(5)}
          </span>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// WHAT IS THIS + POLAROID SCATTER
// ═══════════════════════════════════════════
function WhatIsThis() {
  const [ref, vis] = useInView();
  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="relative overflow-hidden bg-cream px-5 pt-14 pb-8 sm:px-7 sm:pt-18 sm:pb-10"
    >
      {/* Ink blot */}
      <div
        className="pointer-events-none absolute top-[30px] -right-10 h-40 w-40 rounded-full blur-[40px]"
        style={{ background: P.caramel + "05" }}
      />
      {/* Giant ghost question mark */}
      <div
        className="pointer-events-none absolute -top-10 -right-5 font-serif font-normal leading-none"
        style={{ fontSize: "clamp(120px, 28vw, 200px)", color: P.nearBlack + "03" }}
      >
        ?
      </div>

      <div className="relative z-[2] mx-auto max-w-full sm:max-w-[440px]">
        <div
          className="transition-all duration-700"
          style={{
            opacity: vis ? 1 : 0,
            transform: vis ? "translateY(0)" : "translateY(20px)",
            transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          <span className="font-mono text-[10px] uppercase tracking-[3px] text-muted">so what is this</span>
          <h2
            className="my-3 font-serif font-normal text-near-black leading-[1.2]"
            style={{ fontSize: "clamp(24px, 5.5vw, 32px)" }}
          >
            we throw events for people
            <br />
            who deserve better than
            <br />
            <span className="italic text-caramel">random nightlife.</span>
          </h2>
          <p className="relative font-sans text-sm leading-[1.8] text-warm-brown">
            come offline is an invite-only community in bangalore. we curate the people, the venue, and the
            experience. you show up, put your phone down, and actually connect with humans.
          </p>
          {/* Margin annotation */}
          <div
            className="mt-1 text-right transition-opacity duration-600"
            style={{ opacity: vis ? 1 : 0, transitionDelay: "0.5s" }}
          >
            <HandNote rotation={3} className="text-[13px]" style={{ color: P.caramel + "60" }}>
              wild concept, we know {"\u2191"}
            </HandNote>
          </div>
        </div>

        {/* Polaroid scatter — horizontally scrollable */}
        <div
          className="mt-8 flex gap-3 overflow-x-auto pt-2.5 pb-5 transition-opacity duration-800"
          style={{
            WebkitOverflowScrolling: "touch",
            opacity: vis ? 1 : 0,
            transitionDelay: "0.3s",
          }}
        >
          <Polaroid color={P.blush} rotation={-4} caption="galentines '26" emoji={"\u{1F485}"} />
          <Polaroid color={P.caramel} rotation={2} caption="yapping room" emoji={"\u{1F4AC}"} />
          <Polaroid color={P.sage} rotation={-2} caption="0 phones used" emoji={"\u{1F4F5}"} />
          <Polaroid color={P.lavender} rotation={5} caption="3am vibes" emoji={"\u{1F319}"} />
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════
// HOW IT WORKS — with stamps + annotations
// ═══════════════════════════════════════════
function HowItWorks() {
  const [ref, vis] = useInView();
  const steps = [
    { num: "01", title: "get invited", desc: "someone vouches for you, or you charm our chatbot", icon: "\u{1F39F}\uFE0F", note: null },
    { num: "02", title: "RSVP + wait", desc: "grab your spot. venue stays secret until we say so.", icon: "\u23F3", note: "the anticipation is part of it" },
    { num: "03", title: "show up, go dark", desc: "we pick you up. phone goes away. real life begins.", icon: "\u{1F319}", note: null },
    { num: "04", title: "connect after", desc: "next morning: memories, mutual connections, vouch codes.", icon: "\u{1F91D}", note: "the morning after hits different" },
  ];
  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="relative overflow-hidden bg-near-black px-5 py-14 sm:px-7 sm:py-18"
    >
      {/* Passport stamps floating in corners */}
      <div
        className="pointer-events-none absolute top-10 right-5 transition-opacity duration-800"
        style={{ opacity: vis ? 0.4 : 0, transitionDelay: "0.5s" }}
      >
        <PassportStamp text={"VIBE\nCHECKED"} color={P.sage} rotation={-12} />
      </div>
      <div
        className="pointer-events-none absolute bottom-[50px] right-[35px] transition-opacity duration-800"
        style={{ opacity: vis ? 0.3 : 0, transitionDelay: "0.7s" }}
      >
        <PassportStamp text={"PHONE\nFREE"} color={P.coral} rotation={8} />
      </div>

      <div className="mx-auto max-w-full sm:max-w-[440px]">
        <div className="mb-8 transition-opacity duration-500" style={{ opacity: vis ? 1 : 0 }}>
          <span className="font-mono text-[10px] uppercase tracking-[3px] text-muted">how it works</span>
          <h2
            className="mt-3 font-serif font-normal text-cream leading-[1.2]"
            style={{ fontSize: "clamp(24px, 5.5vw, 32px)" }}
          >
            four steps to
            <br />
            <span className="italic text-caramel">actually living.</span>
          </h2>
        </div>
        <div className="flex flex-col gap-3">
          {steps.map((s, i) => (
            <div key={i} className="relative">
              <div
                className="flex items-start gap-4 rounded-2xl p-5 transition-all duration-600"
                style={{
                  background: P.cream + "05",
                  border: `1px solid ${P.cream}08`,
                  opacity: vis ? 1 : 0,
                  transform: vis ? "translateY(0)" : "translateY(16px)",
                  transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)",
                  transitionDelay: `${0.1 + i * 0.1}s`,
                }}
              >
                <span className="mt-0.5 shrink-0 text-2xl">{s.icon}</span>
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="font-mono text-[10px] tracking-[1px] text-caramel">{s.num}</span>
                    <span className="font-sans text-[15px] font-semibold text-cream">{s.title}</span>
                  </div>
                  <p className="m-0 font-sans text-[13px] leading-[1.6] text-muted">{s.desc}</p>
                </div>
              </div>
              {/* Handwritten annotation */}
              {s.note && (
                <div
                  className="pointer-events-none absolute -right-1 -bottom-2.5 transition-opacity duration-500"
                  style={{
                    opacity: vis ? 0.7 : 0,
                    transitionDelay: `${0.4 + i * 0.15}s`,
                  }}
                >
                  <HandNote rotation={3} className="text-[11px]" style={{ color: P.caramel + "70" }}>
                    ^ {s.note}
                  </HandNote>
                </div>
              )}
            </div>
          ))}
        </div>
        {/* Scribble closer */}
        <div
          className="mt-6 text-center transition-opacity duration-600"
          style={{ opacity: vis ? 1 : 0, transitionDelay: "0.6s" }}
        >
          <ScribbleArrow className="mx-auto rotate-90" />
          <HandNote rotation={-1} className="mt-1 block text-sm" style={{ color: P.muted + "50" }}>
            that&apos;s it. seriously.
          </HandNote>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════
// GOLDEN TICKET — with washi tape + stamp
// ═══════════════════════════════════════════
function GoldenTicket() {
  const [ref, vis] = useInView();
  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="relative overflow-hidden bg-cream px-7 py-18"
    >
      <div
        className="pointer-events-none absolute -bottom-5 -left-10 h-[200px] w-[200px] rounded-full blur-[50px]"
        style={{ background: P.caramel + "04" }}
      />
      <div className="mx-auto max-w-full sm:max-w-[440px]">
        <div className="mb-7 transition-opacity duration-500" style={{ opacity: vis ? 1 : 0 }}>
          <span className="font-mono text-[10px] uppercase tracking-[3px] text-muted">the venue</span>
          <h2
            className="mt-3 font-serif font-normal text-near-black leading-[1.2]"
            style={{ fontSize: "clamp(24px, 5.5vw, 32px)" }}
          >
            you don&apos;t know where
            <br />
            until <span className="italic text-caramel">we say so.</span>
          </h2>
        </div>
        {/* Ticket */}
        <div
          className="relative overflow-hidden rounded-[20px] p-8 transition-all duration-800"
          style={{
            background: `linear-gradient(135deg, ${P.caramel}15, ${P.deepCaramel}08, ${P.caramel}12)`,
            border: `1px solid ${P.caramel}20`,
            opacity: vis ? 1 : 0,
            transform: vis ? "translateY(0) rotate(0.5deg)" : "translateY(20px) rotate(-1deg)",
            transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)",
            transitionDelay: "0.2s",
          }}
        >
          {/* Washi tape strips */}
          <div
            className="absolute -top-1 left-5 h-[18px] w-[50px] rounded-[2px]"
            style={{
              background: P.sage + "30",
              transform: "rotate(-5deg)",
              border: `0.5px solid ${P.sage}20`,
            }}
          />
          <div
            className="absolute -top-0.5 right-6 h-[18px] w-10 rounded-[2px]"
            style={{
              background: P.blush + "30",
              transform: "rotate(3deg)",
              border: `0.5px solid ${P.blush}20`,
            }}
          />
          {/* Perforated edge */}
          <div
            className="absolute top-0 bottom-0 left-0 w-px"
            style={{ borderLeft: `2px dashed ${P.caramel}20` }}
          />

          <div className="pointer-events-none absolute -top-5 -right-5 text-[100px] opacity-5">{"\u{1F39F}\uFE0F"}</div>
          <span
            className="font-mono text-[9px] uppercase tracking-[2px]"
            style={{ color: P.deepCaramel }}
          >
            your golden ticket
          </span>
          <h3 className="mt-3 mb-1.5 font-serif text-[28px] font-normal text-near-black">The Courtyard</h3>
          <p className="mb-4 font-sans text-sm text-warm-brown">Indiranagar, Bangalore</p>
          <div className="flex gap-6">
            <div>
              <span className="font-mono text-[9px] uppercase tracking-[1px] text-muted">date</span>
              <p className="mt-0.5 font-sans text-[13px] font-medium text-near-black">Feb 14, 2026</p>
            </div>
            <div>
              <span className="font-mono text-[9px] uppercase tracking-[1px] text-muted">pickup</span>
              <p className="mt-0.5 font-sans text-[13px] font-medium text-near-black">4:15 PM</p>
            </div>
          </div>
          {/* Scratch hint */}
          <div
            className="mt-5 inline-block rounded-[10px] px-3.5 py-2"
            style={{ background: P.caramel + "10" }}
          >
            <HandNote rotation={-1} className="text-xs" style={{ color: P.deepCaramel + "80" }}>
              {"\u{1F448}"} you scratch to reveal this in-app
            </HandNote>
          </div>
          {/* Stamp overlay */}
          <div className="pointer-events-none absolute right-4 bottom-4 opacity-25">
            <PassportStamp text={"VENUE\nREVEALED"} color={P.deepCaramel} rotation={12} />
          </div>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════
// STATS STRIPE — with animated countup + scribble circle
// ═══════════════════════════════════════════
function StatsStripe() {
  const [ref, vis] = useInView();
  const stats = [
    { n: "38", l: "humans, last event" },
    { n: "0", l: "phones used" },
    { n: "127", l: "mimosas downed" },
    { n: "95", l: "% show rate" },
  ];
  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="relative bg-near-black px-7 py-9"
      style={{ borderTop: `1px solid ${P.muted}10`, borderBottom: `1px solid ${P.muted}10` }}
    >
      <div className="mx-auto grid max-w-[440px] grid-cols-4 gap-2 text-center">
        {stats.map((s, i) => (
          <div
            key={i}
            className="relative transition-opacity duration-500"
            style={{ opacity: vis ? 1 : 0, transitionDelay: `${i * 0.1}s` }}
          >
            <div
              className="font-mono text-[22px] font-medium"
              style={{ color: i === 1 ? P.sage : P.cream }}
            >
              <CountUp target={s.n} vis={vis} />
            </div>
            <div
              className="mt-1 font-mono text-[8px] uppercase leading-[1.3] tracking-[1px] text-muted"
            >
              {s.l}
            </div>
          </div>
        ))}
      </div>
      {/* Scribble circle around the "0" */}
      <div
        className="pointer-events-none absolute top-[22px] transition-opacity duration-500"
        style={{
          left: "calc(37.5% - 12px)",
          opacity: vis ? 0.5 : 0,
          transitionDelay: "0.5s",
        }}
      >
        <ScribbleCircle width={50} color={P.sage} />
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════
// OVERHEARD — with decorative mega quote mark
// ═══════════════════════════════════════════
function Overheard() {
  const [ref, vis] = useInView();
  const quotes = [
    { q: "wait, is this what parties used to feel like?", c: "dance floor, 9:15 PM", color: P.caramel },
    { q: "i haven't laughed this hard since 2019", c: "yapping room, 7:42 PM", color: P.coral },
    { q: "my cheeks hurt from smiling. is that normal?", c: "fries station, 8:00 PM", color: P.sage },
  ];
  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="relative overflow-hidden bg-cream px-7 py-18"
    >
      {/* Giant quote mark */}
      <div
        className="pointer-events-none absolute top-2.5 left-1.5 font-serif leading-none"
        style={{ fontSize: "clamp(120px, 25vw, 180px)", color: P.nearBlack + "03" }}
      >
        {"\u201C"}
      </div>

      <div className="relative z-[2] mx-auto max-w-[440px]">
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

// ═══════════════════════════════════════════
// EVENTS — with fill bars
// ═══════════════════════════════════════════
function Events() {
  const [ref, vis] = useInView();
  const events = [
    {
      emoji: "\u{1F4F5}",
      title: "No Phone House Party",
      date: "Mar 8, 2026",
      tag: "phone-free",
      spots: "28 left of 60",
      accent: P.caramel,
      pct: 53,
    },
    {
      emoji: "\u{1F90D}",
      title: "No Color Holi",
      date: "Mar 14, 2026",
      tag: "all white",
      spots: "45 left of 80",
      accent: P.sage,
      pct: 44,
    },
  ];
  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="relative bg-near-black px-7 py-18"
    >
      <div className="mx-auto max-w-full sm:max-w-[440px]">
        <div className="mb-6 transition-opacity duration-500" style={{ opacity: vis ? 1 : 0 }}>
          <span className="font-mono text-[10px] uppercase tracking-[3px] text-muted">coming up</span>
          <h2
            className="mt-3 font-serif font-normal text-cream leading-[1.2]"
            style={{ fontSize: "clamp(24px, 5.5vw, 32px)" }}
          >
            next events
          </h2>
        </div>
        <div className="flex flex-col gap-3">
          {events.map((ev, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-[18px] transition-all duration-600"
              style={{
                background: P.cream + "05",
                border: `1px solid ${P.cream}08`,
                opacity: vis ? 1 : 0,
                transform: vis ? "translateY(0)" : "translateY(16px)",
                transitionDelay: `${i * 0.12}s`,
              }}
            >
              <div
                className="h-[3px]"
                style={{ background: `linear-gradient(90deg, ${ev.accent}, ${ev.accent}40)` }}
              />
              <div className="p-5">
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{ev.emoji}</span>
                    <div>
                      <div className="font-sans text-[15px] font-medium text-cream">{ev.title}</div>
                      <div className="font-mono text-[10px] text-muted">{ev.date}</div>
                    </div>
                  </div>
                  <span
                    className="rounded-full font-mono text-[9px] uppercase tracking-[1px]"
                    style={{
                      color: ev.accent,
                      background: ev.accent + "15",
                      padding: "4px 10px",
                    }}
                  >
                    {ev.tag}
                  </span>
                </div>
                {/* Fill bar */}
                <div>
                  <div className="mb-1 flex justify-between">
                    <span className="font-mono text-[10px] text-muted">{ev.spots}</span>
                    <span className="font-mono text-[10px]" style={{ color: ev.accent }}>
                      {ev.pct}%
                    </span>
                  </div>
                  <div
                    className="h-[3px] overflow-hidden rounded-[2px]"
                    style={{ background: P.cream + "10" }}
                  >
                    <div
                      className="h-full rounded-[2px] transition-all"
                      style={{
                        width: vis ? `${ev.pct}%` : "0%",
                        background: ev.accent,
                        transitionDuration: "1.2s",
                        transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)",
                        transitionDelay: `${0.3 + i * 0.15}s`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-5 text-center font-hand text-sm" style={{ color: P.muted + "50" }}>
          you need to be in to RSVP {"\u{1F512}"}
        </p>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════
// FINAL CTA — repeats both paths + seal
// ═══════════════════════════════════════════
function FinalCTA({
  onOpenChat,
  onScrollToCode,
}: {
  onOpenChat: () => void;
  onScrollToCode: () => void;
}) {
  const [ref, vis] = useInView();
  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="relative overflow-hidden bg-cream px-7 pt-18 pb-15 text-center"
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
            onClick={onScrollToCode}
            className="w-full cursor-pointer rounded-full border-none bg-near-black px-7 py-4 font-sans text-sm font-medium text-cream transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(26,23,21,0.15)] sm:w-auto"
          >
            i have a code
          </button>
          <button
            onClick={onOpenChat}
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

// ═══════════════════════════════════════════
// FOOTER
// ═══════════════════════════════════════════
function Footer() {
  return (
    <footer
      className="bg-gate-black px-7 py-9 text-center"
      style={{ borderTop: `1px solid ${P.muted}10` }}
    >
      <p className="font-serif text-base italic" style={{ color: P.muted + "40" }}>
        come offline.
      </p>
      <p className="mt-2 font-mono text-[9px] tracking-[1px]" style={{ color: P.muted + "25" }}>
        @comeoffline.blr
      </p>
    </footer>
  );
}

// ═══════════════════════════════════════════
// CHATBOT — bottom-sheet style
// ═══════════════════════════════════════════
function ChatBot({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<Array<{ role: string; text: string }>>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [vibeCheckPassed, setVibeCheckPassed] = useState(false);
  const [handoffToken, setHandoffToken] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const vibeDataRef = useRef<{ name: string; instagram: string; answers: { question: string; answer: string }[] }>({
    name: "",
    instagram: "",
    answers: [],
  });

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setTimeout(() => {
        setMessages([
          { role: "assistant", text: "hey. so you want in? \u{1F440}" },
          { role: "assistant", text: "tell me \u2014 got a code from someone, or trying to prove you belong?" },
        ]);
        setQuickReplies(["i have a code", "no code, prove me"]);
      }, 600);
    }
  }, [isOpen, messages.length]);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim()) return;
    const newMsgs = [...messages, { role: "user", text }];
    setMessages(newMsgs);
    setInput("");
    setQuickReplies([]);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMsgs.map((m) => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: m.text,
          })),
        }),
      });
      const data = await res.json();
      const reply = data.data?.message || "hmm, something went weird. try again?";

      // Check if the bot signaled a pass or fail via structured markers
      const passed = reply.includes("[VIBE_CHECK_PASSED]");
      const failed = reply.includes("[VIBE_CHECK_FAILED]");
      const cleanReply = reply
        .replace("[VIBE_CHECK_PASSED]", "")
        .replace("[VIBE_CHECK_FAILED]", "")
        .trim();

      const parts = cleanReply.split("\n").filter((p: string) => p.trim());
      for (let i = 0; i < parts.length; i++) {
        await new Promise((r) => setTimeout(r, 350));
        setMessages((prev) => [...prev, { role: "assistant", text: parts[i] }]);
      }

      // Extract name and instagram from conversation
      const userMessages = newMsgs.filter((m) => m.role === "user").map((m) => m.text);
      if (userMessages.length >= 2 && !vibeDataRef.current.name) {
        // Heuristic: second user message often contains their name
        vibeDataRef.current.name = userMessages[1];
      }
      // Collect all user answers as vibe check data
      const assistantMsgs = newMsgs.filter((m) => m.role === "assistant");
      vibeDataRef.current.answers = userMessages.map((answer, i) => ({
        question: assistantMsgs[i]?.text || `question ${i + 1}`,
        answer,
      }));

      if (passed) {
        // Try to extract name/IG from recent messages
        for (const msg of userMessages) {
          if (msg.startsWith("@") || msg.includes("instagram")) {
            vibeDataRef.current.instagram = msg.replace(/.*@/, "@").split(/\s/)[0];
          }
          // Use the latest non-@ message with reasonable length as name
          if (!msg.startsWith("@") && msg.length > 1 && msg.length < 40 && !vibeDataRef.current.name) {
            vibeDataRef.current.name = msg;
          }
        }

        // Create provisional account
        try {
          const entryRes = await fetch(`${API_URL}/api/auth/chatbot-entry`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: vibeDataRef.current.name || "new face",
              instagram_handle: vibeDataRef.current.instagram || undefined,
              vibe_answers: vibeDataRef.current.answers,
            }),
          });
          const entryData = await entryRes.json();
          if (entryData.success && entryData.data?.handoff_token) {
            setVibeCheckPassed(true);
            setHandoffToken(entryData.data.handoff_token);
          }
        } catch {
          // Account creation failed silently — user still sees the chat
        }
      }

      if (failed) {
        // Show retry option after a moment
        setTimeout(() => {
          setQuickReplies(["let me try again"]);
        }, 1000);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "oops, brain glitch. say that again?" }]);
    }
    setLoading(false);
  };

  const handleGoToApp = () => {
    if (handoffToken) {
      window.location.href = `${APP_URL}/?token=${handoffToken}&source=chatbot&status=provisional`;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex flex-col justify-end">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div
        className="relative flex max-h-[80vh] flex-col rounded-t-3xl bg-gate-black"
        style={{
          border: `1px solid ${P.muted}15`,
          borderBottom: "none",
          animation: "fadeSlideUp 0.4s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {/* Header */}
        <div
          className="flex shrink-0 items-center justify-between px-5 py-4"
          style={{ borderBottom: `1px solid ${P.muted}12` }}
        >
          <div>
            <span className="font-sans text-[15px] font-semibold text-cream">come offline bot</span>
            <span className="block font-mono text-[10px] text-sage">online {"\u00B7"} judging you</span>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-none text-base text-muted"
            style={{ background: P.cream + "10" }}
          >
            {"\u2715"}
          </button>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex min-h-[200px] max-h-[50vh] flex-1 flex-col gap-2.5 overflow-y-auto px-5 py-4"
        >
          {messages.map((m, i) => (
            <div
              key={i}
              className="max-w-[85%]"
              style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start" }}
            >
              <div
                className="px-4 py-3 font-sans text-sm leading-[1.5]"
                style={{
                  borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  background: m.role === "user" ? P.cream : P.cream + "08",
                  color: m.role === "user" ? P.gateBlack : P.cream,
                }}
              >
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ alignSelf: "flex-start" }}>
              <div
                className="rounded-[18px_18px_18px_4px] px-4 py-3"
                style={{ background: P.cream + "08" }}
              >
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-muted"
                      style={{ animation: `pulse 1s ease ${i * 0.15}s infinite` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick replies */}
        {quickReplies.length > 0 && (
          <div className="flex flex-wrap gap-2 px-5 pb-2.5">
            {quickReplies.map((q, i) => (
              <button
                key={i}
                onClick={() => send(q)}
                className="cursor-pointer rounded-full font-sans text-[13px] text-caramel transition-all duration-200 hover:bg-caramel/10"
                style={{
                  padding: "8px 16px",
                  border: `1px solid ${P.caramel}40`,
                  background: P.caramel + "08",
                }}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Vibe check passed CTA */}
        {vibeCheckPassed && handoffToken && (
          <div className="shrink-0 px-5 py-3" style={{ animation: "fadeSlideUp 0.4s ease" }}>
            <button
              onClick={handleGoToApp}
              className="w-full cursor-pointer rounded-2xl border-none py-4 font-sans text-[15px] font-semibold transition-all duration-300 hover:opacity-90"
              style={{ background: P.sage, color: "#fff" }}
            >
              see what&apos;s coming up {"\u2192"}
            </button>
          </div>
        )}

        {/* Input */}
        <div
          className="flex shrink-0 gap-2.5 px-5 pt-3.5 pb-7"
          style={{ borderTop: `1px solid ${P.muted}12` }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send(input)}
            placeholder="say something..."
            className="flex-1 rounded-[14px] font-sans text-sm text-cream"
            style={{
              padding: "12px 16px",
              border: `1px solid ${P.muted}20`,
              background: P.cream + "06",
            }}
          />
          <button
            onClick={() => send(input)}
            className="cursor-pointer rounded-[14px] border-none bg-cream px-4 py-3 font-sans text-sm font-semibold text-gate-black"
          >
            {"\u2191"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// FLOATING CHAT BUTTON
// ═══════════════════════════════════════════
function FloatingChatButton({ onClick, visible }: { onClick: () => void; visible: boolean }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-5 z-[900] flex h-[52px] w-[52px] cursor-pointer items-center justify-center rounded-full border-none bg-gate-black text-[22px] transition-all duration-300"
      style={{
        border: `1px solid ${P.caramel}30`,
        boxShadow: `0 4px 20px rgba(0,0,0,0.3), 0 0 12px ${P.caramel}15`,
        opacity: visible ? 1 : 0,
        transform: visible ? "scale(1)" : "scale(0.8)",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      {"\u{1F4AC}"}
    </button>
  );
}

// ═══════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════
export default function LandingPage() {
  const [chatOpen, setChatOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 400);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <div className="max-w-screen overflow-x-hidden">
      <Hero onOpenChat={() => setChatOpen(true)} />
      <MarqueeSection />
      <WhatIsThis />
      <HowItWorks />
      <GoldenTicket />
      <StatsStripe />
      <Overheard />
      <Events />
      <FinalCTA
        onOpenChat={() => setChatOpen(true)}
        onScrollToCode={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      />
      <Footer />
      <FloatingChatButton onClick={() => setChatOpen(true)} visible={scrolled && !chatOpen} />
      <ChatBot isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}
