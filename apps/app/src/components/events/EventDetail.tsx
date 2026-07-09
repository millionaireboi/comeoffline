"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import type { Event, Ticket } from "@comeoffline/types";
import { useAppStore } from "@/store/useAppStore";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";
import { posthog, FUNNEL_EVENT_DETAIL_OPENED_IN_APP, FUNNEL_TIER_SELECTED_IN_APP, FUNNEL_CHECKOUT_OPENED } from "@comeoffline/analytics";
import { CheckoutWizard } from "@/components/events/CheckoutWizard";
import { CollapsibleHeader } from "./event-detail/CollapsibleHeader";
import { OverviewTab } from "./event-detail/OverviewTab";
import { TicketsTab } from "./event-detail/TicketsTab";
import { SeatingTab } from "./event-detail/SeatingTab";
import { FloatingCTA } from "./event-detail/FloatingCTA";
import { AttendeeList } from "./AttendeeList";

interface EventDetailProps {
  event: Event;
  initialTierId?: string | null;
  onClose: () => void;
  onRsvp?: () => void;
  onTicketPurchase?: (
    tierId: string,
    pickupPoint?: string,
    timeSlotId?: string,
    addOns?: Array<{ addon_id: string; name: string; quantity: number; price: number; spot_id?: string; spot_name?: string; spot_seat_id?: string; spot_seat_label?: string }>,
    seatId?: string,
    sectionId?: string,
    spotSeatId?: string,
    discountCode?: string,
  ) => void;
  onJoinWaitlist?: (spotsWanted: number) => void;
  onLeaveWaitlist?: (entryId: string) => void;
  loading?: boolean;
}

