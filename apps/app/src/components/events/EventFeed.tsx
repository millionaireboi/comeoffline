"use client";

import { useState, useEffect, useCallback } from "react";
import type { Event, RSVP, Ticket } from "@comeoffline/types";
import { useAuth } from "@/hooks/useAuth";
import { useAppStore } from "@/store/useAppStore";
import { apiFetch } from "@/lib/api";
import { GlitchText } from "@/components/ui/GlitchText";
import { EventCard } from "@/components/events/EventCard";
import { EventDetail } from "@/components/events/EventDetail";
import { SignQuiz } from "@/components/onboarding/SignQuiz";
import { Noise } from "@/components/shared/Noise";
import { PullToRefresh } from "@/components/shared/PullToRefresh";

export function EventFeed() {
  const { getIdToken } = useAuth();
  const user = useAppStore((s) => s.user);
  const { setCurrentEvent, setActiveRsvp, setActiveTicket, setStage, setProfileCompleteMode } = useAppStore();
  const events = useAppStore((s) => s.events);
  const setEvents = useAppStore((s) => s.setEvents);
  const [loading, setLoading] = useState(events.length === 0);
  const [detailEvent, setDetailEvent] = useState<Event | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showQuizGate, setShowQuizGate] = useState(false);
  const [showQuizPrompt, setShowQuizPrompt] = useState(false);
  const [nudgeDismissed, setNudgeDismissed] = useState(() => {
    try { return localStorage.getItem("co_profile_nudge_dismissed") === "1"; } catch { return false; }
  });
  const profileIncomplete = user && (!user.interests || user.interests.length === 0 || !user.bio);
  const [pendingPurchase, setPendingPurchase] = useState<{
    event: Event;
    tierId: string;
    pickupPoint?: string;
    timeSlotId?: string;
    addOns?: Array<{ addon_id: string; name: string; quantity: number; price: number; spot_id?: string; spot_name?: string; spot_seat_id?: string; spot_seat_label?: string }>;
    seatId?: string;
    sectionId?: string;
    spotSeatId?: string;
  } | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      const token = await getIdToken();
      if (!token) return;
      const data = await apiFetch<{ success: boolean; data: Event[] }>("/api/events", {
        token,
      });
      if (data.data) setEvents(data.data);
    } catch (err) {
      console.error("Failed to load events:", err);
    } finally {
      setLoading(false);
    }
  }, [getIdToken]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Legacy RSVP flow for free events
  const handleRsvp = useCallback(
    async (event: Event) => {
      if (actionLoading) return;
      setActionLoading(true);
      try {
        const token = await getIdToken();
        if (!token) return;
        const data = await apiFetch<{ success: boolean; data: RSVP }>(`/api/events/${event.id}/rsvp`, {
          method: "POST",
          token,
        });
        if (data.data) {
          setCurrentEvent(event);
          setActiveRsvp(data.data);
          setStage("countdown");
        }
      } catch (err) {
        console.error("RSVP failed:", err);
      } finally {
        setActionLoading(false);
      }
    },
    [actionLoading, getIdToken, setCurrentEvent, setActiveRsvp, setStage],
  );

  // Actually execute a ticket purchase (called directly or after quiz gate)
  const executePurchase = useCallback(
    async (
      event: Event,
      tierId: string,
      pickupPoint?: string,
      timeSlotId?: string,
      addOns?: Array<{ addon_id: string; name: string; quantity: number; price: number; spot_id?: string; spot_name?: string; spot_seat_id?: string; spot_seat_label?: string }>,
      seatId?: string,
      sectionId?: string,
      spotSeatId?: string,
    ) => {
      if (actionLoading) return;
      setActionLoading(true);
      try {
        const token = await getIdToken();
        if (!token) return;
        const data = await apiFetch<{ success: boolean; data: Ticket }>("/api/tickets/create", {
          method: "POST",
          token,
          body: JSON.stringify({
            event_id: event.id,
            tier_id: tierId,
            pickup_point: pickupPoint,
            time_slot_id: timeSlotId,
            add_ons: addOns && addOns.length > 0 ? addOns : undefined,
            seat_id: seatId || undefined,
            section_id: sectionId || undefined,
            spot_seat_id: spotSeatId || undefined,
          }),
        });
        if (data.data) {
          if (data.data.payment_url) {
            // Paid event: redirect to Razorpay Payment Link
            window.location.href = data.data.payment_url;
            return;
          }

          // Free event: ticket already confirmed
          setCurrentEvent(event);
          setActiveTicket(data.data);
          setDetailEvent(null);
          setStage("countdown");
        }
      } catch (err) {
        console.error("Ticket purchase failed:", err);
      } finally {
        setActionLoading(false);
      }
    },
    [actionLoading, getIdToken, setCurrentEvent, setActiveTicket, setStage],
  );

  // Ticket purchase flow — gates on sign quiz if user hasn't taken it yet
  const handleTicketPurchase = useCallback(
    async (
      event: Event,
      tierId: string,
      pickupPoint?: string,
      timeSlotId?: string,
      addOns?: Array<{ addon_id: string; name: string; quantity: number; price: number; spot_id?: string; spot_name?: string; spot_seat_id?: string; spot_seat_label?: string }>,
      seatId?: string,
      sectionId?: string,
      spotSeatId?: string,
    ) => {
      // One-time gate: if user has no sign, show explainer prompt first
      if (!user?.sign) {
        setPendingPurchase({ event, tierId, pickupPoint, timeSlotId, addOns, seatId, sectionId, spotSeatId });
        setShowQuizPrompt(true);
        return;
      }
      await executePurchase(event, tierId, pickupPoint, timeSlotId, addOns, seatId, sectionId, spotSeatId);
    },
    [user?.sign, executePurchase],
  );

  // After quiz completes from checkout gate, resume the pending purchase
  const handleQuizGateComplete = useCallback(() => {
    setShowQuizGate(false);
    if (pendingPurchase) {
      const p = pendingPurchase;
      setPendingPurchase(null);
      executePurchase(p.event, p.tierId, p.pickupPoint, p.timeSlotId, p.addOns, p.seatId, p.sectionId, p.spotSeatId);
    }
  }, [pendingPurchase, executePurchase]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="animate-fadeIn text-center">
          <p className="font-mono text-[11px] uppercase tracking-[3px] text-muted">loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <>
    <PullToRefresh onRefresh={fetchEvents} className="min-h-screen bg-cream pb-[120px]">
      <Noise />

      {/* Quiz reminder banner — fixed at top if user hasn't taken the quiz */}
      {!user?.sign && (
        <div
          className="sticky top-0 z-[100] flex items-center justify-between px-5 py-3"
          style={{ background: "linear-gradient(135deg, #1A1714, #2A2520)", borderBottom: "1px solid rgba(212,165,116,0.2)" }}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-lg">✦</span>
            <p className="font-sans text-[13px] text-cream">
              find your <span className="font-medium text-caramel">comeoffline sign</span>
            </p>
          </div>
          <button
            onClick={() => setShowQuizGate(true)}
            className="rounded-full bg-caramel px-4 py-1.5 font-mono text-[11px] font-medium text-gate-black transition-all active:scale-95"
          >
            take quiz
          </button>
        </div>
      )}

      {/* Profile completion nudge */}
      {profileIncomplete && !nudgeDismissed && (
        <div
          className="flex items-center justify-between border-b px-5 py-3"
          style={{ background: "rgba(212,165,116,0.06)", borderColor: "rgba(212,165,116,0.12)" }}
        >
          <button
            onClick={() => { setProfileCompleteMode(true); setStage("profile"); }}
            className="flex items-center gap-2.5 text-left"
          >
            <span className="text-base">{"\u270F\uFE0F"}</span>
            <p className="font-sans text-[13px] text-near-black">
              your profile is almost done — <span className="font-medium text-caramel">finish it</span>
            </p>
          </button>
          <button
            onClick={() => { setNudgeDismissed(true); try { localStorage.setItem("co_profile_nudge_dismissed", "1"); } catch { /* ignore */ } }}
            className="px-1 py-1 font-mono text-[11px] text-muted/40"
          >
            {"\u2715"}
          </button>
        </div>
      )}

      {/* Header section */}
      <section className="relative px-5 pb-12 pt-10">
        <div
          className="absolute -right-[30px] top-5 h-[120px] w-[120px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(212,165,116,0.08), transparent)",
            animation: "float 6s ease-in-out infinite",
          }}
        />
        <p className="mb-4 font-mono text-[11px] uppercase tracking-[3px] text-muted">
          invite only &middot; est. 2026
        </p>
        <h2
          className="mb-3 max-w-[340px] font-serif text-[38px] font-normal leading-[1.15] text-near-black"
          style={{ letterSpacing: "-1px" }}
        >
          <GlitchText />
        </h2>
        <p className="max-w-[320px] font-sans text-[15px] leading-relaxed text-warm-brown">
          a community for people who still believe the best connections happen face to face.{" "}
          <span className="text-caramel">bangalore chapter.</span>
        </p>
      </section>

      {/* Events count */}
      <div className="flex justify-between px-5 pb-4">
        <span className="font-mono text-[10px] uppercase tracking-[3px] text-muted">
          upcoming events
        </span>
        <span className="font-mono text-[11px] text-caramel">
          {events.length} event{events.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Event cards */}
      <section className="flex flex-col gap-4 px-4">
        {events.map((event, i) => (
          <EventCard key={event.id} event={event} index={i} onOpen={setDetailEvent} />
        ))}

        {/* Coming soon placeholder */}
        <div
          className="animate-fadeSlideUp rounded-[20px] border-[1.5px] border-dashed border-sand p-8 text-center"
          style={{ animationDelay: `${events.length * 0.12 + 0.12}s` }}
        >
          <span className="mb-3 block text-[28px]">&#x1F440;</span>
          <p className="font-serif text-lg text-warm-brown">more coming soon</p>
          <p className="mt-1 font-mono text-[11px] text-muted">
            we&apos;re cooking something unhinged
          </p>
        </div>
      </section>

    </PullToRefresh>

      {/* Detail sheet */}
      {detailEvent && (
        <EventDetail
          event={detailEvent}
          onClose={() => setDetailEvent(null)}
          onRsvp={() => handleRsvp(detailEvent)}
          onTicketPurchase={(tierId, pickupPoint, timeSlotId, addOns, seatId, sectionId, spotSeatId) =>
            handleTicketPurchase(detailEvent, tierId, pickupPoint, timeSlotId, addOns, seatId, sectionId, spotSeatId)
          }
          loading={actionLoading}
        />
      )}

      {/* Quiz prompt modal — shown before payment when user hasn't taken quiz */}
      {showQuizPrompt && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/70 px-6">
          <div
            className="w-full max-w-[340px] rounded-[20px] p-6 text-center"
            style={{ background: "#1A1714", border: "1px solid rgba(212,165,116,0.2)" }}
          >
            <span className="mb-3 inline-block text-4xl">✦</span>
            <h3 className="mb-2 font-serif text-[22px] text-cream">
              one quick thing
            </h3>
            <p className="mb-6 font-sans text-[14px] leading-[1.6] text-muted">
              we use your comeoffline sign to seat you with
              compatible people at the event. takes 2 mins.
            </p>
            <button
              onClick={() => {
                setShowQuizPrompt(false);
                setShowQuizGate(true);
              }}
              className="mb-3 w-full rounded-full bg-caramel py-3.5 font-sans text-[15px] font-medium text-gate-black transition-all active:scale-95"
            >
              take the quiz →
            </button>
            <button
              onClick={() => {
                setShowQuizPrompt(false);
                setPendingPurchase(null);
              }}
              className="font-mono text-[12px] text-muted transition-colors"
            >
              go back
            </button>
          </div>
        </div>
      )}

      {/* Quiz gate overlay — shown once before first ticket purchase or from banner */}
      {showQuizGate && (
        <div className="fixed inset-0 z-[600] overflow-y-auto">
          <SignQuiz onComplete={handleQuizGateComplete} mode={pendingPurchase ? "pre_checkout" : "onboarding"} />
        </div>
      )}
    </>
  );
}
