"use client";

import { useState } from "react";
import type { Event, TicketTier, TimeSlot } from "@comeoffline/types";
import { SpotsBar } from "@/components/ui/SpotsBar";

interface EventDetailProps {
  event: Event;
  onClose: () => void;
  onRsvp?: () => void;
  onTicketPurchase?: (tierId: string, pickupPoint?: string, timeSlotId?: string) => void;
  loading?: boolean;
}

function TierCard({
  tier,
  selected,
  onSelect,
  accent,
}: {
  tier: TicketTier;
  selected: boolean;
  onSelect: () => void;
  accent: string;
}) {
  const soldOut = tier.sold >= tier.capacity;
  const remaining = tier.capacity - tier.sold;
  const closed = tier.deadline ? new Date(tier.deadline) < new Date() : false;
  const notYetOpen = tier.opens_at ? new Date(tier.opens_at) > new Date() : false;
  const unavailable = soldOut || closed || notYetOpen;

  return (
    <button
      onClick={() => !unavailable && onSelect()}
      disabled={!!unavailable}
      className={`w-full rounded-[16px] border-2 p-4 text-left transition-all ${
        selected
          ? "border-near-black bg-near-black/[0.03]"
          : unavailable
            ? "border-sand/50 bg-sand/20 opacity-50"
            : "border-sand bg-white hover:border-near-black/30"
      }`}
    >
      <div className="mb-2 flex items-start justify-between">
        <div>
          <p className="font-sans text-[15px] font-medium text-near-black">{tier.label}</p>
          {tier.description && (
            <p className="mt-0.5 font-mono text-[11px] text-muted">{tier.description}</p>
          )}
        </div>
        <span className="font-sans text-lg font-semibold text-near-black">
          {tier.price === 0 ? "Free" : `\u20B9${tier.price}`}
        </span>
      </div>

      <div className="flex items-center gap-3">
        {!unavailable && (
          <div className="flex items-center gap-1.5">
            <div
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: remaining <= 5 ? "#D4654A" : accent }}
            />
            <span className="font-mono text-[10px] text-muted">
              {remaining <= 10 ? `${remaining} left` : `${remaining} available`}
            </span>
          </div>
        )}
        {soldOut && (
          <span className="font-mono text-[10px] font-medium text-terracotta">sold out</span>
        )}
        {closed && !soldOut && (
          <span className="font-mono text-[10px] font-medium text-muted">tier closed</span>
        )}
        {notYetOpen && (
          <span className="font-mono text-[10px] font-medium text-muted">opens soon</span>
        )}
        {tier.per_person && tier.per_person > 1 && (
          <span className="font-mono text-[10px] text-muted">
            {tier.per_person} people
          </span>
        )}
      </div>
    </button>
  );
}

