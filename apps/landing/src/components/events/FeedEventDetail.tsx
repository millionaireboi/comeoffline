"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useAnalytics, EVENT_DETAIL_OPENED, GATE_OPENED, CODE_VALIDATED, CODE_FAILED, CHATBOT_OPENED, EVENT_SHARED, SIGNIN_STARTED, SIGNIN_SUCCESS, SIGNIN_FAILED } from "@comeoffline/analytics";
import { P, API_URL, APP_URL } from "@/components/shared/P";
import { SpotsBar } from "@/components/events/SpotsBar";
import { useChat } from "@/components/chat/ChatProvider";

interface FeedEventDetailProps {
  event: any;
  onClose: () => void;
}

type GateStage = "idle" | "gate" | "confirmed";
type GateTab = "join" | "signin";
type SignInStep = "handle" | "pin";

const notFoundLines = [
  "hmm, can't find you.",
  "we don't recognize that one.",
  "no account with that handle.",
  "are you sure that's right?",
];

function CoverMedia({ event }: { event: any }) {
  const isVideo = event.cover_type === "video";
  const images: string[] = isVideo
    ? []
    : [event.cover_url, ...(event.gallery_urls || [])];
  const hasCarousel = images.length > 1;
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!hasCarousel) return;
    const timer = setInterval(() => {
      setActive((prev) => (prev + 1) % images.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [hasCarousel, images.length]);

  if (isVideo) {
    return (
      <div style={{ position: "relative", width: "100%", height: 200, overflow: "hidden", flexShrink: 0 }}>
        <video
          src={event.cover_url}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          muted
          loop
          playsInline
          autoPlay
          preload="metadata"
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to top, rgba(0,0,0,0.35), transparent, rgba(0,0,0,0.15))",
            pointerEvents: "none",
          }}
        />
      </div>
    );
  }

  if (hasCarousel) {
    return (
      <div style={{ position: "relative", width: "100%", height: 200, overflow: "hidden", flexShrink: 0 }}>
        <div
          style={{
            display: "flex",
            height: "100%",
            transition: "transform 0.5s ease-in-out",
            transform: `translateX(-${active * 100}%)`,
          }}
        >
          {images.map((url, i) => (
            <img
              key={url}
              src={url}
              alt={i === 0 ? event.title : `${event.title} ${i + 1}`}
              style={{
                width: "100%",
                height: 200,
                objectFit: "cover",
                flexShrink: 0,
                display: "block",
              }}
            />
          ))}
        </div>
        {/* Dots */}
        <div
          style={{
            position: "absolute",
            bottom: 10,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: 6,
          }}
        >
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              aria-label={`Go to slide ${i + 1}`}
              style={{
                width: i === active ? 16 : 6,
                height: 6,
                borderRadius: 3,
                border: "none",
                padding: 0,
                cursor: "pointer",
                background: i === active ? "#fff" : "rgba(255,255,255,0.5)",
                transition: "all 0.3s ease",
              }}
            />
          ))}
        </div>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to top, rgba(0,0,0,0.35), transparent, rgba(0,0,0,0.15))",
            pointerEvents: "none",
          }}
        />
      </div>
    );
  }

  // Single image
  return (
    <div style={{ position: "relative", width: "100%", height: 200, overflow: "hidden", flexShrink: 0 }}>
      <img
        src={event.cover_url}
        alt={event.title}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to top, rgba(0,0,0,0.35), transparent, rgba(0,0,0,0.15))",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

