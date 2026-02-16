"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import { Noise } from "@/components/shared/Noise";

const disconnectQuotes = [
  { text: "the best things in life aren\u2019t on a screen.", author: "\u2014 literally everyone\u2019s grandma" },
  { text: "be where your feet are.", author: "\u2014 someone wise" },
  { text: "your screen time report is disappointed in you.", author: "\u2014 your phone" },
  { text: "touch grass. it\u2019s free.", author: "\u2014 nature" },
  { text: "you\u2019re holding a rectangle when you could be holding a drink.", author: "\u2014 come offline" },
];

function useCountdown(targetDate: string) {
  const [time, setTime] = useState({ d: 0, h: 0, m: 0, s: 0 });

  useEffect(() => {
    function calc() {
      const diff = Math.max(0, new Date(targetDate).getTime() - Date.now());
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / (1000 * 60)) % 60);
      const s = Math.floor((diff / 1000) % 60);
      setTime({ d, h, m, s });
    }
    calc();
    const iv = setInterval(calc, 1000);
    return () => clearInterval(iv);
  }, [targetDate]);

  return time;
}

export function CountdownScreen() {
  const { currentEvent, activeTicket, setStage } = useAppStore();
  const [quote] = useState(
    () => disconnectQuotes[Math.floor(Math.random() * disconnectQuotes.length)],
  );

  const time = useCountdown(currentEvent?.date || "");
  const totalDays = currentEvent?.venue_reveal_date
    ? Math.ceil(
        (new Date(currentEvent.date).getTime() - new Date(currentEvent.venue_reveal_date).getTime()) /
          (1000 * 60 * 60 * 24),
      ) + 10
    : 10;
  const venueProgress = ((totalDays - time.d) / totalDays) * 100;

  if (!currentEvent) return null;

  return (
    <div className="animate-fadeIn min-h-screen bg-cream px-5 pb-[120px] pt-[60px]">
      <Noise />

      {/* Header */}
      <div className="animate-fadeSlideUp mb-12 text-center" style={{ animationDelay: "0.1s" }}>
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-sage/20 px-4 py-2">
          <div
            className="h-2 w-2 rounded-full bg-sage"
            style={{ animation: "breathe 3s ease infinite" }}
          />
          <span className="font-mono text-[11px] text-[#6B7A63]">
            {activeTicket ? "ticket confirmed" : "rsvp accepted"}
          </span>
        </div>
        <h2 className="mb-1 font-serif text-[32px] font-normal text-near-black">
          {currentEvent.title} {currentEvent.emoji}
        </h2>
        <p className="font-sans text-sm text-muted">
          {currentEvent.date} &middot; {currentEvent.time}
        </p>
      </div>

      {/* Ticket details card */}
      {activeTicket && (
        <div
          className="animate-fadeSlideUp mb-5 rounded-[20px] border border-sand bg-white p-5"
          style={{ animationDelay: "0.15s" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-[2px] text-muted">your ticket</span>
              <p className="mt-1 font-sans text-[15px] font-medium text-near-black">
                {activeTicket.tier_name}
              </p>
            </div>
            <div className="text-right">
              <span className="font-sans text-lg font-semibold text-near-black">
                {activeTicket.price === 0 ? "Free" : `\u20B9${activeTicket.price}`}
              </span>
              {activeTicket.quantity > 1 && (
                <p className="font-mono text-[10px] text-muted">{activeTicket.quantity} people</p>
              )}
            </div>
          </div>
          {activeTicket.pickup_point && activeTicket.pickup_point !== "TBD" && (
            <div className="mt-3 border-t border-sand pt-3">
              <span className="font-mono text-[10px] text-muted">
                pickup: {activeTicket.pickup_point}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Countdown card */}
      <div
        className="animate-fadeSlideUp mb-5 rounded-3xl bg-white p-8 shadow-[0_2px_12px_rgba(26,23,21,0.04),0_8px_32px_rgba(26,23,21,0.06)]"
        style={{ animationDelay: "0.2s" }}
      >
        <span className="mb-5 block text-center font-mono text-[10px] uppercase tracking-[3px] text-muted">
          countdown
        </span>
        <div className="mb-6 flex justify-center gap-2">
          {[
            { val: time.d, l: "days" },
            { val: time.h, l: "hrs" },
            { val: time.m, l: "min" },
            { val: time.s, l: "sec" },
          ].map((u, i) => (
            <div key={i} className="min-w-[64px] text-center">
              <div
                className="mb-1.5 font-mono text-4xl font-medium leading-none text-near-black"
                style={{ animation: i === 3 ? "tickTock 1s ease infinite" : "none" }}
              >
                {String(u.val).padStart(2, "0")}
              </div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted">
                {u.l}
              </div>
            </div>
          ))}
        </div>

        <div className="-mx-2 mb-5 h-px bg-sand" />

        <div className="mb-2.5 flex justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[2px] text-muted">
            venue reveal
          </span>
          <span className="font-mono text-[11px] text-caramel">{time.d} days to go</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-sm bg-sand">
          <div
            className="h-full rounded-sm"
            style={{
              width: `${Math.min(venueProgress, 100)}%`,
              background: "linear-gradient(90deg, #D4A574, #B8845A)",
            }}
          />
        </div>
      </div>

      {/* Daily quote */}
      <div
        className="animate-fadeSlideUp relative mb-5 overflow-hidden rounded-[20px] bg-white p-7 shadow-[0_1px_4px_rgba(26,23,21,0.03)]"
        style={{ animationDelay: "0.3s" }}
      >
        <div className="absolute -right-2.5 -top-5 text-[80px] opacity-5">&#x1F4AD;</div>
        <span className="mb-3.5 block font-mono text-[10px] uppercase tracking-[2px] text-muted">
          daily reminder
        </span>
        <p className="mb-2 font-serif text-xl italic leading-snug text-near-black">
          &ldquo;{quote.text}&rdquo;
        </p>
        <p className="font-mono text-[11px] text-muted">{quote.author}</p>
      </div>

      {/* Screen time nudge */}
      <div
        className="animate-fadeSlideUp mb-5 rounded-[20px] bg-near-black p-6"
        style={{ animationDelay: "0.4s" }}
      >
        <div className="mb-3 flex items-center gap-3">
          <span className="text-xl">&#x1F4F1;</span>
          <span className="font-mono text-[10px] uppercase tracking-[2px] text-muted">
            screen time today
          </span>
        </div>
        <p className="mb-1.5 font-serif text-[28px] text-cream">too much.</p>
        <p className="font-sans text-[13px] text-muted/60">
          close the app. go outside. we&apos;ll ping you when it&apos;s time.
        </p>
      </div>

      {/* Venue sealed peek (for demo) */}
      <button
        onClick={() => setStage("reveal")}
        className="animate-fadeSlideUp w-full rounded-[20px] border-[1.5px] border-dashed border-caramel/25 bg-caramel/5 p-5 text-center transition-all hover:bg-caramel/10"
        style={{ animationDelay: "0.5s" }}
      >
        <span className="mb-2 block text-2xl">&#x2709;&#xFE0F;</span>
        <p className="mb-1 font-sans text-sm font-medium text-warm-brown">venue sealed</p>
        <p className="font-mono text-[11px] text-muted">tap to peek (demo)</p>
      </button>
    </div>
  );
}
