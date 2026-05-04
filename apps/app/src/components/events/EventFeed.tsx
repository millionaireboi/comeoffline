"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Event, RSVP, Ticket, WaitlistEntry } from "@comeoffline/types";
import { trackFbEvent } from "@comeoffline/analytics";
import { useAuth } from "@/hooks/useAuth";
import { useAppStore } from "@/store/useAppStore";
import { apiFetch } from "@/lib/api";
import { isFullProfileComplete } from "@/lib/profile-completion";
import { GlitchText } from "@/components/ui/GlitchText";
import { EventCard } from "@/components/events/EventCard";
import { EventDetail } from "@/components/events/EventDetail";
import { SignQuiz } from "@/components/onboarding/SignQuiz";
import { Noise } from "@/components/shared/Noise";
import { PullToRefresh } from "@/components/shared/PullToRefresh";

export function EventFeed() {
  const { getIdToken, loading: authLoading } = useAuth();
  const user = useAppStore((s) => s.user);
  const { setCurrentEvent, setActiveRsvp, setActiveTicket, setActiveWaitlistEntry, setStage, setProfileCompleteMode, showToast, pendingPurchaseEventId, setPendingPurchaseEventId, setShowCompletionDialog } = useAppStore();
  const events = useAppStore((s) => s.events);
  const setEvents = useAppStore((s) => s.setEvents);
  const [loading, setLoading] = useState(events.length === 0);
  const [fetchError, setFetchError] = useState(false);
  const [detailEvent, setDetailEvent] = useState<Event | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const actionLockRef = useRef(false);
  const [showQuizGate, setShowQuizGate] = useState(false);
  const activeWaitlistEntry = useAppStore((s) => s.activeWaitlistEntry);
  const [nudgeDismissed, setNudgeDismissed] = useState(() => {
    try { return localStorage.getItem("co_profile_nudge_dismissed") === "1"; } catch { return false; }
  });
  const [phoneNudgeDismissed, setPhoneNudgeDismissed] = useState(() => {
    try { return localStorage.getItem("co_phone_nudge_dismissed") === "1"; } catch { return false; }
  });
  const profileIncomplete = user && (
    !user.bio || !user.hot_take || !user.vibe_tag
    || !user.interests || user.interests.length === 0
    || !user.area || !user.instagram_handle
  );
  const needsPhoneNumber = user && !user.phone_number;

  const tokenRetryCount = useRef(0);

  const fetchEvents = useCallback(async () => {
    setFetchError(false);
    try {
      const token = await getIdToken();
      if (!token) {
        // Auth may still be settling — retry up to 3 times with increasing delay
        if (tokenRetryCount.current < 3) {
          const delay = (tokenRetryCount.current + 1) * 1500;
          tokenRetryCount.current++;
          setTimeout(() => fetchEvents(), delay);
          return;
        }
        setFetchError(true);
        setLoading(false);
        return;
      }
      tokenRetryCount.current = 0;
      const data = await apiFetch<{ success: boolean; data: Event[] }>("/api/events", {
        token,
      });
      if (data.data) setEvents(data.data);
    } catch (err) {
      console.error("Failed to load events:", err);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, [getIdToken]);

  // Wait for auth to finish loading before fetching events
  useEffect(() => {
    if (!authLoading) fetchEvents();
  }, [authLoading, fetchEvents]);

  // Auto-reopen the event detail after the community-safety dialog round-trip:
  // user tapped "i'm in" → safety dialog → "continue setup" → completed full profile →
  // landed on feed. Reopen the same event's detail so they can pick up where they left off.
  useEffect(() => {
    if (!pendingPurchaseEventId || events.length === 0) return;
    const target = events.find((e) => e.id === pendingPurchaseEventId);
    if (target) {
      setDetailEvent(target);
      // Set as current event for any downstream views (countdown, etc.)
      setCurrentEvent(target);
    }
    setPendingPurchaseEventId(null);
  }, [pendingPurchaseEventId, events, setPendingPurchaseEventId, setCurrentEvent]);

  // Legacy RSVP flow for free events
  const handleRsvp = useCallback(
    async (event: Event) => {
      if (actionLockRef.current) return;
      actionLockRef.current = true;
      setActionLoading(true);
      try {
        const token = await getIdToken();
        if (!token) { showToast("please sign in again.", "error"); return; }
        const data = await apiFetch<{ success: boolean; data: RSVP }>(`/api/events/${event.id}/rsvp`, {
          method: "POST",
          token,
        });
        if (data.data) {
          setCurrentEvent(event);
          setActiveRsvp(data.data);
          trackFbEvent("CompleteRegistration", {
            content_name: event.title,
            content_ids: [event.id],
            status: true,
            currency: "INR",
            value: 0,
          });
          showToast("you're in!", "success");
          // Post-purchase routing priority:
          // 1. !full profile → countdown + safety dialog (let dialog drive ProfileSetup)
          // 2. !sign → sign_quiz (educate + collect, then on complete it routes to countdown)
          // 3. else → countdown
          if (!isFullProfileComplete(user)) {
            setStage("countdown");
            setShowCompletionDialog(true);
          } else if (!user?.sign) {
            setStage("sign_quiz");
          } else {
            setStage("countdown");
          }
        }
      } catch (err) {
        console.error("RSVP failed:", err);
        showToast("couldn't complete rsvp. try again.", "error");
      } finally {
        actionLockRef.current = false;
        setActionLoading(false);
      }
    },
    [getIdToken, setCurrentEvent, setActiveRsvp, setStage, setShowCompletionDialog, user, showToast],
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
      if (actionLockRef.current) return;
      actionLockRef.current = true;
      setActionLoading(true);
      try {
        const token = await getIdToken();
        if (!token) { showToast("please sign in again.", "error"); return; }
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
          showToast("you're in!", "success");
          // Same post-purchase routing priority as handleRsvp.
          if (!isFullProfileComplete(user)) {
            setStage("countdown");
            setShowCompletionDialog(true);
          } else if (!user?.sign) {
            setStage("sign_quiz");
          } else {
            setStage("countdown");
          }
        }
      } catch (err) {
        console.error("Ticket purchase failed:", err);
        showToast("couldn't complete purchase. try again.", "error");
      } finally {
        actionLockRef.current = false;
        setActionLoading(false);
      }
    },
    [getIdToken, setCurrentEvent, setActiveTicket, setStage, setShowCompletionDialog, user, showToast],
  );

  // Ticket purchase flow — quiz is no longer required before booking
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
      await executePurchase(event, tierId, pickupPoint, timeSlotId, addOns, seatId, sectionId, spotSeatId);
    },
    [executePurchase],
  );

  // Fetch existing waitlist entry when opening an announced event
  const openEventDetail = useCallback(
    async (event: Event) => {
      setDetailEvent(event);
      trackFbEvent("ViewContent", {
        content_name: event.title,
        content_ids: [event.id],
        content_type: "product",
        currency: "INR",
        value: 0,
      });
      if (event.status === "announced") {
        try {
          const token = await getIdToken();
          if (!token) return;
          const data = await apiFetch<{ success: boolean; data: WaitlistEntry | null }>(
            `/api/events/${event.id}/waitlist`,
            { token },
          );
          setActiveWaitlistEntry(data.data || null);
        } catch {
          setActiveWaitlistEntry(null);
        }
      } else {
        setActiveWaitlistEntry(null);
      }
    },
    [getIdToken, setActiveWaitlistEntry],
  );

  // Join waitlist for announced events
  const handleJoinWaitlist = useCallback(
    async (event: Event, spotsWanted: number) => {
      if (actionLockRef.current) return;
      actionLockRef.current = true;
      setActionLoading(true);
      try {
        const token = await getIdToken();
        if (!token) { showToast("please sign in again.", "error"); return; }
        const data = await apiFetch<{ success: boolean; data: WaitlistEntry }>(
          `/api/events/${event.id}/waitlist`,
          { method: "POST", token, body: JSON.stringify({ spots_wanted: spotsWanted }) },
        );
        if (data.data) {
          setActiveWaitlistEntry(data.data);
          showToast("you're on the waitlist!", "success");
        }
      } catch (err) {
        console.error("Join waitlist failed:", err);
        showToast("couldn't join waitlist. try again.", "error");
      } finally {
        actionLockRef.current = false;
        setActionLoading(false);
      }
    },
    [getIdToken, setActiveWaitlistEntry],
  );

  // Leave waitlist
  const handleLeaveWaitlist = useCallback(
    async (event: Event, entryId: string) => {
      if (actionLockRef.current) return;
      actionLockRef.current = true;
      setActionLoading(true);
      try {
        const token = await getIdToken();
        if (!token) { showToast("please sign in again.", "error"); return; }
        await apiFetch(`/api/events/${event.id}/waitlist/${entryId}`, {
          method: "DELETE",
          token,
        });
        setActiveWaitlistEntry(null);
        showToast("removed from waitlist.", "info");
      } catch (err) {
        console.error("Leave waitlist failed:", err);
        showToast("couldn't leave waitlist. try again.", "error");
      } finally {
        actionLockRef.current = false;
        setActionLoading(false);
      }
    },
    [getIdToken, setActiveWaitlistEntry],
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="animate-fadeIn text-center">
          <p className="font-mono text-[11px] uppercase tracking-[3px] text-muted">loading events...</p>
        </div>
      </div>
    );
  }

  if (fetchError && events.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-8 text-center">
        <span className="mb-4 text-4xl">{"\u{1F614}"}</span>
        <p className="mb-2 font-serif text-xl text-near-black">couldn&apos;t load events</p>
        <p className="mb-6 font-sans text-sm text-muted">check your connection and try again.</p>
        <button
          onClick={fetchEvents}
          className="rounded-full bg-near-black px-6 py-2.5 font-mono text-[11px] text-white"
        >
          retry
        </button>
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

      {/* Phone number nudge for existing users */}
      {needsPhoneNumber && !phoneNudgeDismissed && (
        <div
          className="flex items-center justify-between border-b px-5 py-3"
          style={{ background: "rgba(168,181,160,0.06)", borderColor: "rgba(168,181,160,0.12)" }}
        >
          <button
            onClick={() => { setStage("profile"); }}
            className="flex items-center gap-2.5 text-left"
          >
            <span className="text-base">{"\u260E\uFE0F"}</span>
            <p className="font-sans text-[13px] text-near-black">
              add your phone number — <span className="font-medium text-sage">use it to sign in</span>
            </p>
          </button>
          <button
            onClick={() => { setPhoneNudgeDismissed(true); try { localStorage.setItem("co_phone_nudge_dismissed", "1"); } catch { /* ignore */ } }}
            className="flex h-11 w-11 shrink-0 items-center justify-center font-mono text-[11px] text-muted/40"
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
          <EventCard key={event.id} event={event} index={i} onOpen={openEventDetail} />
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
          onJoinWaitlist={(spotsWanted) => handleJoinWaitlist(detailEvent, spotsWanted)}
          onLeaveWaitlist={(entryId) => handleLeaveWaitlist(detailEvent, entryId)}
          loading={actionLoading}
        />
      )}

      {/* Quiz gate overlay — shown from banner */}
      {showQuizGate && (
        <div className="fixed inset-0 z-[600] overflow-y-auto" style={{ paddingBottom: "calc(56px + env(safe-area-inset-bottom, 0px))" }}>
          {/* Close button */}
          <button
            onClick={() => setShowQuizGate(false)}
            className="fixed right-5 top-5 z-[610] flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm text-cream backdrop-blur-sm"
            style={{ top: "calc(1.25rem + env(safe-area-inset-top, 0px))" }}
          >
            ✕
          </button>
          <SignQuiz onComplete={() => setShowQuizGate(false)} mode="onboarding" />
        </div>
      )}
    </>
  );
}