export function FeedEventDetail({ event, onClose }: FeedEventDetailProps) {
  const { openChat } = useChat();
  const { track } = useAnalytics();
  const [gateStage, setGateStage] = useState<GateStage>("idle");
  const [gateTab, setGateTab] = useState<GateTab>("join");
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [shaking, setShaking] = useState(false);
  const [validating, setValidating] = useState(false);
  const codeInputRef = useRef<HTMLInputElement>(null);

  // Sign-in state
  const [signInStep, setSignInStep] = useState<SignInStep>("handle");
  const [signInHandle, setSignInHandle] = useState("");
  const [signInPin, setSignInPin] = useState("");
  const [signInError, setSignInError] = useState("");
  const [signInLoading, setSignInLoading] = useState(false);
  const [signInErrorIdx, setSignInErrorIdx] = useState(0);
  const signInInputRef = useRef<HTMLInputElement>(null);
  const pinInputRef = useRef<HTMLInputElement>(null);

  const accent = event.accent || P.caramel;
  const accentDark = event.accent_dark || P.deepCaramel;
  const spotsLeft = event.total_spots - event.spots_taken;

  // Compute days until venue reveal
  let daysUntilVenue: number | null = null;
  if (event.venue_reveal_date) {
    const now = new Date();
    const reveal = new Date(event.venue_reveal_date);
    const diffMs = reveal.getTime() - now.getTime();
    daysUntilVenue = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  // Track event detail opened
  useEffect(() => {
    track(EVENT_DETAIL_OPENED, {
      event_id: event.id,
      event_title: event.title,
      spots_remaining: spotsLeft,
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Lock body scroll when detail is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Auto-focus code input when gate opens
  useEffect(() => {
    if (gateStage === "gate" && gateTab === "join") {
      setTimeout(() => codeInputRef.current?.focus(), 400);
    }
  }, [gateStage, gateTab]);

  // Auto-focus sign-in inputs
  useEffect(() => {
    if (gateStage === "gate" && gateTab === "signin") {
      if (signInStep === "handle") {
        setTimeout(() => signInInputRef.current?.focus(), 400);
      } else if (signInStep === "pin") {
        setTimeout(() => pinInputRef.current?.focus(), 100);
      }
    }
  }, [gateStage, gateTab, signInStep]);

  const handleImIn = useCallback(() => {
    track(GATE_OPENED, { event_id: event.id, event_title: event.title });
    setGateTab("join");
    setSignInStep("handle");
    setSignInHandle("");
    setSignInPin("");
    setSignInError("");
    setGateStage("gate");
  }, [event.id, event.title, track]);

  const handleValidateCode = useCallback(async () => {
    if (!code.trim()) {
      setCodeError("enter your code");
      return;
    }

    setValidating(true);
    setCodeError("");

    try {
      const res = await fetch(`${API_URL}/api/auth/validate-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });
      const data = await res.json();

      if (data.success && data.data?.handoff_token) {
        track(CODE_VALIDATED, { event_id: event.id });
        setGateStage("confirmed");
        setTimeout(() => {
          window.location.href = `${APP_URL}?token=${data.data.handoff_token}`;
        }, 1200);
      } else {
        track(CODE_FAILED, { event_id: event.id, error: data.message });
        setCodeError(data.message || "invalid code");
        setShaking(true);
        setTimeout(() => setShaking(false), 500);
      }
    } catch {
      track(CODE_FAILED, { event_id: event.id, error: "network" });
      setCodeError("something went wrong. try again.");
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
    } finally {
      setValidating(false);
    }
  }, [code]);

  const handleNoCode = useCallback(() => {
    track(CHATBOT_OPENED, { event_id: event.id, source: "no_code" });
    onClose();
    setTimeout(() => {
      openChat();
    }, 200);
  }, [event.id, onClose, openChat, track]);

  const handleSignIn = useCallback(async () => {
    const trimmed = signInHandle.trim().replace(/^@/, "").replace(/\s/g, "").toLowerCase();
    if (!trimmed || signInLoading) return;

    if (signInStep === "pin" && signInPin.length !== 4) {
      setSignInError("enter your 4-digit PIN");
      return;
    }

    setSignInError("");
    setSignInLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/sign-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handle: trimmed,
          source: "landing",
          ...(signInStep === "pin" && { pin: signInPin }),
        }),
      });
      const data = await res.json();

      if (data.success && data.data?.handoff_token) {
        track(SIGNIN_SUCCESS, { event_id: event.id });
        setGateStage("confirmed");
        setTimeout(() => {
          window.location.href = `${APP_URL}?token=${data.data.handoff_token}&source=landing`;
        }, 1200);
      } else if (data.needs_pin) {
        setSignInStep("pin");
        setSignInPin("");
        setSignInError("");
      } else if (res.status === 429) {
        track(SIGNIN_FAILED, { event_id: event.id, error: "rate_limited" });
        setSignInError("too many attempts. wait a bit and try again.");
      } else {
        track(SIGNIN_FAILED, { event_id: event.id, error: signInStep === "pin" ? "wrong_pin" : "not_found" });
        if (signInStep === "pin") {
          setSignInError("wrong PIN. try again.");
          setSignInPin("");
        } else {
          setSignInError(notFoundLines[signInErrorIdx % notFoundLines.length]);
          setSignInErrorIdx((i) => i + 1);
        }
      }
    } catch {
      track(SIGNIN_FAILED, { event_id: event.id, error: "network" });
      setSignInError("something went wrong. try again.");
    } finally {
      setSignInLoading(false);
    }
  }, [signInHandle, signInPin, signInStep, signInLoading, signInErrorIdx, event.id, track]);

  const switchToSignIn = useCallback(() => {
    track(SIGNIN_STARTED, { event_id: event.id });
    setGateTab("signin");
    setSignInStep("handle");
    setSignInHandle("");
    setSignInPin("");
    setSignInError("");
  }, [event.id, track]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 600,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(14, 13, 11, 0.6)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
      />

      {/* Bottom sheet */}
      <div
        style={{
          position: "relative",
          background: gateStage === "gate" ? P.nearBlack : P.cream,
          borderRadius: "24px 24px 0 0",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          animation: "sheetSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
          transition: "background 0.4s ease",
        }}
      >
        {/* Accent gradient top bar */}
        <div
          style={{
            height: 4,
            borderRadius: "24px 24px 0 0",
            background: `linear-gradient(90deg, ${accent}, ${accentDark || accent}80)`,
            flexShrink: 0,
          }}
        />

        {/* ===== GATE VIEW — replaces entire sheet when active ===== */}
        {gateStage === "gate" && (
          <div
            style={{
              padding: "32px 24px 40px",
              display: "flex",
              flexDirection: "column",
              animation: "gateFadeIn 0.35s ease",
            }}
          >
            {/* Close button */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
              <button
                onClick={() => setGateStage("idle")}
                aria-label="Back to event details"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 18,
                  color: P.muted,
                  padding: "4px 8px",
                  lineHeight: 1,
                }}
              >
                &times;
              </button>
            </div>

            {/* Event context */}
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <span style={{ fontSize: 36, display: "block", marginBottom: 10 }}>{event.emoji}</span>
              <h3
                className="font-serif font-normal"
                style={{ fontSize: 22, color: P.cream, margin: "0 0 6px", lineHeight: 1.2 }}
              >
                {event.title}
              </h3>
              <p className="font-mono text-[10px] uppercase tracking-[2px]" style={{ color: P.muted, margin: 0 }}>
                {event.date} &middot; {spotsLeft} spots left
              </p>
            </div>

            {/* "Already a member?" hint */}
            {gateTab === "join" && (
              <button
                onClick={switchToSignIn}
                className="font-sans text-[12px]"
                style={{
                  display: "block",
                  width: "100%",
                  background: "none",
                  border: "none",
                  color: P.muted,
                  textAlign: "center",
                  cursor: "pointer",
                  padding: 0,
                  marginBottom: 16,
                  transition: "color 0.2s",
                }}
              >
                already a member?{" "}
                <span style={{ color: P.cream, textDecoration: "underline", textUnderlineOffset: 2 }}>
                  sign in
                </span>
              </button>
            )}

            {/* Pill toggle */}
            <div
              style={{
                display: "flex",
                background: P.cream + "08",
                borderRadius: 10,
                padding: 3,
                marginBottom: 24,
                border: `1px solid ${P.cream}10`,
              }}
            >
              <button
                onClick={() => setGateTab("join")}
                className="font-mono text-[11px] uppercase tracking-[1.5px]"
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.25s ease",
                  background: gateTab === "join" ? P.cream + "15" : "transparent",
                  color: gateTab === "join" ? P.cream : P.muted + "60",
                }}
              >
                join
              </button>
              <button
                onClick={switchToSignIn}
                className="font-mono text-[11px] uppercase tracking-[1.5px]"
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.25s ease",
                  background: gateTab === "signin" ? P.cream + "15" : "transparent",
                  color: gateTab === "signin" ? P.cream : P.muted + "60",
                }}
              >
                sign in
              </button>
            </div>

            {/* ===== JOIN TAB ===== */}
            {gateTab === "join" && (
              <div style={{ animation: "gateFadeIn 0.25s ease" }}>
                {/* Code input section */}
                <p
                  className="font-sans text-[13px]"
                  style={{ color: P.muted, margin: "0 0 14px", textAlign: "center" }}
                >
                  enter your invite code
                </p>

                <div
                  style={{
                    background: P.gateBlack,
                    borderRadius: 14,
                    padding: "16px 18px",
                    marginBottom: 14,
                    border: `1.5px solid ${codeError ? P.coral : P.cream + "12"}`,
                    animation: shaking ? "shake 0.4s ease" : "none",
                  }}
                >
                  <input
                    ref={codeInputRef}
                    type="text"
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.toUpperCase());
                      setCodeError("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleValidateCode();
                    }}
                    placeholder="ENTER CODE"
                    className="font-mono text-[18px] uppercase tracking-[4px]"
                    style={{
                      width: "100%",
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      color: P.cream,
                      textAlign: "center",
                    }}
                  />
                </div>

                {/* Error message */}
                {codeError && (
                  <p
                    className="font-sans text-[12px]"
                    style={{ color: P.coral, textAlign: "center", margin: "0 0 10px" }}
                  >
                    {codeError}
                  </p>
                )}

                {/* Submit button */}
                <button
                  onClick={handleValidateCode}
                  disabled={validating}
                  className="font-sans text-[14px] font-semibold"
                  style={{
                    display: "block",
                    width: "100%",
                    background: accent,
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: 12,
                    padding: "14px 0",
                    cursor: validating ? "wait" : "pointer",
                    opacity: validating ? 0.7 : 1,
                    transition: "opacity 0.2s",
                    marginBottom: 20,
                  }}
                >
                  {validating ? "checking..." : "let me in"}
                </button>

                {/* Divider with "or" */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "0 0 20px" }}>
                  <div style={{ flex: 1, height: 1, background: P.cream + "10" }} />
                  <span className="font-mono text-[10px] uppercase tracking-[1.5px]" style={{ color: P.muted + "80" }}>
                    or
                  </span>
                  <div style={{ flex: 1, height: 1, background: P.cream + "10" }} />
                </div>

                {/* Prove yourself — prominent CTA */}
                <button
                  onClick={handleNoCode}
                  className="font-sans text-[14px] font-medium"
                  style={{
                    display: "block",
                    width: "100%",
                    background: P.cream + "0A",
                    color: P.cream,
                    border: `1.5px solid ${P.cream}20`,
                    borderRadius: 12,
                    padding: "14px 0",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  no code? prove yourself &rarr;
                </button>
                <p
                  className="font-sans text-[11px]"
                  style={{ color: P.muted + "80", textAlign: "center", margin: "10px 0 0", lineHeight: 1.4 }}
                >
                  chat with our bot &mdash; pass the vibe check, get in
                </p>
              </div>
            )}

            {/* ===== SIGN IN TAB ===== */}
            {gateTab === "signin" && (
              <div style={{ animation: "gateFadeIn 0.25s ease" }}>
                {/* Handle step */}
                {signInStep === "handle" && (
                  <>
                    <p
                      className="font-sans text-[13px]"
                      style={{ color: P.muted, margin: "0 0 14px", textAlign: "center" }}
                    >
                      enter your handle, phone, or instagram
                    </p>

                    <div
                      style={{
                        background: P.gateBlack,
                        borderRadius: 14,
                        padding: "16px 18px",
                        marginBottom: 14,
                        border: `1.5px solid ${signInError ? P.coral : P.cream + "12"}`,
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      {!/^\+?\d/.test(signInHandle) && (
                        <span
                          className="font-sans text-[16px]"
                          style={{ color: P.muted + "50", marginRight: 2, flexShrink: 0 }}
                        >
                          @
                        </span>
                      )}
                      <input
                        ref={signInInputRef}
                        type="text"
                        value={signInHandle}
                        onChange={(e) => {
                          setSignInHandle(e.target.value.replace(/^@/, "").replace(/\s/g, ""));
                          setSignInError("");
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSignIn();
                        }}
                        placeholder="handle or phone number"
                        autoComplete="username"
                        autoCapitalize="none"
                        autoCorrect="off"
                        className="font-sans text-[16px]"
                        style={{
                          width: "100%",
                          background: "transparent",
                          border: "none",
                          outline: "none",
                          color: P.cream,
                        }}
                      />
                    </div>

                    {signInError && (
                      <p
                        className="font-sans text-[12px]"
                        style={{ color: P.coral, textAlign: "center", margin: "0 0 10px" }}
                      >
                        {signInError}
                      </p>
                    )}

                    <button
                      onClick={handleSignIn}
                      disabled={signInLoading || !signInHandle.trim()}
                      className="font-sans text-[14px] font-semibold"
                      style={{
                        display: "block",
                        width: "100%",
                        background: signInHandle.trim() ? P.cream : P.cream + "15",
                        color: signInHandle.trim() ? P.nearBlack : P.muted + "40",
                        border: "none",
                        borderRadius: 12,
                        padding: "14px 0",
                        cursor: signInHandle.trim() ? "pointer" : "default",
                        opacity: signInLoading ? 0.6 : 1,
                        transition: "all 0.2s",
                      }}
                    >
                      {signInLoading ? "finding you..." : "next \u2192"}
                    </button>
                  </>
                )}

                {/* PIN step */}
                {signInStep === "pin" && (
                  <>
                    <p
                      className="font-sans text-[13px]"
                      style={{ color: P.muted, margin: "0 0 4px", textAlign: "center" }}
                    >
                      signing in as{" "}
                      <span style={{ color: P.cream }}>@{signInHandle.trim().replace(/^@/, "").toLowerCase()}</span>
                    </p>
                    <p
                      className="font-sans text-[13px]"
                      style={{ color: P.muted, margin: "0 0 14px", textAlign: "center" }}
                    >
                      enter your 4-digit PIN
                    </p>

                    <div
                      style={{
                        background: P.gateBlack,
                        borderRadius: 14,
                        padding: "16px 18px",
                        marginBottom: 14,
                        border: `1.5px solid ${signInError ? P.coral : P.cream + "12"}`,
                      }}
                    >
                      <input
                        ref={pinInputRef}
                        type="password"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={4}
                        autoComplete="current-password"
                        value={signInPin}
                        onChange={(e) => {
                          setSignInPin(e.target.value.replace(/\D/g, "").slice(0, 4));
                          setSignInError("");
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSignIn();
                        }}
                        placeholder="\u2022\u2022\u2022\u2022"
                        className="font-mono text-[24px] tracking-[12px]"
                        style={{
                          width: "100%",
                          background: "transparent",
                          border: "none",
                          outline: "none",
                          color: P.cream,
                          textAlign: "center",
                        }}
                      />
                    </div>

                    {signInError && (
                      <p
                        className="font-sans text-[12px]"
                        style={{ color: P.coral, textAlign: "center", margin: "0 0 10px" }}
                      >
                        {signInError}
                      </p>
                    )}

                    <button
                      onClick={handleSignIn}
                      disabled={signInLoading || signInPin.length !== 4}
                      className="font-sans text-[14px] font-semibold"
                      style={{
                        display: "block",
                        width: "100%",
                        background: signInPin.length === 4 ? P.cream : P.cream + "15",
                        color: signInPin.length === 4 ? P.nearBlack : P.muted + "40",
                        border: "none",
                        borderRadius: 12,
                        padding: "14px 0",
                        cursor: signInPin.length === 4 ? "pointer" : "default",
                        opacity: signInLoading ? 0.6 : 1,
                        transition: "all 0.2s",
                        marginBottom: 12,
                      }}
                    >
                      {signInLoading ? "checking..." : "sign in \u2192"}
                    </button>

                    <button
                      onClick={() => {
                        setSignInStep("handle");
                        setSignInPin("");
                        setSignInError("");
                      }}
                      className="font-sans text-[12px]"
                      style={{
                        display: "block",
                        width: "100%",
                        background: "none",
                        border: "none",
                        color: P.muted + "60",
                        textAlign: "center",
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      &larr; use a different handle
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ===== CONFIRMED VIEW ===== */}
        {gateStage === "confirmed" && (
          <div
            style={{
              padding: "48px 24px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              animation: "gateFadeIn 0.35s ease",
            }}
          >
            <span style={{ fontSize: 48, marginBottom: 16 }}>{event.emoji}</span>
            <div
              className="font-sans text-[16px] font-semibold"
              style={{
                display: "block",
                width: "100%",
                background: P.sage,
                color: "#FFFFFF",
                borderRadius: 14,
                padding: "15px 0",
                textAlign: "center",
                letterSpacing: 0.3,
              }}
            >
              you&apos;re in &#10003;
            </div>
            <p className="font-sans text-[13px]" style={{ color: P.muted, marginTop: 12 }}>
              redirecting you...
            </p>
          </div>
        )}

        {/* ===== IDLE VIEW — event details ===== */}
        {gateStage === "idle" && (
          <>
            {/* Cover media / carousel */}
            {event.cover_url && (
              <CoverMedia event={event} />
            )}

            {/* Header */}
            <div style={{ padding: "20px 20px 0", flexShrink: 0 }}>
              {/* Close + tag row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span
                  className="font-mono text-[9px] uppercase tracking-[1.5px]"
                  style={{
                    display: "inline-block",
                    color: accent,
                    background: accent + "12",
                    borderRadius: 20,
                    padding: "4px 10px",
                  }}
                >
                  {event.tag}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <button
                    onClick={async () => {
                      const url = typeof window !== "undefined"
                        ? `${window.location.origin}/events/${event.id}`
                        : `https://comeoffline.com/events/${event.id}`;
                      const shareData = { title: event.title, text: event.tagline, url };
                      if (typeof navigator !== "undefined" && navigator.share) {
                        try {
                          await navigator.share(shareData);
                          track(EVENT_SHARED, { event_id: event.id, method: "native" });
                        } catch { /* cancelled */ }
                      } else {
                        try {
                          await navigator.clipboard.writeText(url);
                          track(EVENT_SHARED, { event_id: event.id, method: "clipboard" });
                        } catch { /* fallback */ }
                      }
                    }}
                    aria-label="Share event"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 18,
                      color: P.muted,
                      padding: "4px 8px",
                      lineHeight: 1,
                    }}
                  >
                    &#8599;
                  </button>
                  <button
                    onClick={onClose}
                    aria-label="Close event details"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 20,
                      color: P.muted,
                      padding: "4px 8px",
                      lineHeight: 1,
                    }}
                  >
                    &times;
                  </button>
                </div>
              </div>

              {/* Title + emoji */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 4 }}>
                <h2
                  className="font-serif font-normal"
                  style={{
                    fontSize: 26,
                    lineHeight: 1.15,
                    color: P.nearBlack,
                    margin: 0,
                    flex: 1,
                  }}
                >
                  {event.title}
                </h2>
                <span style={{ fontSize: 30, flexShrink: 0 }}>{event.emoji}</span>
              </div>

              {/* Tagline */}
              <p
                className="font-sans text-[14px]"
                style={{
                  color: P.warmBrown,
                  fontStyle: "italic",
                  margin: "0 0 16px",
                  lineHeight: 1.4,
                }}
              >
                {event.tagline}
              </p>
            </div>

            {/* Scrollable body */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "0 20px 120px",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {/* Date & time */}
              <div
                style={{
                  display: "flex",
                  gap: 24,
                  marginBottom: 16,
                  paddingBottom: 16,
                  borderBottom: `1px solid ${P.sand}`,
                }}
              >
                <div>
                  <span className="font-mono text-[9px] uppercase tracking-[1px]" style={{ color: P.muted }}>
                    date
                  </span>
                  <p className="font-sans text-[14px] font-medium" style={{ color: P.nearBlack, margin: "4px 0 0" }}>
                    {event.date}
                  </p>
                </div>
                <div>
                  <span className="font-mono text-[9px] uppercase tracking-[1px]" style={{ color: P.muted }}>
                    time
                  </span>
                  <p className="font-sans text-[14px] font-medium" style={{ color: P.nearBlack, margin: "4px 0 0" }}>
                    {event.time}
                  </p>
                </div>
                {(daysUntilVenue !== null || event.venue_name) && (
                  <div>
                    <span className="font-mono text-[9px] uppercase tracking-[1px]" style={{ color: P.muted }}>
                      venue
                    </span>
                    <p className="font-sans text-[14px] font-medium" style={{ color: event.venue_name ? P.nearBlack : accent, margin: "4px 0 0" }}>
                      {event.venue_name
                        ? event.venue_name
                        : daysUntilVenue && daysUntilVenue > 0
                          ? `drops in ${daysUntilVenue}d`
                          : "dropping soon"}
                    </p>
                  </div>
                )}
              </div>

              {/* Description */}
              {event.description && (
                <p
                  className="font-sans text-[14px]"
                  style={{
                    color: P.warmBrown,
                    lineHeight: 1.6,
                    margin: "0 0 20px",
                  }}
                >
                  {event.description}
                </p>
              )}

              {/* What's inside - zones grid */}
              {event.zones && event.zones.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <span
                    className="font-mono text-[10px] uppercase tracking-[2px]"
                    style={{ color: P.muted, display: "block", marginBottom: 10 }}
                  >
                    what&apos;s inside
                  </span>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
                    }}
                  >
                    {event.zones.map((zone: { name: string; icon: string; desc: string }, i: number) => (
                      <div
                        key={i}
                        style={{
                          background: accent + "08",
                          borderRadius: 12,
                          padding: "12px 14px",
                          border: `1px solid ${accent}10`,
                        }}
                      >
                        <span style={{ fontSize: 18, display: "block", marginBottom: 4 }}>{zone.icon}</span>
                        <span
                          className="font-sans text-[12px] font-medium"
                          style={{ color: P.nearBlack, display: "block", marginBottom: 2 }}
                        >
                          {zone.name}
                        </span>
                        <span
                          className="font-sans text-[11px]"
                          style={{ color: P.muted, lineHeight: 1.3 }}
                        >
                          {zone.desc}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* What's included */}
              {event.includes && event.includes.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <span
                    className="font-mono text-[10px] uppercase tracking-[2px]"
                    style={{ color: P.muted, display: "block", marginBottom: 10 }}
                  >
                    what&apos;s included
                  </span>
                  <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                    {event.includes.map((item: string, i: number) => (
                      <li
                        key={i}
                        className="font-sans text-[13px]"
                        style={{
                          color: P.warmBrown,
                          padding: "6px 0",
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <span
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: "50%",
                            background: accent,
                            flexShrink: 0,
                          }}
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Dress code */}
              {event.dress_code && (
                <div
                  style={{
                    background: accent + "0A",
                    border: `1px dashed ${accent}30`,
                    borderRadius: 14,
                    padding: "14px 16px",
                    marginBottom: 20,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <span style={{ fontSize: 22 }}>{"\uD83D\uDC57"}</span>
                  <div>
                    <span
                      className="font-mono text-[9px] uppercase tracking-[1.5px]"
                      style={{ color: P.muted, display: "block", marginBottom: 2 }}
                    >
                      dress code
                    </span>
                    <span
                      className="font-sans text-[13px] font-medium"
                      style={{ color: P.nearBlack }}
                    >
                      {event.dress_code}
                    </span>
                  </div>
                </div>
              )}

              {/* Spots bar */}
              <div style={{ marginBottom: 20 }}>
                <SpotsBar spotsLeft={spotsLeft} totalSpots={event.total_spots} accent={accent} />
              </div>
            </div>

            {/* Sticky bottom CTA */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                background: `linear-gradient(to top, ${P.cream} 70%, ${P.cream}00)`,
                padding: "24px 20px 28px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
              }}
            >
              <button
                onClick={handleImIn}
                className="font-sans text-[14px] font-medium"
                style={{
                  display: "block",
                  width: "100%",
                  background: accent,
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: 12,
                  padding: "13px 0",
                  cursor: "pointer",
                  letterSpacing: 0.3,
                }}
              >
                i&apos;m in &rarr;
              </button>
              <span
                className="font-hand text-[11px]"
                style={{ color: P.muted + "60" }}
              >
                you&apos;ll need an invite code
              </span>
            </div>
          </>
        )}
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes sheetSlideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        @keyframes gateFadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}
