"use client";

import { usePWAInstall } from "@/hooks/usePWAInstall";
import { Noise } from "@/components/shared/Noise";

export function InstallGate() {
  const { isIOS, promptInstall, deferredPrompt } = usePWAInstall();

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gate-black px-6 py-10">
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
          <div className="rounded-2xl border border-muted/10 bg-gate-dark p-6 text-left">
            <p className="mb-4 font-mono text-[10px] uppercase tracking-[2px] text-muted">
              how to install
            </p>
            <div className="flex flex-col gap-4">
              {[
                { step: "1", text: "tap the share button in Safari", icon: "↑" },
                { step: "2", text: 'scroll down, tap "Add to Home Screen"', icon: "+" },
                { step: "3", text: 'tap "Add" in the top right', icon: "✓" },
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

      <div className="absolute bottom-8 font-mono text-[10px] uppercase tracking-[2px] text-muted/20">
        invite only · est. 2026
      </div>
    </div>
  );
}
