"use client";

import { useState, useEffect } from "react";
import { P, API_URL, APP_URL } from "@/components/shared/P";
import { HandNote } from "@/components/shared/HandNote";
import { Sticker } from "@/components/shared/Sticker";
import { RotatingSeal } from "@/components/shared/RotatingSeal";
import { SocialTicker } from "@/components/shared/SocialTicker";
import { ScribbleStar } from "@/components/shared/Scribbles";
import { FilmGrain } from "@/components/shared/FilmGrain";
import { useChat } from "@/components/chat/ChatProvider";

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

export function Hero() {
  const { openChat } = useChat();
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
        setTimeout(() => {
          window.location.href = `${APP_URL}/?token=${data.data.handoff_token}&source=landing`;
        }, 1200);
      } else {
        setCodeState("invalid");
        const apiError = data.error?.toLowerCase() || "";
        if (apiError.includes("expired")) {
          setErrorMsg("that code has expired. ask for a fresh one.");
        } else if (apiError.includes("used") || apiError.includes("claimed")) {
          setErrorMsg("this code's already been claimed. got another?");
        } else {
          setErrorMsg(REJECTION_LINES[failCount % REJECTION_LINES.length]);
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
      <FilmGrain />
      {/* Ghost text */}
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-serif font-normal"
        style={{ fontSize: "clamp(120px, 25vw, 220px)", color: P.muted + "04", letterSpacing: "-8px" }}
      >
        offline
      </div>

      {/* Rotating seal */}
      <div
        className="pointer-events-none absolute top-[60px] right-3 transition-opacity duration-1000"
        style={{ opacity: phase >= 2 ? 0.7 : 0, transitionDelay: "0.5s" }}
      >
        <RotatingSeal size={78} />
      </div>

      {/* Stars */}
      <div className="pointer-events-none absolute top-[14%] right-[16%] transition-opacity duration-800" style={{ opacity: phase >= 2 ? 1 : 0, transitionDelay: "1s" }}>
        <ScribbleStar color={P.caramel} />
      </div>
      <div className="pointer-events-none absolute bottom-[22%] right-[8%] transition-opacity duration-800" style={{ opacity: phase >= 2 ? 1 : 0, transitionDelay: "1.3s" }}>
        <ScribbleStar color={P.blush} size={10} />
      </div>
      <div className="pointer-events-none absolute top-[35%] left-[5%] transition-opacity duration-800" style={{ opacity: phase >= 2 ? 1 : 0, transitionDelay: "1.1s" }}>
        <ScribbleStar color={P.sage} size={11} />
      </div>

      <div className="relative z-[2] mx-auto flex min-h-screen max-w-full flex-col justify-center px-5 pt-16 pb-12 sm:max-w-[500px] sm:px-6 sm:pt-20 sm:pb-15">
        {/* Top bar */}
        <div className="absolute top-4 right-4 left-4 flex items-center justify-between sm:top-6 sm:right-6 sm:left-6" style={{ animation: "fadeIn 0.8s ease 0.2s both" }}>
          <span className="font-mono text-[9px] uppercase tracking-[2px] sm:text-[10px] sm:tracking-[3px]" style={{ color: P.muted + "40" }}>est. 2026</span>
          <span className="font-mono text-[9px] uppercase tracking-[2px] sm:text-[10px] sm:tracking-[3px]" style={{ color: P.muted + "40" }}>bangalore</span>
        </div>

        {/* Title */}
        <div style={{ animation: "fadeSlideUp 1s cubic-bezier(0.16,1,0.3,1) 0.3s both" }}>
          <h1 className="mb-1 font-serif font-normal text-cream" style={{ fontSize: "clamp(44px, 15vw, 80px)", letterSpacing: "-2.5px", lineHeight: 0.9 }}>come</h1>
          <h1 className="font-serif font-normal italic text-cream" style={{ fontSize: "clamp(44px, 15vw, 80px)", letterSpacing: "-2.5px", lineHeight: 0.9 }}>offline.</h1>
        </div>

        {/* Divider */}
        <div className="my-7 h-0.5 bg-caramel transition-all duration-800" style={{ width: phase >= 1 ? "60px" : "0px", transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)", transitionDelay: "0.5s" }} />

        {/* Tagline */}
        <div className="mb-4 min-h-[26px]">
          <p className="font-sans italic text-muted" style={{ fontSize: "clamp(15px, 3.2vw, 19px)" }}>
            {typed}
            {typed.length < tag.length && <span className="ml-0.5 inline-block animate-blink align-middle" style={{ width: "2px", height: "16px", background: P.caramel }} />}
          </p>
        </div>

        {phase >= 2 && (
          <div className="animate-fade-slide-up">
            <p className="mb-1.5 font-sans text-[13px] leading-[1.7]" style={{ color: P.muted + "40" }}>
              <span style={{ textDecoration: "line-through", textDecorationColor: P.highlight + "50" }}>another networking event in bangalore</span>
            </p>
            <p className="mb-7 font-sans text-[13px] leading-[1.7]" style={{ color: P.muted + "60" }}>
              curated events. curated people. no randos, no algorithms, no startup small talk.
            </p>

            <div className="flex flex-col gap-3.5">
              {/* Code path */}
              <div className="rounded-[18px] p-5 backdrop-blur-[10px]" style={{ background: P.cream + "08", border: `1px solid ${P.cream}12`, animation: "fadeSlideUp 0.6s ease 0.1s both" }}>
                <div className="mb-3.5 flex items-center justify-between">
                  <span className="font-sans text-[15px] font-medium text-cream">i have a code</span>
                  <span className="rounded-full font-mono text-[9px] uppercase tracking-[1.5px]" style={{ color: P.sage, background: P.sage + "18", padding: "4px 10px" }}>fast track</span>
                </div>
                <div className="flex gap-2.5">
                  <input
                    value={code}
                    onChange={(e) => { setCode(e.target.value.toUpperCase()); if (codeState === "invalid") setCodeState("idle"); }}
                    onKeyDown={(e) => e.key === "Enter" && handleCodeSubmit()}
                    placeholder="ENTER YOUR CODE"
                    className="flex-1 rounded-xl font-mono text-[13px] uppercase text-cream transition-all duration-300"
                    style={{ padding: "14px 16px", letterSpacing: "2px", border: `1px solid ${codeState === "invalid" ? P.highlight + "60" : codeState === "valid" ? P.sage + "60" : P.cream + "15"}`, background: P.cream + "06", animation: codeState === "invalid" ? "shake 0.4s ease" : "none" }}
                  />
                  <button
                    onClick={handleCodeSubmit}
                    disabled={codeState === "checking" || codeState === "valid"}
                    className="shrink-0 whitespace-nowrap rounded-xl border-none font-sans text-[13px] font-semibold transition-all duration-300"
                    style={{ padding: "14px 22px", background: codeState === "valid" ? P.sage : P.cream, color: codeState === "valid" ? "#fff" : P.gateBlack, cursor: codeState === "checking" ? "wait" : "pointer", opacity: codeState === "checking" ? 0.6 : 1 }}
                  >
                    {codeState === "checking" ? "..." : codeState === "valid" ? "\u2713" : "go"}
                  </button>
                </div>
                {codeState === "invalid" && (
                  <p className="mt-2 font-hand text-sm text-highlight" style={{ animation: "fadeIn 0.3s" }}>{errorMsg}</p>
                )}
                {codeState === "invalid" && failCount >= 3 && (
                  <p className="mt-1 font-sans text-[11px]" style={{ color: P.muted + "60", animation: "fadeIn 0.3s" }}>
                    no code? try the{" "}
                    <button onClick={openChat} className="cursor-pointer underline" style={{ color: P.caramel }}>prove yourself</button>{" "}
                    path instead
                  </p>
                )}
                {codeState === "valid" && (
                  <p className="mt-2 font-hand text-sm text-sage" style={{ animation: "fadeIn 0.3s" }}>welcome in. taking you to the app...</p>
                )}
              </div>

              {/* OR */}
              <div className="flex items-center gap-3.5 px-1">
                <div className="h-px flex-1" style={{ background: P.cream + "10" }} />
                <HandNote rotation={0} className="text-sm" style={{ color: P.muted + "50" }}>or</HandNote>
                <div className="h-px flex-1" style={{ background: P.cream + "10" }} />
              </div>

              {/* Prove path */}
              <button
                onClick={openChat}
                className="w-full cursor-pointer rounded-[18px] p-5 text-left transition-all duration-300 hover:border-caramel/60"
                style={{ border: `1.5px dashed ${P.caramel}40`, background: P.caramel + "06", animation: "fadeSlideUp 0.6s ease 0.2s both" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = P.caramel + "12"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = P.caramel + "06"; }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="mb-1 block font-sans text-[15px] font-medium text-cream">no code? prove yourself.</span>
                    <span className="font-sans text-xs" style={{ color: P.muted + "70" }}>chat with our bot, pass the vibe check, get in</span>
                  </div>
                  <span className="ml-3 text-[22px] text-caramel">{"\u2192"}</span>
                </div>
              </button>
            </div>

            <div className="mt-6" style={{ animation: "fadeIn 1s ease 0.8s both" }}>
              <SocialTicker />
            </div>
          </div>
        )}
      </div>

      <Sticker text="invite only" rotation={-4} color={P.caramel} top="16%" right="16px" visible={phase >= 2} delay={0.4} />
      <Sticker text="phones down" rotation={3} color={P.blush} bottom="20%" right="20px" visible={phase >= 2} delay={0.6} />
    </section>
  );
}
