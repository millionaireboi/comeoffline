"use client";

import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { SignQuiz } from "@/components/onboarding/SignQuiz";
import { Noise } from "@/components/shared/Noise";

export function DayOfScreen() {
  const user = useAppStore((s) => s.user);
  const { currentEvent, activeRsvp, activeTicket, setStage } = useAppStore();
  const [quizJustCompleted, setQuizJustCompleted] = useState(false);

  if (!currentEvent) return null;

  // Hard gate: must complete sign quiz before attending
  if (!user?.sign && !quizJustCompleted) {
    return (
      <div className="flex min-h-screen flex-col bg-gate-black">
        <div className="flex flex-col items-center justify-center px-6 pt-[80px] pb-8 text-center">
          <span className="mb-4 text-4xl">✦</span>
          <h2 className="mb-2 font-serif text-[26px] text-cream">one last thing</h2>
          <p className="mb-2 max-w-[300px] font-sans text-[14px] leading-[1.6] text-muted">
            you need your comeoffline sign before you can attend. we use it to seat you with compatible people.
          </p>
          <p className="mb-6 font-mono text-[11px] text-caramel">takes 2 mins</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          <SignQuiz onComplete={() => setQuizJustCompleted(true)} mode="pre_checkout" />
        </div>
      </div>
    );
  }

  const pickupPoint =
    activeTicket?.pickup_point ||
    activeRsvp?.pickup_point ||
    currentEvent.pickup_points[0]?.name ||
    "TBD";

  return (
    <div className="flex min-h-screen flex-col bg-cream px-6 pt-[60px]" style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom, 2rem))" }}>
      <Noise />

      {/* Back to venue */}
      <button
        onClick={() => setStage("reveal")}
        className="animate-fadeIn mb-4 self-start font-mono text-[11px] text-muted transition-colors hover:text-near-black"
      >
        &larr; venue details
      </button>

      <div className="animate-fadeSlideUp flex flex-1 flex-col items-center justify-center">
      <div className="w-full max-w-[340px] text-center">
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

        {/* QR Code — show if user has a confirmed ticket */}
        {activeTicket?.qr_code && (
          <div className="mb-6 rounded-[20px] border border-sand bg-white p-6">
            <span className="mb-3 block font-mono text-[10px] uppercase tracking-[2px] text-muted">
              show this at entry
            </span>
            <img
              src={activeTicket.qr_code}
              alt="Ticket QR Code"
              className="mx-auto h-[200px] w-[200px] rounded-xl"
            />
            <div className="mt-3 flex items-center justify-center gap-2">
              <span className="font-sans text-[13px] font-medium text-near-black">
                {activeTicket.tier_name}
              </span>
              {activeTicket.quantity > 1 && (
                <span className="rounded-full bg-near-black/5 px-2 py-0.5 font-mono text-[10px] text-muted">
                  {activeTicket.quantity} people
                </span>
              )}
            </div>
          </div>
        )}

        {/* Venue card */}
        <div className="mb-4 rounded-[20px] border border-sand bg-white p-6 text-left">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blush/20 text-xl">
              &#x1F4CD;
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
                {pickupPoint}
              </span>
            </div>
          </div>
        </div>

        {/* Dress code */}
        <div className="mb-8 flex items-center gap-2.5 rounded-[14px] bg-blush/10 px-[18px] py-3.5">
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
          see you on the other side &#x270C;&#xFE0F;
        </p>
      </div>
      </div>
    </div>
  );
}
