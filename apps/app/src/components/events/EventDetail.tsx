"use client";

import { useState, useRef, useMemo } from "react";
import type { Event } from "@comeoffline/types";
import { CheckoutWizard } from "@/components/events/CheckoutWizard";
import { CollapsibleHeader } from "./event-detail/CollapsibleHeader";
import { SectionTabs } from "./event-detail/SectionTabs";
import { OverviewTab } from "./event-detail/OverviewTab";
import { TicketsTab } from "./event-detail/TicketsTab";
import { SeatingTab } from "./event-detail/SeatingTab";
import { FloatingCTA } from "./event-detail/FloatingCTA";

interface EventDetailProps {
  event: Event;
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
  ) => void;
  loading?: boolean;
}

export function EventDetail({ event, onClose, onRsvp, onTicketPurchase, loading }: EventDetailProps) {
  const spotsLeft = event.total_spots - event.spots_taken;
  const isTicketed = !!(event.ticketing?.enabled && !event.is_free);
  const tiers = event.ticketing?.tiers || [];
  const hasCheckoutWizard = !!(event.checkout?.enabled && (event.checkout?.steps?.length || 0) > 0);

  const [activeSection, setActiveSection] = useState<"overview" | "tickets" | "seating">("overview");
  const [scrolled, setScrolled] = useState(false);
  const [selectedTierId, setSelectedTierId] = useState<string | null>(
    tiers.length === 1 && tiers[0].sold < tiers[0].capacity ? tiers[0].id : null,
  );
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [selectedPickup, setSelectedPickup] = useState<string | null>(
    event.pickup_points.length === 1 ? event.pickup_points[0].name : null,
  );
  const [showWizard, setShowWizard] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  const sectionTabs = useMemo(() => {
    const tabs: Array<{ id: string; label: string }> = [{ id: "overview", label: "overview" }];
    if (isTicketed) tabs.push({ id: "tickets", label: "tickets" });
    if (event.seating?.mode && event.seating.mode !== "none") {
      tabs.push({ id: "seating", label: "seating" });
    }
    return tabs;
  }, [isTicketed, event.seating?.mode]);

  const handleTabSwitch = (id: string) => {
    setActiveSection(id as "overview" | "tickets" | "seating");
    scrollRef.current?.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  };

  const handleCTA = () => {
    if (isTicketed && hasCheckoutWizard && onTicketPurchase) {
      setShowWizard(true);
    } else if (isTicketed && onTicketPurchase && selectedTierId) {
      onTicketPurchase(selectedTierId, selectedPickup || undefined, selectedTimeSlot || undefined);
    } else if (onRsvp) {
      onRsvp();
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const s = e.currentTarget.scrollTop > 30;
    if (s !== scrolled) setScrolled(s);
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
          maxHeight: "92vh",
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

        {/* Collapsible header */}
        <CollapsibleHeader
          event={event}
          scrolled={scrolled}
          onClose={onClose}
          cheapestPrice={cheapestPrice}
        />

        {/* Section tabs */}
        <SectionTabs
          tabs={sectionTabs}
          active={activeSection}
          onSelect={handleTabSwitch}
          accentDark={event.accent_dark || "#B8845A"}
        />

        {/* Scrollable content */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-6 pb-6 pt-5"
        >
          {activeSection === "overview" && <OverviewTab event={event} />}

          {activeSection === "tickets" && isTicketed && (
            <TicketsTab
              tiers={tiers}
              selectedTierId={selectedTierId}
              onSelectTier={setSelectedTierId}
              maxPerUser={event.ticketing?.max_per_user}
              refundPolicy={event.ticketing?.refund_policy}
              accent={event.accent || "#D4A574"}
              accentDark={event.accent_dark || "#B8845A"}
            />
          )}

          {activeSection === "seating" && event.seating && (
            <SeatingTab
              seating={event.seating}
              accent={event.accent || "#D4A574"}
              accentDark={event.accent_dark || "#B8845A"}
            />
          )}
        </div>

        {/* Floating CTA */}
        <FloatingCTA
          spotsLeft={spotsLeft}
          isTicketed={isTicketed}
          hasCheckoutWizard={hasCheckoutWizard}
          selectedTier={selectedTier}
          activeSection={activeSection}
          cheapestPrice={cheapestPrice}
          onCTA={handleCTA}
          onSwitchToTickets={() => handleTabSwitch("tickets")}
          canPurchase={canPurchase}
          loading={loading}
          accent={event.accent || "#D4A574"}
          accentDark={event.accent_dark || "#B8845A"}
        />
      </div>

      {/* Checkout Wizard overlay */}
      {showWizard && (
        <CheckoutWizard
          event={event}
          onClose={() => setShowWizard(false)}
          onComplete={(tierId, pickupPoint, timeSlotId, addOns, seatId, sectionId, spotSeatId) => {
            setShowWizard(false);
            onTicketPurchase?.(tierId, pickupPoint, timeSlotId, addOns, seatId, sectionId, spotSeatId);
          }}
          loading={loading}
        />
      )}
    </div>
  );
}
