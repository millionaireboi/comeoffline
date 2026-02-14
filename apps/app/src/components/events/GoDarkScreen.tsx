"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import { Noise } from "@/components/shared/Noise";

export function GoDarkScreen() {
  const { setStage } = useAppStore();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-near-black px-6 py-10">
      <Noise opacity={0.04} />

      {/* Subtle ambient glow */}
      <div
        className="absolute h-[250px] w-[250px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(212,165,116,0.025), transparent)",
          animation: "slowPulse 6s ease infinite",
        }}
      />

      <div
        className="max-w-[300px] text-center transition-all duration-1200"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(20px)",
        }}
      >
        <div className="mb-8 text-5xl" style={{ animation: "breathe 4s ease infinite" }}>
          🌙
        </div>

        <h2 className="mb-4 font-serif text-[32px] font-normal text-cream">
          enjoy tonight.
        </h2>
        <p className="mb-3 font-sans text-[15px] leading-relaxed text-muted">
          your ride is on the way.
          <br />
          the rest happens offline.
        </p>

        <div className="mx-auto my-7 h-px w-10 bg-muted/20" />

        <p className="mb-10 font-mono text-[11px] leading-relaxed text-muted/30">
          this app has done its job.
          <br />
          now go do yours —
          <br />
          be present.
        </p>

        {/* Skip to morning after (for demo flow) */}
        <button
          onClick={() => setStage("memories")}
          className="rounded-full border border-muted/15 bg-transparent px-6 py-3 font-mono text-[11px] text-muted/40 transition-all hover:border-caramel/30 hover:text-cream"
        >
          skip to morning after (demo) →
        </button>
      </div>

      <div className="absolute bottom-10 font-serif text-base text-muted/15">
        come offline
      </div>
    </div>
  );
}
