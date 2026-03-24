"use client";

import { useState } from "react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { Noise } from "@/components/shared/Noise";

/* Safari share icon — the box-with-arrow glyph */
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

export function InstallGate() {
  const { isIOS, promptInstall, deferredPrompt } = usePWAInstall();
  const [iosStep, setIosStep] = useState<1 | 2>(1);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gate-black px-6 py-10" style={{ paddingBottom: "max(2.5rem, env(safe-area-inset-bottom, 2.5rem))" }}>
      <Noise opacity={0.05} />

      {/* Subtle glow */}
      <div
        className="absolute left-1/2 top-[20%] h-[300px] w-[300px] -translate-x-1/2 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(212,165,116,0.05), transparent 70%)",
          animation: "pulse 4s ease infinite",
        }}
      />

      <div className="animate-fadeSlideUp relative z-10 text-center" style={{ maxWidth: 340 }}>
        <h1 className="font-serif text-4xl tracking-tight text-cream">
          come offline
        </h1>
        <p className="mt-2 font-mono text-[11px] uppercase tracking-[4px] text-muted/50">
          bangalore
        </p>

        <div className="mt-12 mb-10">
          <div className="mx-auto mb-6 text-5xl" style={{ animation: "float 3s ease infinite" }}>
            📲
          </div>
          <h2 className="mb-2 font-serif text-2xl text-cream">
            add to home screen
          </h2>
          <p className="font-sans text-sm leading-relaxed text-muted">
            this app is meant to live on your home screen, not in a browser tab.
          </p>
        </div>

        {isIOS ? (
          /* ── iOS guided flow ── */
          <div className="flex flex-col items-center gap-6">
            {iosStep === 1 ? (
              /* Step 1: Tap share */
              <div className="animate-fadeIn flex flex-col items-center gap-4">
                <div className="rounded-2xl border border-muted/10 bg-gate-dark px-8 py-6 text-center">
                  <div
                    className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-caramel/20 bg-caramel/10"
                    style={{ animation: "breathe 2.5s ease infinite" }}
                  >
                    <ShareIcon className="h-6 w-6 text-caramel" />
                  </div>
                  <p className="font-sans text-[15px] text-cream">
                    tap the <span className="text-caramel">share button</span>
                  </p>
                  <p className="mt-1 font-sans text-xs text-muted/60">
                    at the bottom of your Safari toolbar
                  </p>
                </div>

                <button
                  onClick={() => setIosStep(2)}
                  className="font-mono text-[11px] uppercase tracking-[2px] text-muted/40 transition-colors hover:text-muted/60"
                >
                  done, what&apos;s next? →
                </button>

                <p className="mt-2 font-sans text-[11px] leading-relaxed text-muted/30">
                  make sure you&apos;re using Safari — this won&apos;t work in other browsers.
                </p>
              </div>
            ) : (
              /* Step 2: Scroll & tap Add to Home Screen */
              <div className="animate-fadeIn flex flex-col items-center gap-4">
                <div className="rounded-2xl border border-muted/10 bg-gate-dark px-6 py-6 text-center">
                  <div className="mx-auto mb-4 flex flex-col items-center gap-2">
                    {/* Scroll indicator */}
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-caramel/20 bg-caramel/10"
                      style={{ animation: "nudgeDown 1.5s ease infinite" }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-5 w-5 text-caramel">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                    <p className="font-mono text-[10px] uppercase tracking-[2px] text-muted/50">
                      scroll down
                    </p>
                  </div>

                  <p className="font-sans text-[15px] text-cream">
                    find & tap
                  </p>
                  {/* Mimic the iOS share sheet row */}
                  <div className="mx-auto mt-3 flex items-center gap-3 rounded-xl bg-gate-black/60 px-4 py-3" style={{ maxWidth: 240 }}>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/10">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="h-4 w-4 text-cream">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <line x1="12" y1="8" x2="12" y2="16" />
                        <line x1="8" y1="12" x2="16" y2="12" />
                      </svg>
                    </div>
                    <span className="font-sans text-sm text-cream">Add to Home Screen</span>
                  </div>

                  <p className="mt-3 font-sans text-xs text-muted/50">
                    then tap <span className="text-caramel">&quot;Add&quot;</span> in the top right
                  </p>
                </div>

                <button
                  onClick={() => setIosStep(1)}
                  className="font-mono text-[11px] uppercase tracking-[2px] text-muted/40 transition-colors hover:text-muted/60"
                >
                  ← back
                </button>
              </div>
            )}
          </div>
        ) : deferredPrompt ? (
          <button
            onClick={promptInstall}
            className="w-full rounded-2xl bg-cream px-6 py-4 font-sans text-[15px] font-medium text-gate-black transition-all active:scale-[0.98]"
          >
            install app →
          </button>
        ) : (
          <div className="rounded-2xl border border-muted/10 bg-gate-dark p-6 text-left">
            <p className="mb-4 font-mono text-[10px] uppercase tracking-[2px] text-muted">
              how to install
            </p>
            <div className="flex flex-col gap-4">
              {[
                { step: "1", text: "tap the menu (⋮) in Chrome" },
                { step: "2", text: 'tap "Add to Home screen"' },
                { step: "3", text: 'tap "Add"' },
              ].map((s) => (
                <div key={s.step} className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-caramel/15 font-mono text-xs text-caramel">
                    {s.step}
                  </div>
                  <p className="pt-0.5 font-sans text-sm text-muted/90">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="mt-8 font-mono text-[10px] text-muted/30">
          then open from your home screen to continue
        </p>
      </div>

      <div className="absolute bottom-0 pb-2 font-mono text-[10px] uppercase tracking-[2px] text-muted/20" style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom, 0.5rem))" }}>
        invite only · est. 2026
      </div>
    </div>
  );
}
