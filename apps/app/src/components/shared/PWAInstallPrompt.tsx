"use client";

import { useState, useEffect } from "react";
import { usePWAInstall } from "@/hooks/usePWAInstall";

/* ── Safari share icon (box-with-arrow) ── */
function ShareIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M4 12v7a2 2 0 002 2h12a2 2 0 002-2v-7" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

/* ── Copy link button for non-Safari browsers ── */
function CopyLinkStep() {
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement("input");
      input.value = window.location.origin;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={copyLink}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-sand/30 bg-cream px-4 py-3 font-sans text-[13px] font-medium text-near-black transition-all active:scale-[0.98]"
    >
      {copied ? (
        <>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 text-[#6B7A63]">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          copied! now open in Safari
        </>
      ) : (
        <>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
          copy link
        </>
      )}
    </button>
  );
}

/* ── The visual Safari toolbar mockup ── */
function SafariToolbarMockup() {
  return (
    <div className="mx-auto w-full max-w-[280px]">
      {/* Mimic Safari bottom toolbar */}
      <div className="rounded-xl border border-sand/20 bg-white/80 px-3 py-2.5 shadow-sm">
        <div className="flex items-center justify-around">
          {/* Back arrow */}
          <div className="flex h-8 w-8 items-center justify-center text-muted/30">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </div>
          {/* Forward arrow */}
          <div className="flex h-8 w-8 items-center justify-center text-muted/30">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
          {/* Share button — highlighted */}
          <div
            className="relative flex h-9 w-9 items-center justify-center rounded-full"
            style={{ animation: "installPulse 2s ease infinite" }}
          >
            <div className="absolute inset-0 rounded-full bg-caramel/15" />
            <ShareIcon className="relative h-5 w-5 text-caramel" />
            {/* Pulsing ring */}
            <div
              className="absolute inset-0 rounded-full border-2 border-caramel/40"
              style={{ animation: "installRing 2s ease infinite" }}
            />
          </div>
          {/* Bookmarks */}
          <div className="flex h-8 w-8 items-center justify-center text-muted/30">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
              <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
              <path d="M6.5 2H20v20l-6.5-3L7 22V7a5 5 0 010-10z" />
            </svg>
          </div>
          {/* Tabs */}
          <div className="flex h-8 w-8 items-center justify-center text-muted/30">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </div>
        </div>
      </div>
      {/* Arrow pointing up from share button */}
      <div className="flex justify-center">
        <div
          className="mt-1 text-caramel"
          style={{ animation: "nudgeDown 1.5s ease infinite" }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-4 w-4 rotate-180">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>
    </div>
  );
}

/* ── iOS share sheet row mockup ── */
function AddToHomeScreenRow() {
  return (
    <div className="mx-auto max-w-[260px] rounded-xl border border-sand/20 bg-white/60 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/10">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="h-4 w-4 text-near-black">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
        </div>
        <span className="font-sans text-[14px] text-near-black">Add to Home Screen</span>
      </div>
    </div>
  );
}

/* ── Main prompt component ── */
export function PWAInstallPrompt() {
  const {
    shouldShowPrompt,
    isIOS,
    browser,
    canInstallDirectly,
    deferredPrompt,
    promptInstall,
    dismissPrompt,
    isTriggered,
  } = usePWAInstall();

  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  // Animate in after a short delay
  useEffect(() => {
    if (shouldShowPrompt) {
      const delay = isTriggered ? 800 : 2000; // Show faster if triggered by action
      const timer = setTimeout(() => setVisible(true), delay);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [shouldShowPrompt, isTriggered]);

  const handleDismiss = () => {
    setClosing(true);
    setTimeout(() => {
      dismissPrompt();
      setClosing(false);
      setVisible(false);
    }, 300);
  };

  if (!shouldShowPrompt || !visible) return null;

  // Non-Safari on iOS — need to redirect to Safari first
  const needsSafariRedirect = isIOS && !canInstallDirectly;

  // Android with native prompt
  const hasNativePrompt = !isIOS && deferredPrompt;

  // Contextual headline based on trigger
  const headline = isTriggered
    ? "save your ticket to home screen"
    : "get the full experience";

  const subtext = isTriggered
    ? "access your ticket offline, get event-day reminders, and never miss an update."
    : "add to your home screen for notifications, offline access, and a faster experience.";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[900] bg-near-black/40 backdrop-blur-sm transition-opacity duration-300"
        style={{ opacity: closing ? 0 : 1 }}
        onClick={handleDismiss}
      />

      {/* Bottom sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[901] rounded-t-3xl bg-cream shadow-2xl"
        style={{
          animation: closing ? "sheetSlideDown 0.3s ease forwards" : "sheetSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both",
          paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 1.5rem))",
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-sand/40" />
        </div>

        <div className="px-6 pb-4 pt-2">
          {/* Header */}
          <div className="mb-5 text-center">
            <h3 className="font-serif text-[22px] tracking-tight text-near-black" style={{ letterSpacing: "-0.5px" }}>
              {headline}
            </h3>
            <p className="mt-2 font-sans text-[13px] leading-relaxed text-warm-brown">
              {subtext}
            </p>
          </div>

          {needsSafariRedirect ? (
            /* ── Non-Safari on iOS: copy link → open in Safari ── */
            <div className="flex flex-col gap-4">
              <div className="rounded-2xl border border-sand/15 bg-white/50 px-5 py-4">
                <p className="mb-1 font-mono text-[10px] uppercase tracking-[2px] text-muted/50">
                  {browser === "in-app" ? "in-app browser detected" : `you\u2019re using ${browser}`}
                </p>
                <p className="font-sans text-[13px] leading-relaxed text-near-black/80">
                  add to home screen only works in <span className="font-medium text-near-black">Safari</span>. copy the link and open it there.
                </p>
              </div>
              <CopyLinkStep />
            </div>
          ) : hasNativePrompt ? (
            /* ── Android with native prompt ── */
            <button
              onClick={async () => {
                await promptInstall();
                handleDismiss();
              }}
              className="w-full rounded-2xl bg-near-black px-6 py-4 font-sans text-[15px] font-medium text-cream transition-all active:scale-[0.98]"
            >
              install app
            </button>
          ) : isIOS ? (
            /* ── iOS Safari: visual guided flow ── */
            <div className="flex flex-col gap-4">
              {/* Step 1 */}
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-caramel/15 font-mono text-[11px] font-medium text-caramel">
                  1
                </div>
                <div className="flex-1">
                  <p className="font-sans text-[13px] font-medium text-near-black">
                    tap the share button in Safari
                  </p>
                  <div className="mt-2.5">
                    <SafariToolbarMockup />
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-caramel/15 font-mono text-[11px] font-medium text-caramel">
                  2
                </div>
                <div className="flex-1">
                  <p className="mb-2.5 font-sans text-[13px] font-medium text-near-black">
                    scroll down and tap
                  </p>
                  <AddToHomeScreenRow />
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-caramel/15 font-mono text-[11px] font-medium text-caramel">
                  3
                </div>
                <p className="font-sans text-[13px] font-medium text-near-black">
                  tap <span className="text-caramel">&ldquo;Add&rdquo;</span> in the top right
                </p>
              </div>
            </div>
          ) : (
            /* ── Android/Desktop fallback: manual steps ── */
            <div className="flex flex-col gap-3">
              {[
                { step: "1", text: "tap the menu (\u22EE) in Chrome" },
                { step: "2", text: 'tap "Add to Home screen"' },
                { step: "3", text: 'tap "Add"' },
              ].map((s) => (
                <div key={s.step} className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-caramel/15 font-mono text-[11px] font-medium text-caramel">
                    {s.step}
                  </div>
                  <p className="font-sans text-[13px] text-near-black/80">{s.text}</p>
                </div>
              ))}
            </div>
          )}

          {/* Dismiss */}
          <button
            onClick={handleDismiss}
            className="mt-5 w-full py-2 font-mono text-[11px] uppercase tracking-[2px] text-muted/40 transition-colors active:text-muted/60"
          >
            not now
          </button>
        </div>
      </div>
    </>
  );
}