export function EventDetail({ event, initialTierId, onClose, onRsvp, onTicketPurchase, onJoinWaitlist, onLeaveWaitlist, loading }: EventDetailProps) {
  const user = useAppStore((s) => s.user);
  const activeWaitlistEntry = useAppStore((s) => s.activeWaitlistEntry);
  const setEventDetailOpen = useAppStore((s) => s.setEventDetailOpen);
  const { getIdToken } = useAuth();
  const isAnnounced = event.status === "announced";
  const spotsLeft = (event.total_spots ?? 0) - (event.spots_taken ?? 0);
  const isTicketed = !!(event.ticketing?.enabled && !event.is_free);
  const tiers = event.ticketing?.tiers || [];
  const hasCheckoutWizard = !!(event.checkout?.enabled && (event.checkout?.steps?.length || 0) > 0);
  const hasSeating = !!(event.seating?.mode && event.seating.mode !== "none" && !isAnnounced);

  // Mark the detail sheet as open so the bottom nav hides itself, freeing the
  // full viewport for the conversion flow.
  useEffect(() => {
    setEventDetailOpen(true);
    return () => setEventDetailOpen(false);
  }, [setEventDetailOpen]);

  // Double-booking guard: check whether the user already holds an active ticket
  // for this event so the CTA reads "view your ticket" instead of "Buy Tickets".
  // Without this, a booked user walks through the entire checkout only to be
  // rejected by the server at the very end.
  const [existingTicket, setExistingTicket] = useState<Ticket | null>(null);
  useEffect(() => {
    if (isAnnounced) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await getIdToken();
        if (!token || cancelled) return;
        const res = await apiFetch<{ success: boolean; data: Ticket | null }>(
          `/api/tickets/event/${event.id}`,
          { token },
        );
        if (!cancelled && res.data) setExistingTicket(res.data);
      } catch {
        // Non-fatal — worst case the server still rejects a duplicate purchase
      }
    })();
    return () => { cancelled = true; };
  }, [event.id, isAnnounced, getIdToken]);

  const handleViewTicket = () => {
    if (!existingTicket) return;
    const { setActiveTicket, setCurrentEvent, setStage } = useAppStore.getState();
    setCurrentEvent(event);
    setActiveTicket(existingTicket);
    onClose();
    setStage("countdown");
  };

  // Funnel: ad clicker reached the in-app event detail (post-handoff).
  useEffect(() => {
    posthog.capture(FUNNEL_EVENT_DETAIL_OPENED_IN_APP, {
      event_id: event.id,
      event_title: event.title,
      spots_remaining: spotsLeft,
      came_via_deeplink: !!initialTierId,
      preselected_tier_id: initialTierId,
    });
  }, [event.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-select the cheapest available tier on open. Deep-link tier wins if
  // still available; otherwise we pick the lowest-priced tier with capacity.
  const initialTierStillAvailable = !!initialTierId && tiers.some((t) => t.id === initialTierId && t.sold < t.capacity);
  const cheapestAvailableTier = useMemo(() => {
    const available = tiers.filter((t) => t.sold < t.capacity);
    if (available.length === 0) return null;
    return available.reduce((min, t) => (t.price < min.price ? t : min), available[0]);
  }, [tiers]);

  const [selectedTierId, setSelectedTierId] = useState<string | null>(
    initialTierStillAvailable
      ? initialTierId!
      : cheapestAvailableTier?.id ?? null,
  );
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [selectedPickup, setSelectedPickup] = useState<string | null>(
    event.pickup_points?.length === 1 ? event.pickup_points[0].name : null,
  );
  const [showWizard, setShowWizard] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const ticketsRef = useRef<HTMLDivElement>(null);

  const selectedTier = tiers.find((t) => t.id === selectedTierId);
  const timeSlotsEnabled = event.ticketing?.time_slots_enabled && (event.ticketing?.time_slots?.length || 0) > 0;

  const canPurchase = isTicketed
    ? !!(selectedTierId && (!timeSlotsEnabled || selectedTimeSlot))
    : true;

  const cheapestPrice = useMemo(() => {
    if (!isTicketed || tiers.length === 0) return null;
    const available = tiers.filter((t) => t.sold < t.capacity);
    if (available.length === 0) return null;
    return Math.min(...available.map((t) => t.price));
  }, [isTicketed, tiers]);

  const handleCTA = () => {
    // Already booked — never re-enter checkout, go to the ticket instead.
    if (existingTicket) {
      handleViewTicket();
      return;
    }
    // Funnel: user committed to checkout (CTA tap with valid tier).
    posthog.capture(FUNNEL_CHECKOUT_OPENED, {
      event_id: event.id,
      tier_id: selectedTierId,
      tier_price: selectedTier?.price,
      checkout_path: hasCheckoutWizard ? "wizard" : "wizard_summary_only",
    });
    // Purchase / RSVP is no longer gated on the rest of the profile — buying is the highest-intent
    // moment, so don't block it. The remaining onboarding fields are collected post-purchase.
    if (isTicketed && onTicketPurchase) {
      // Every paid purchase goes through the wizard: with no configured checkout
      // steps it collapses to a single order-summary screen, which is where the
      // promo code field lives and the only order review before Razorpay.
      setShowWizard(true);
    } else if (onRsvp) {
      onRsvp();
    }
  };

  // Wrap setSelectedTierId so we capture every tier-pick interaction in the funnel.
  const handleSelectTier = (id: string) => {
    setSelectedTierId(id);
    const tier = tiers.find((t) => t.id === id);
    posthog.capture(FUNNEL_TIER_SELECTED_IN_APP, {
      event_id: event.id,
      tier_id: id,
      tier_label: tier?.label,
      tier_price: tier?.price,
    });
  };

  const scrollToTickets = () => {
    ticketsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="animate-fadeIn fixed inset-0 z-[500] flex items-end justify-center">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-[rgba(10,9,7,0.6)] backdrop-blur-lg"
      />

      {/* Sheet */}
      <div
        className="relative flex w-full max-w-[430px] flex-col overflow-hidden rounded-t-[28px] bg-cream"
        style={{
          maxHeight: "100dvh",
          height: "100dvh",
          animation: "chatSlideIn 0.4s cubic-bezier(0.16,1,0.3,1) both",
        }}
      >
        {/* Film grain overlay */}
        <div
          className="pointer-events-none absolute inset-0 z-10 opacity-[0.025]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
            backgroundRepeat: "repeat",
          }}
        />

        {/* Compact header — hero + pill + tagline + date/location row */}
        <CollapsibleHeader
          event={event}
          onClose={onClose}
        />

        {/* Single-scroll content: tiers → social proof → about → includes → schedule → venue → FAQ */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-6 pb-6 pt-3"
        >
          {/* Tickets — first thing visible after the header. This is the conversion moment. */}
          {isTicketed && !isAnnounced && (
            <div ref={ticketsRef} className="mb-6">
              <TicketsTab
                tiers={tiers}
                selectedTierId={selectedTierId}
                onSelectTier={handleSelectTier}
                maxPerUser={event.ticketing?.max_per_user}
                refundPolicy={event.ticketing?.refund_policy}
                accent={event.accent || "#D4A574"}
                accentDark={event.accent_dark || "#B8845A"}
              />
            </div>
          )}

          {/* Seating — if the event uses it */}
          {hasSeating && event.seating && (
            <div className="mb-6">
              <SeatingTab
                seating={event.seating}
                accent={event.accent || "#D4A574"}
                accentDark={event.accent_dark || "#B8845A"}
              />
            </div>
          )}

          {/* About / includes / schedule / venue / FAQ — everything that used to live on OVERVIEW */}
          <OverviewTab event={event} />

          {/* Attendees — at the bottom, no longer a tab */}
          {!isAnnounced && (
            <div className="mt-6">
              <AttendeeList eventId={event.id} />
            </div>
          )}
        </div>

        {/* Floating CTA */}
        <FloatingCTA
          alreadyBooked={!!existingTicket}
          spotsLeft={spotsLeft}
          isTicketed={isTicketed}
          hasCheckoutWizard={hasCheckoutWizard}
          selectedTier={selectedTier}
          cheapestPrice={cheapestPrice}
          onCTA={handleCTA}
          onScrollToTickets={scrollToTickets}
          canPurchase={canPurchase}
          loading={loading}
          accent={event.accent || "#D4A574"}
          accentDark={event.accent_dark || "#B8845A"}
          isAnnounced={isAnnounced}
          waitlistCount={event.waitlist_count || 0}
          activeWaitlistEntry={activeWaitlistEntry}
          onJoinWaitlist={onJoinWaitlist}
          onLeaveWaitlist={onLeaveWaitlist}
        />
      </div>

      {/* Checkout Wizard overlay */}
      {showWizard && (
        <CheckoutWizard
          event={event}
          initialTierId={selectedTierId}
          onClose={() => {
            // No exit survey on abandon — punishing hesitation with a popup
            // turns "maybe later" into "never". CHECKOUT_ABANDONED analytics
            // still fire from inside the wizard.
            setShowWizard(false);
          }}
          onComplete={(tierId, pickupPoint, timeSlotId, addOns, seatId, sectionId, spotSeatId, discountCode) => {
            setShowWizard(false);
            onTicketPurchase?.(tierId, pickupPoint, timeSlotId, addOns, seatId, sectionId, spotSeatId, discountCode);
          }}
          loading={loading}
        />
      )}

    </div>
  );
}
