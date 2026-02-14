"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAppStore } from "@/store/useAppStore";
import { Noise } from "@/components/shared/Noise";

type Phase = "sealed" | "revealing" | "revealed";

export function VenueReveal() {
  const { currentEvent, setStage } = useAppStore();
  const [phase, setPhase] = useState<Phase>("sealed");
  const [scratchPct, setScratchPct] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);

  useEffect(() => {
    if (phase !== "sealed") return;
    const c = canvasRef.current;
    if (!c) return;

    const ctx = c.getContext("2d");
    if (!ctx) return;

    const w = (c.width = c.offsetWidth * 2);
    const h = (c.height = c.offsetHeight * 2);
    ctx.scale(2, 2);

    const g = ctx.createLinearGradient(0, 0, w / 2, h / 2);
    g.addColorStop(0, "#D4A574");
    g.addColorStop(0.5, "#B8845A");
    g.addColorStop(1, "#D4A574");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Decorative dots
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    for (let i = 0; i < 20; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * (w / 2), Math.random() * (h / 2), Math.random() * 30 + 10, 0, Math.PI * 2);
      ctx.fill();
    }

    // Text
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "600 12px 'DM Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText("SCRATCH TO REVEAL", c.offsetWidth / 2, c.offsetHeight / 2 - 8);
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.font = "10px 'DM Mono', monospace";
    ctx.fillText("your venue awaits", c.offsetWidth / 2, c.offsetHeight / 2 + 12);
  }, [phase]);

  const scratch = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (phase !== "sealed") return;
      const c = canvasRef.current;
      if (!c) return;
      const ctx = c.getContext("2d");
      if (!ctx) return;

      const r = c.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(clientX - r.left, clientY - r.top, 24, 0, Math.PI * 2);
      ctx.fill();

      const id = ctx.getImageData(0, 0, c.width, c.height);
      let transparent = 0;
      for (let i = 3; i < id.data.length; i += 4) {
        if (id.data[i] === 0) transparent++;
      }
      const pct = (transparent / (id.data.length / 4)) * 100;
      setScratchPct(pct);

      if (pct > 45) {
        setPhase("revealing");
        setTimeout(() => setPhase("revealed"), 600);
      }
    },
    [phase],
  );

  if (!currentEvent) return null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-5 pb-[120px] pt-[60px]">
      <Noise />

      {phase === "sealed" && (
        <div className="animate-fadeSlideUp w-full max-w-[360px] text-center">
          <div className="mb-4 text-[32px]" style={{ animation: "float 3s ease infinite" }}>
            ✉️
          </div>
          <h2 className="mb-2 font-serif text-[28px] font-normal text-near-black">
            your venue is here
          </h2>
          <p className="mb-8 font-sans text-sm text-muted">
            scratch the card to reveal where it&apos;s going down
          </p>

          <div
            className="relative h-[200px] w-full cursor-crosshair overflow-hidden rounded-[20px] shadow-[0_4px_20px_rgba(26,23,21,0.1)]"
            style={{ animation: "goldenPulse 2s ease infinite" }}
          >
            {/* Content beneath scratch card */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white p-6">
              <span className="mb-3 text-[28px]">📍</span>
              <p className="font-serif text-2xl text-near-black">
                {currentEvent.venue_name || "Secret Venue"}
              </p>
              <p className="mt-1 font-sans text-sm text-warm-brown">
                {currentEvent.venue_area || "Bangalore"}
              </p>
              <p className="mt-0.5 font-mono text-[11px] text-muted">
                {currentEvent.venue_address || ""}
              </p>
            </div>

            {/* Canvas scratch layer */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 h-full w-full touch-none"
              onMouseDown={() => { isDrawing.current = true; }}
              onMouseMove={(e) => { if (isDrawing.current) scratch(e); }}
              onMouseUp={() => { isDrawing.current = false; }}
              onTouchStart={() => { isDrawing.current = true; }}
              onTouchMove={(e) => { e.preventDefault(); scratch(e); }}
              onTouchEnd={() => { isDrawing.current = false; }}
            />
          </div>
          <p className="mt-4 font-mono text-[10px] text-muted/40">
            {Math.round(scratchPct)}% scratched
          </p>
        </div>
      )}

      {phase === "revealing" && (
        <div className="animate-scaleIn text-center">
          <div className="text-5xl" style={{ animation: "float 1s ease infinite" }}>
            ✨
          </div>
        </div>
      )}

      {phase === "revealed" && (
        <div className="animate-scaleIn w-full max-w-[360px] text-center">
          {/* Golden ticket card */}
          <div
            className="relative mb-6 overflow-hidden rounded-3xl border-[1.5px] border-caramel/20 bg-gradient-to-br from-[#FFF8F0] via-white to-[#FFF8F0] p-9 shadow-[0_4px_20px_rgba(212,165,116,0.15),0_12px_48px_rgba(26,23,21,0.08)]"
            style={{ animation: "gentleDrift 8s ease infinite" }}
          >
            {/* Shine effect */}
            <div
              className="absolute top-0 h-full w-[60%]"
              style={{
                background: "linear-gradient(90deg, transparent, rgba(212,165,116,0.08), transparent)",
                animation: "revealShine 3s ease 0.5s both",
              }}
            />

            <div className="mb-6 flex items-center justify-center gap-2 font-mono text-[9px] uppercase tracking-[3px] text-caramel">
              <span className="h-px w-5 bg-caramel" />
              golden ticket
              <span className="h-px w-5 bg-caramel" />
            </div>

            <span className="mb-4 block text-4xl">📍</span>
            <h3 className="mb-1.5 font-serif text-[30px] font-normal text-near-black">
              {currentEvent.venue_name || "Secret Venue"}
            </h3>
            <p className="mb-1 font-sans text-[15px] text-warm-brown">
              {currentEvent.venue_area || "Bangalore"}
            </p>
            <p className="mb-7 font-mono text-xs text-muted">
              {currentEvent.venue_address || ""}
            </p>

            <div className="-mx-3 mb-6 h-px bg-sand" />

            <div className="flex justify-center gap-8">
              <div className="text-center">
                <span className="mb-1.5 block font-mono text-[9px] uppercase tracking-[1.5px] text-muted">
                  date
                </span>
                <span className="font-sans text-sm font-medium text-near-black">
                  {currentEvent.date}
                </span>
              </div>
              <div className="h-8 w-px bg-sand" />
              <div className="text-center">
                <span className="mb-1.5 block font-mono text-[9px] uppercase tracking-[1.5px] text-muted">
                  pickup
                </span>
                <span className="font-sans text-sm font-medium text-near-black">
                  {currentEvent.pickup_points[0]?.time || currentEvent.time}
                </span>
              </div>
            </div>
          </div>

          <p className="mb-5 font-mono text-[11px] italic text-muted/50">
            screenshot this. last approved phone use. 📸
          </p>
          <button
            onClick={() => setStage("dayof")}
            className="rounded-full bg-near-black px-8 py-3.5 font-sans text-sm font-medium text-white"
          >
            can&apos;t wait →
          </button>
        </div>
      )}
    </div>
  );
}
