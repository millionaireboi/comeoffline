"use client";

import { useState } from "react";
import { useAnalytics, CODE_VALIDATED, CODE_FAILED, CHATBOT_OPENED } from "@comeoffline/analytics";
import { P, API_URL, APP_URL } from "@/components/shared/P";
import { buildAppHandoffUrl } from "@/lib/handoff";
import { useChat } from "@/components/chat/ChatProvider";

const REJECTION_LINES = [
  "hmm, that's not it.",
  "nope. codes are picky like that.",
  "still not it. got the right one?",
  "close, maybe? but no.",
];

type CodeState = "idle" | "checking" | "valid" | "invalid";

/**
 * Compact entry card for the events-first homepage: code fast-track,
 * prove-yourself chat, and member sign-in — all above the fold without
 * a full-screen hero in the way.
 */
export function QuickEntry() {
  const { track, identify } = useAnalytics();
  const { openChat } = useChat();
  const [code, setCode] = useState("");
  const [codeState, setCodeState] = useState<CodeState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [failCount, setFailCount] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);

  const submit = async () => {
    if (Date.now() < lockedUntil) return;
    if (!code.trim() || codeState === "checking") return;
    setCodeState("checking");
    try {
      const res = await fetch(`${API_URL}/api/auth/validate-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (data.success && data.data?.handoff_token) {
        setCodeState("valid");
        track(CODE_VALIDATED, { source: "homepage_quick_entry" });
        if (data.data.user?.id) {
          identify(data.data.user.id, {
            handle: data.data.user.handle,
            name: data.data.user.name,
            entry: "homepage_quick_entry",
          });
        }
        setTimeout(() => {
          const pageParams = new URLSearchParams(window.location.search);
          window.location.href = buildAppHandoffUrl({
            token: data.data.handoff_token,
            utm: {
              utm_source: pageParams.get("utm_source") || undefined,
              utm_medium: pageParams.get("utm_medium") || undefined,
              utm_campaign: pageParams.get("utm_campaign") || undefined,
              utm_content: pageParams.get("utm_content") || undefined,
            },
          });
        }, 900);
      } else {
        setCodeState("invalid");
        track(CODE_FAILED, { source: "homepage_quick_entry", error: data.error });
        const apiError = (data.error || "").toLowerCase();
        if (apiError.includes("expired")) {
          setErrorMsg("that code has expired. ask for a fresh one.");
        } else if (apiError.includes("used") || apiError.includes("claimed")) {
          setErrorMsg("this code's already been claimed. got another?");
        } else {
          setErrorMsg(REJECTION_LINES[failCount % REJECTION_LINES.length]);
        }
        setFailCount((c) => c + 1);
        if (failCount >= 4) {
          setLockedUntil(Date.now() + 30000);
          setErrorMsg("too many attempts. take a breath, try in 30s.");
        }
        setTimeout(() => setCodeState("idle"), 3000);
      }
    } catch {
      setCodeState("invalid");
      setErrorMsg("something went wrong. try again?");
      setTimeout(() => setCodeState("idle"), 2000);
    }
  };

  return (
    <div
      className="rounded-[20px] border bg-white p-4 shadow-[0_2px_12px_rgba(26,23,21,0.05)]"
      style={{ borderColor: P.sand }}
    >
      <div className="mb-2.5 flex items-center justify-between">
        <span className="font-sans text-[13px] font-medium text-near-black">got an invite code?</span>
        <span
          className="rounded-full font-mono text-[9px] uppercase tracking-[1.5px]"
          style={{ color: "#6B7A63", background: P.sage + "26", padding: "3px 9px" }}
        >
          fast track
        </span>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            if (codeState === "invalid") setCodeState("idle");
          }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="ENTER YOUR CODE"
          className="min-w-0 flex-1 rounded-xl font-mono text-[12px] uppercase text-near-black transition-all duration-300 placeholder:text-muted/40"
          style={{
            padding: "12px 14px",
            letterSpacing: "2px",
            border: `1px solid ${codeState === "invalid" ? P.highlight + "70" : codeState === "valid" ? P.sage : P.sand}`,
            background: P.cream,
            animation: codeState === "invalid" ? "shake 0.4s ease" : "none",
          }}
        />
        <button
          onClick={submit}
          disabled={codeState === "checking" || codeState === "valid"}
          className="shrink-0 whitespace-nowrap rounded-xl border-none font-sans text-[13px] font-semibold text-cream transition-all duration-300"
          style={{
            padding: "12px 20px",
            background: codeState === "valid" ? P.sage : P.nearBlack,
            cursor: codeState === "checking" ? "wait" : "pointer",
            opacity: codeState === "checking" ? 0.6 : 1,
          }}
        >
          {codeState === "checking" ? "..." : codeState === "valid" ? "✓" : "go"}
        </button>
      </div>
      {codeState === "invalid" && (
        <p className="mt-2 font-hand text-sm" style={{ color: P.highlight, animation: "fadeIn 0.3s" }}>
          {errorMsg}
        </p>
      )}
      {codeState === "valid" && (
        <p className="mt-2 font-hand text-sm" style={{ color: "#6B7A63", animation: "fadeIn 0.3s" }}>
          welcome in. taking you to the app...
        </p>
      )}
      <div className="mt-3 flex items-center justify-between border-t pt-3" style={{ borderColor: P.sand }}>
        <button
          onClick={() => {
            track(CHATBOT_OPENED, { source: "homepage_quick_entry" });
            openChat();
          }}
          className="cursor-pointer border-none bg-transparent p-0 font-sans text-[12px] text-warm-brown underline-offset-2 hover:underline"
        >
          no code? <span className="text-caramel">prove yourself →</span>
        </button>
        <a
          href={`${APP_URL}/sign-in`}
          className="font-sans text-[12px] text-warm-brown no-underline underline-offset-2 hover:underline"
        >
          member? <span className="text-caramel">sign in →</span>
        </a>
      </div>
    </div>
  );
}
