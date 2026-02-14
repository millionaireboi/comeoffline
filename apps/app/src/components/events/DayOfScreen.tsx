"use client";

import { useAppStore } from "@/store/useAppStore";
import { Noise } from "@/components/shared/Noise";

export function DayOfScreen() {
  const { currentEvent, activeRsvp, setStage } = useAppStore();

  if (!currentEvent) return null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-6 pt-[60px]">
      <Noise />

      <div className="animate-fadeSlideUp w-full max-w-[340px] text-center">
        {/* Live badge */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-terracotta/10 px-4 py-2">
          <div
            className="h-2 w-2 rounded-full bg-terracotta"
            style={{ animation: "pulse 1.5s ease infinite" }}
          />
          <span className="font-mono text-[11px] font-medium text-terracotta">today&apos;s the day</span>
        </div>

        <h2 className="mb-2 font-serif text-[34px] font-normal text-near-black">
          {currentEvent.title} {currentEvent.emoji}
        </h2>
        <p className="mb-10 font-sans text-[15px] text-warm-brown">{currentEvent.time}</p>

        {/* Venue card */}
        <div className="mb-4 rounded-[20px] border border-sand bg-white p-6 text-left">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blush/20 text-xl">
              📍
            </div>
            <div>
              <p className="font-sans text-base font-medium text-near-black">
                {currentEvent.venue_name || "Secret Venue"}
              </p>
              <p className="font-mono text-xs text-muted">
                {currentEvent.venue_area || "Bangalore"}
              </p>
            </div>
          </div>

          <div className="mb-4 h-px bg-sand" />

          <div className="flex gap-6">
            <div>
              <span className="mb-1 block font-mono text-[9px] uppercase tracking-[1.5px] text-muted">
                pickup
              </span>
              <span className="font-sans text-[15px] font-medium text-near-black">
                {currentEvent.pickup_points[0]?.time || currentEvent.time}
              </span>
            </div>
            <div>
              <span className="mb-1 block font-mono text-[9px] uppercase tracking-[1.5px] text-muted">
                from
              </span>
              <span className="font-sans text-sm text-near-black">
                {activeRsvp?.pickup_point || currentEvent.pickup_points[0]?.name || "TBD"}
              </span>
            </div>
          </div>
        </div>

        {/* Dress code */}
        <div className="mb-8 flex items-center gap-2.5 rounded-[14px] bg-blush/10 px-[18px] py-3.5">
          <span className="text-base">👗</span>
          <p className="font-sans text-[13px] text-warm-brown">
            dress code: <span className="font-semibold">{currentEvent.dress_code}</span>
          </p>
        </div>

        {/* Go dark CTA */}
        <button
          onClick={() => setStage("godark")}
          className="w-full rounded-[20px] bg-near-black p-5 text-white transition-all hover:-translate-y-0.5"
        >
          <span className="block font-sans text-[17px] font-medium">i&apos;m ready, pick me up</span>
          <span className="mt-1 block font-mono text-[11px] text-cream/50">
            last chance to use your phone
          </span>
        </button>

        <p className="mt-5 font-mono text-[11px] text-muted/40">
          see you on the other side ✌️
        </p>
      </div>
    </div>
  );
}
