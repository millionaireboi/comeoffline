"use client";

import { useState, useEffect } from "react";
import { useAnalytics, TICKET_SHARED } from "@comeoffline/analytics";
import { formatDate } from "@comeoffline/ui";
import { useAppStore } from "@/store/useAppStore";
import { SignQuiz } from "@/components/onboarding/SignQuiz";
import { Noise } from "@/components/shared/Noise";
import { IncludesSection } from "@/components/events/event-detail/IncludesSection";
import { DressCodeCard } from "@/components/events/event-detail/DressCodeCard";
import { ScheduleSection } from "@/components/events/event-detail/ScheduleSection";
import { OrganizerMessage } from "@/components/events/event-detail/OrganizerMessage";

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
  const { track } = useAnalytics();
  const user = useAppStore((s) => s.user);
  const { currentEvent, activeTicket, navigationOrigin, setStage, setNavigationOrigin } = useAppStore();
  const [showQuiz, setShowQuiz] = useState(false);
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

      {/* Back */}
      <button
        onClick={() => {
          const dest = navigationOrigin === "bookings" ? "bookings" : "feed";
          setNavigationOrigin(null);
          setStage(dest);
        }}
        className="animate-fadeIn mb-4 font-mono text-[11px] text-muted transition-colors hover:text-near-black"
      >
        &larr; {navigationOrigin === "bookings" ? "bookings" : "events"}
      </button>

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
          {formatDate(currentEvent.date)} &middot; {currentEvent.time}
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
          {(activeTicket.spot_name || activeTicket.seat_id || activeTicket.section_name) && (
            <div className="mt-3 border-t border-sand pt-3">
              <span className="font-mono text-[10px] text-muted">
                {activeTicket.spot_name && (
                  <>
                    table: <strong className="text-near-black">{activeTicket.spot_name}</strong>
                    {activeTicket.spot_seat_label && (
                      <>, seat: <strong className="text-near-black">{activeTicket.spot_seat_label}</strong></>
                    )}
                  </>
                )}
                {activeTicket.seat_id && !activeTicket.spot_name && (
                  <>seat: <strong className="text-near-black">{activeTicket.seat_id}</strong></>
                )}
                {activeTicket.section_name && !activeTicket.seat_id && !activeTicket.spot_name && (
                  <>section: <strong className="text-near-black">{activeTicket.section_name}</strong></>
                )}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Share "I'm going" */}
      <div
        className="animate-fadeSlideUp mb-5 px-0"
        style={{ animationDelay: "0.17s" }}
      >
        <button
          onClick={async () => {
            const shareData = {
              title: `I'm going to ${currentEvent.title}!`,
              text: `Just got my ticket to ${currentEvent.title}. comeoffline.`,
              url: `https://comeoffline.com/events/${currentEvent.id}`,
            };
            if (typeof navigator !== "undefined" && navigator.share) {
              try {
                await navigator.share(shareData);
                track(TICKET_SHARED, { event_id: currentEvent.id, method: "native" });
              } catch { /* cancelled */ }
            } else {
              try {
                await navigator.clipboard.writeText(shareData.url);
                track(TICKET_SHARED, { event_id: currentEvent.id, method: "clipboard" });
              } catch { /* fallback */ }
            }
          }}
          className="w-full rounded-[16px] border border-sand bg-white px-5 py-3.5 text-center transition-all hover:-translate-y-0.5"
        >
          <span className="font-sans text-[13px] font-medium text-near-black">
            share that you&apos;re going ↗
          </span>
        </button>
      </div>

      {/* Sign quiz reminder — must complete before attending */}
      {!user?.sign && (
        <div
          className="animate-fadeSlideUp mb-5 rounded-[20px] p-5"
          style={{ animationDelay: "0.19s", background: "linear-gradient(135deg, #1A1714, #2A2520)", border: "1px solid rgba(212,165,116,0.2)" }}
        >
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">✦</span>
            <div>
              <p className="font-sans text-[15px] font-medium text-cream">find your comeoffline sign</p>
              <p className="font-mono text-[11px] text-muted mt-0.5">required before attending the event</p>
            </div>
          </div>
          <p className="font-sans text-[13px] leading-[1.6] text-muted mb-4">
            we use your sign to seat you with compatible people. takes 2 mins — do it anytime before the event.
          </p>
          <button
            onClick={() => setShowQuiz(true)}
            className="w-full rounded-full bg-caramel py-3 font-sans text-[14px] font-medium text-gate-black transition-all active:scale-95"
          >
            take the quiz →
          </button>
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

      {/* Event details — what to expect */}
      {currentEvent.description && (
        <div
          className="animate-fadeSlideUp mb-5 rounded-[20px] border border-sand bg-white p-5"
          style={{ animationDelay: "0.55s" }}
        >
          <span className="mb-3 block font-mono text-[10px] uppercase tracking-[2px] text-muted">
            about this event
          </span>
          <p className="font-sans text-[14px] leading-[1.75] text-warm-brown">
            {currentEvent.description}
          </p>
        </div>
      )}

      {currentEvent.includes && currentEvent.includes.length > 0 && (
        <div className="animate-fadeSlideUp mb-0" style={{ animationDelay: "0.6s" }}>
          <IncludesSection
            includes={currentEvent.includes}
            accent={currentEvent.accent || "#D4A574"}
            accentDark={currentEvent.accent_dark || "#B8845A"}
          />
        </div>
      )}

      {currentEvent.dress_code && (
        <div className="animate-fadeSlideUp mb-0" style={{ animationDelay: "0.65s" }}>
          <DressCodeCard
            dressCode={currentEvent.dress_code}
            accent={currentEvent.accent || "#D4A574"}
            accentDark={currentEvent.accent_dark || "#B8845A"}
          />
        </div>
      )}

      {currentEvent.post_booking?.sections && (
        <div className="animate-fadeSlideUp mb-5" style={{ animationDelay: "0.7s" }}>
          <ScheduleSection
            sections={currentEvent.post_booking.sections}
            accent={currentEvent.accent || "#D4A574"}
            accentDark={currentEvent.accent_dark || "#B8845A"}
          />
        </div>
      )}

      {currentEvent.post_booking?.custom_message && (
        <div className="animate-fadeSlideUp mb-0" style={{ animationDelay: "0.75s" }}>
          <OrganizerMessage
            message={currentEvent.post_booking.custom_message}
            accent={currentEvent.accent || "#D4A574"}
          />
        </div>
      )}

      {/* Quiz overlay */}
      {showQuiz && (
        <div className="fixed inset-0 z-[600] overflow-y-auto" style={{ paddingBottom: "calc(56px + env(safe-area-inset-bottom, 0px))" }}>
          {/* Close button */}
          <button
            onClick={() => setShowQuiz(false)}
            className="fixed right-5 z-[610] flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm text-cream backdrop-blur-sm"
            style={{ top: "calc(1.25rem + env(safe-area-inset-top, 0px))" }}
          >
            ✕
          </button>
          <SignQuiz onComplete={() => setShowQuiz(false)} mode="pre_checkout" />
        </div>
      )}
    </div>
  );
}