function TimeSlotPicker({
  slots,
  selected,
  onSelect,
}: {
  slots: TimeSlot[];
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="mb-5">
      <span className="mb-3 block font-mono text-[10px] uppercase tracking-[2px] text-muted">
        pick a time slot
      </span>
      <div className="flex flex-wrap gap-2">
        {slots.map((slot) => {
          const full = slot.booked >= slot.capacity;
          return (
            <button
              key={slot.id}
              onClick={() => !full && onSelect(slot.id)}
              disabled={full}
              className={`rounded-xl border px-4 py-2.5 transition-all ${
                selected === slot.id
                  ? "border-near-black bg-near-black text-white"
                  : full
                    ? "border-sand/50 bg-sand/20 text-muted/50"
                    : "border-sand bg-white text-near-black hover:border-near-black/30"
              }`}
            >
              <span className="block font-sans text-[13px] font-medium">{slot.label}</span>
              {full && (
                <span className="block font-mono text-[9px] text-muted">full</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function EventDetail({ event, onClose, onRsvp, onTicketPurchase, loading }: EventDetailProps) {
  const spotsLeft = event.total_spots - event.spots_taken;
  const isTicketed = event.ticketing?.enabled && !event.is_free;
  const tiers = event.ticketing?.tiers || [];
  const timeSlots = event.ticketing?.time_slots || [];
  const timeSlotsEnabled = event.ticketing?.time_slots_enabled && timeSlots.length > 0;

  const [selectedTierId, setSelectedTierId] = useState<string | null>(
    tiers.length === 1 && tiers[0].sold < tiers[0].capacity ? tiers[0].id : null,
  );
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [selectedPickup, setSelectedPickup] = useState<string | null>(
    event.pickup_points.length === 1 ? event.pickup_points[0].name : null,
  );

  const selectedTier = tiers.find((t) => t.id === selectedTierId);

  const canPurchase = isTicketed
    ? selectedTierId && (!timeSlotsEnabled || selectedTimeSlot)
    : true;

  const handleCTA = () => {
    if (isTicketed && onTicketPurchase && selectedTierId) {
      onTicketPurchase(selectedTierId, selectedPickup || undefined, selectedTimeSlot || undefined);
    } else if (onRsvp) {
      onRsvp();
    }
  };

  const ctaLabel = () => {
    if (loading) return isTicketed ? "getting your ticket..." : "reserving spot...";
    if (spotsLeft === 0) return "sold out";
    if (isTicketed) {
      if (!selectedTierId) return "select a tier";
      if (timeSlotsEnabled && !selectedTimeSlot) return "select a time slot";
      return selectedTier?.price === 0
        ? "get free ticket \u2192"
        : `pay \u20B9${selectedTier?.price} \u2192`;
    }
    return "i\u2019m in \u2192";
  };

  return (
    <div className="animate-fadeIn fixed inset-0 z-[500] flex items-end justify-center">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-[rgba(10,9,7,0.5)] backdrop-blur-sm"
      />

      {/* Sheet */}
      <div
        className="relative max-h-[90vh] w-full max-w-[430px] overflow-hidden rounded-t-3xl bg-cream"
        style={{ animation: "chatSlideIn 0.4s cubic-bezier(0.16,1,0.3,1) both" }}
      >
        {/* Accent line */}
        <div
          className="h-[5px]"
          style={{ background: `linear-gradient(90deg, ${event.accent}, ${event.accent_dark})` }}
        />

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6">
          <div>
            <span
              className="rounded-full px-2.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[1.5px]"
              style={{ color: event.accent_dark, background: event.accent + "25" }}
            >
              {event.tag}
            </span>
            <h2 className="mt-2.5 font-serif text-[32px] font-normal leading-none text-near-black">
              {event.title} {event.emoji}
            </h2>
            <p className="mt-1 font-sans text-[15px] italic text-warm-brown">
              {event.tagline}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base text-warm-brown"
            style={{ background: "rgba(232,221,208,0.5)" }}
          >
            {"\u2715"}
          </button>
        </div>

        {/* Scrollable content */}
        <div className="max-h-[calc(90vh-200px)] overflow-y-auto px-6 pb-6 pt-5">
          {/* Date/time */}
          <div className="mb-5 flex flex-wrap gap-4">
            <div className="font-sans text-[13px] text-soft-black">{event.date}</div>
            <div className="font-sans text-[13px] text-soft-black">{event.time}</div>
          </div>

          {/* Description */}
          <p className="mb-7 font-sans text-[15px] leading-relaxed text-warm-brown">
            {event.description}
          </p>

          {/* Ticket Tiers */}
          {isTicketed && tiers.length > 0 && (
            <div className="mb-7">
              <span className="mb-3.5 block font-mono text-[10px] uppercase tracking-[2px] text-muted">
                tickets
              </span>
              <div className="flex flex-col gap-2.5">
                {tiers.map((tier) => (
                  <TierCard
                    key={tier.id}
                    tier={tier}
                    selected={selectedTierId === tier.id}
                    onSelect={() => setSelectedTierId(tier.id)}
                    accent={event.accent_dark}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Time Slots */}
          {isTicketed && timeSlotsEnabled && (
            <TimeSlotPicker
              slots={timeSlots}
              selected={selectedTimeSlot}
              onSelect={setSelectedTimeSlot}
            />
          )}

          {/* Pickup Points */}
          {event.pickup_points.length > 1 && (
            <div className="mb-7">
              <span className="mb-3.5 block font-mono text-[10px] uppercase tracking-[2px] text-muted">
                pickup point
              </span>
              <div className="flex flex-col gap-2">
                {event.pickup_points.map((pp) => (
                  <button
                    key={pp.name}
                    onClick={() => setSelectedPickup(pp.name)}
                    className={`rounded-[14px] border p-3.5 text-left transition-all ${
                      selectedPickup === pp.name
                        ? "border-near-black bg-near-black/[0.03]"
                        : "border-sand bg-white hover:border-near-black/30"
                    }`}
                  >
                    <p className="font-sans text-[13px] font-medium text-near-black">{pp.name}</p>
                    <p className="font-mono text-[10px] text-muted">{pp.time}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Zones */}
          {event.zones.length > 0 && (
            <div className="mb-7">
              <span className="mb-3.5 block font-mono text-[10px] uppercase tracking-[2px] text-muted">
                what&apos;s inside
              </span>
              <div className="grid grid-cols-2 gap-2.5">
                {event.zones.map((z, i) => (
                  <div
                    key={i}
                    className="rounded-[14px] bg-white p-4 shadow-[0_1px_3px_rgba(26,23,21,0.04)]"
                  >
                    <span className="mb-2 block text-[22px]">{z.icon}</span>
                    <p className="mb-0.5 font-sans text-[13px] font-medium text-near-black">
                      {z.name}
                    </p>
                    <p className="font-mono text-[10px] text-muted">{z.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Includes */}
          {event.includes.length > 0 && (
            <div className="mb-7">
              <span className="mb-3.5 block font-mono text-[10px] uppercase tracking-[2px] text-muted">
                what&apos;s included
              </span>
              <div className="flex flex-col gap-2">
                {event.includes.map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <div
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: event.accent_dark }}
                    />
                    <span className="font-sans text-sm text-warm-brown">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dress code */}
          <div
            className="mb-5 flex items-center gap-2.5 rounded-[14px] px-[18px] py-3.5"
            style={{ background: event.accent + "12" }}
          >
            <p className="font-sans text-[13px] text-warm-brown">
              dress code: <strong>{event.dress_code}</strong>
            </p>
          </div>

          {/* Refund policy */}
          {isTicketed && event.ticketing?.refund_policy && (
            <p className="mb-3 font-mono text-[10px] text-muted">
              {event.ticketing.refund_policy}
            </p>
          )}

          <SpotsBar spotsLeft={spotsLeft} totalSpots={event.total_spots} accent={event.accent_dark} />
        </div>

        {/* CTA */}
        <div className="border-t border-sand bg-cream px-6 pb-7 pt-4">
          <button
            onClick={handleCTA}
            disabled={spotsLeft === 0 || loading || !canPurchase}
            className="w-full rounded-2xl py-[18px] font-sans text-base font-medium transition-opacity"
            style={{
              background: spotsLeft === 0 || !canPurchase ? "#E8DDD0" : "#1A1715",
              color: spotsLeft === 0 || !canPurchase ? "#9B8E82" : "#fff",
              cursor: spotsLeft === 0 || loading || !canPurchase ? "default" : "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {ctaLabel()}
          </button>
        </div>
      </div>
    </div>
  );
}
