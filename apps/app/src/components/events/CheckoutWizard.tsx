"use client";

import { useState, useMemo } from "react";
import type { Event, TicketTier, CheckoutStep, CheckoutAddOn, TimeSlot, SeatingSection, Seat } from "@comeoffline/types";

interface SelectedAddon {
  addon_id: string;
  name: string;
  quantity: number;
  price: number;
}

interface CheckoutWizardProps {
  event: Event;
  onComplete: (
    tierId: string,
    pickupPoint: string | undefined,
    timeSlotId: string | undefined,
    addOns: SelectedAddon[],
    seatId?: string,
    sectionId?: string,
  ) => void;
  onClose: () => void;
  loading?: boolean;
}

/* ── Tier selection step ─────────────────────────── */

function TierStep({
  tiers,
  selected,
  onSelect,
  accent,
}: {
  tiers: TicketTier[];
  selected: string | null;
  onSelect: (id: string) => void;
  accent: string;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      {tiers.map((tier) => {
        const soldOut = tier.sold >= tier.capacity;
        const closed = tier.deadline ? new Date(tier.deadline) < new Date() : false;
        const notYetOpen = tier.opens_at ? new Date(tier.opens_at) > new Date() : false;
        const unavailable = soldOut || closed || notYetOpen;
        const remaining = tier.capacity - tier.sold;

        return (
          <button
            key={tier.id}
            onClick={() => !unavailable && onSelect(tier.id)}
            disabled={!!unavailable}
            className={`w-full rounded-[16px] border-2 p-4 text-left transition-all ${
              selected === tier.id
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
              {soldOut && <span className="font-mono text-[10px] font-medium text-terracotta">sold out</span>}
              {closed && !soldOut && <span className="font-mono text-[10px] font-medium text-muted">tier closed</span>}
              {notYetOpen && <span className="font-mono text-[10px] font-medium text-muted">opens soon</span>}
              {tier.per_person && tier.per_person > 1 && (
                <span className="font-mono text-[10px] text-muted">{tier.per_person} people</span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ── Add-on selection step ───────────────────────── */

function AddonSelectStep({
  step,
  selections,
  onChange,
  accent,
}: {
  step: CheckoutStep;
  selections: Record<string, number>;
  onChange: (selections: Record<string, number>) => void;
  accent: string;
}) {
  const addons = step.add_ons || [];

  return (
    <div className="flex flex-col gap-3">
      {step.description && (
        <p className="font-sans text-[13px] text-warm-brown">{step.description}</p>
      )}
      {addons.map((addon) => {
        const qty = selections[addon.id] || 0;
        const selected = qty > 0;

        return (
          <div
            key={addon.id}
            className={`rounded-[16px] border-2 p-4 transition-all ${
              selected ? "border-near-black bg-near-black/[0.03]" : "border-sand bg-white"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="font-sans text-[15px] font-medium text-near-black">{addon.name}</p>
                {addon.description && (
                  <p className="mt-0.5 font-sans text-[12px] text-warm-brown">{addon.description}</p>
                )}
                {addon.available <= 10 && addon.available > 0 && (
                  <p className="mt-1 font-mono text-[10px] text-terracotta">
                    only {addon.available} left
                  </p>
                )}
              </div>
              <span className="ml-3 font-sans text-base font-semibold text-near-black">
                {addon.price === 0 ? "Free" : `\u20B9${addon.price}`}
              </span>
            </div>

            {/* Quantity controls */}
            <div className="mt-3 flex items-center justify-between">
              {addon.max_quantity === 1 ? (
                <button
                  onClick={() => onChange({ ...selections, [addon.id]: selected ? 0 : 1 })}
                  className={`rounded-xl px-4 py-2 font-mono text-[11px] transition-all ${
                    selected
                      ? "bg-near-black text-cream"
                      : "bg-sand/50 text-near-black hover:bg-sand"
                  }`}
                >
                  {selected ? "selected" : "select"}
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() =>
                      onChange({ ...selections, [addon.id]: Math.max(0, qty - 1) })
                    }
                    disabled={qty === 0}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-sand/50 font-sans text-base text-near-black transition-colors hover:bg-sand disabled:opacity-30"
                  >
                    -
                  </button>
                  <span className="min-w-[20px] text-center font-mono text-sm text-near-black">{qty}</span>
                  <button
                    onClick={() =>
                      onChange({
                        ...selections,
                        [addon.id]: Math.min(addon.max_quantity, qty + 1),
                      })
                    }
                    disabled={qty >= addon.max_quantity}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-base text-cream transition-colors hover:opacity-80 disabled:opacity-30"
                    style={{ background: accent }}
                  >
                    +
                  </button>
                </div>
              )}
              {addon.required && qty === 0 && (
                <span className="font-mono text-[9px] text-terracotta">required</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Info step ───────────────────────────────────── */

function InfoStep({ step }: { step: CheckoutStep }) {
  return (
    <div className="rounded-[16px] border border-sand bg-white p-5">
      {step.description && (
        <p className="font-sans text-[14px] leading-relaxed text-warm-brown">{step.description}</p>
      )}
      {step.image_url && (
        <img
          src={step.image_url}
          alt={step.title}
          className="mt-4 w-full rounded-xl object-cover"
        />
      )}
    </div>
  );
}

/* ── Seat / Section selection step ────────────────── */

function SeatSelectStep({
  event,
  selectedSeatId,
  selectedSectionId,
  onSelectSeat,
  onSelectSection,
}: {
  event: Event;
  selectedSeatId: string | null;
  selectedSectionId: string | null;
  onSelectSeat: (id: string | null) => void;
  onSelectSection: (id: string | null) => void;
}) {
  const seating = event.seating;
  if (!seating) return null;

  const mode = seating.mode;
  const sections = seating.sections || [];
  const rows = seating.rows || [];
  const seats = seating.seats || [];

  return (
    <div>
      {/* Section selection */}
      {(mode === "sections" || mode === "mixed") && sections.length > 0 && (
        <div className="mb-4">
          <span className="mb-2.5 block font-mono text-[10px] uppercase tracking-[2px] text-muted">
            choose a section
          </span>
          <div className="flex flex-col gap-2">
            {sections.map((sec) => {
              const remaining = sec.capacity - sec.booked;
              const full = remaining <= 0;
              const selected = selectedSectionId === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => {
                    if (!full) {
                      onSelectSection(selected ? null : sec.id);
                      onSelectSeat(null);
                    }
                  }}
                  disabled={full}
                  className={`rounded-[16px] border-2 p-4 text-left transition-all ${
                    selected
                      ? "border-near-black bg-near-black/[0.03]"
                      : full
                        ? "border-sand/50 bg-sand/20 opacity-50"
                        : "border-sand bg-white hover:border-near-black/30"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {sec.emoji && <span className="text-xl">{sec.emoji}</span>}
                      <div>
                        <p className="font-sans text-[15px] font-medium text-near-black">{sec.name}</p>
                        {sec.description && (
                          <p className="mt-0.5 font-mono text-[11px] text-muted">{sec.description}</p>
                        )}
                      </div>
                    </div>
                    {sec.price_override != null && (
                      <span className="font-sans text-base font-semibold text-near-black">
                        {sec.price_override === 0 ? "Free" : `\u20B9${sec.price_override}`}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-1.5">
                    <div
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: full ? "#D4654A" : sec.color || "#D4A574" }}
                    />
                    <span className="font-mono text-[10px] text-muted">
                      {full ? "full" : `${remaining} spot${remaining !== 1 ? "s" : ""} left`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Individual seat selection */}
      {(mode === "seats" || mode === "mixed") && rows.length > 0 && (
        <div>
          <span className="mb-2.5 block font-mono text-[10px] uppercase tracking-[2px] text-muted">
            {mode === "mixed" ? "or choose a specific seat" : "choose your seat"}
          </span>

          {/* Stage indicator */}
          <div className="mx-auto mb-3 h-6 w-3/4 rounded-b-[20px] bg-sand/30 text-center font-mono text-[9px] font-medium leading-6 text-muted">
            STAGE
          </div>

          {/* Seat map */}
          <div className="flex flex-col items-center gap-1.5">
            {rows.map((row) => {
              const rowSeats = seats.filter((s) => s.row === row.label);
              const section = sections.find((s) => s.id === row.section_id);
              const seatColor = section?.color || "#D4A574";

              return (
                <div key={row.id} className="flex items-center gap-2">
                  <span className="w-5 text-right font-mono text-[10px] font-medium text-muted">
                    {row.label}
                  </span>
                  <div className="flex gap-1">
                    {rowSeats.map((seat) => {
                      const taken = seat.status === "booked" || seat.status === "held";
                      const selected = selectedSeatId === seat.id;

                      return (
                        <button
                          key={seat.id}
                          onClick={() => {
                            if (!taken) {
                              onSelectSeat(selected ? null : seat.id);
                              onSelectSection(seat.section_id || null);
                            }
                          }}
                          disabled={taken}
                          className={`flex h-7 w-7 items-center justify-center rounded-md font-mono text-[9px] transition-all ${
                            selected
                              ? "text-white shadow-sm"
                              : taken
                                ? "bg-sand/30 text-muted/30"
                                : "bg-white text-near-black hover:opacity-80"
                          }`}
                          style={{
                            background: selected
                              ? seatColor
                              : taken
                                ? undefined
                                : undefined,
                            borderWidth: "1.5px",
                            borderColor: selected
                              ? seatColor
                              : taken
                                ? "rgba(232,221,208,0.3)"
                                : seatColor + "40",
                          }}
                          title={taken ? `${seat.id} — taken` : seat.id}
                        >
                          {seat.number}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-3 flex justify-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-sm border border-sand bg-white" />
              <span className="font-mono text-[9px] text-muted">available</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-sm bg-near-black" />
              <span className="font-mono text-[9px] text-muted">selected</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-sm bg-sand/30" />
              <span className="font-mono text-[9px] text-muted">taken</span>
            </div>
          </div>

          {selectedSeatId && (
            <div className="mt-3 rounded-xl bg-sand/20 px-4 py-2.5 text-center">
              <span className="font-mono text-[11px] text-near-black">
                seat <strong>{selectedSeatId}</strong> selected
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Pickup selection step ───────────────────────── */

function PickupStep({
  pickupPoints,
  selected,
  onSelect,
}: {
  pickupPoints: Event["pickup_points"];
  selected: string | null;
  onSelect: (name: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {pickupPoints.map((pp) => (
        <button
          key={pp.name}
          onClick={() => onSelect(pp.name)}
          className={`rounded-[14px] border p-3.5 text-left transition-all ${
            selected === pp.name
              ? "border-near-black bg-near-black/[0.03]"
              : "border-sand bg-white hover:border-near-black/30"
          }`}
        >
          <p className="font-sans text-[13px] font-medium text-near-black">{pp.name}</p>
          <p className="font-mono text-[10px] text-muted">{pp.time}</p>
        </button>
      ))}
    </div>
  );
}

/* ── Time slot step ──────────────────────────────── */

function TimeSlotStep({
  slots,
  selected,
  onSelect,
}: {
  slots: TimeSlot[];
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  return (
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
            {full && <span className="block font-mono text-[9px] text-muted">full</span>}
          </button>
        );
      })}
    </div>
  );
}

/* ── Summary step ────────────────────────────────── */

function SummaryStep({
  event,
  selectedTier,
  pickupPoint,
  timeSlotId,
  addonSelections,
  checkoutSteps,
  seatId,
  sectionId,
}: {
  event: Event;
  selectedTier: TicketTier | undefined;
  pickupPoint: string | null;
  timeSlotId: string | null;
  addonSelections: Record<string, Record<string, number>>;
  checkoutSteps: CheckoutStep[];
  seatId: string | null;
  sectionId: string | null;
}) {
  const tierPrice = selectedTier?.price || 0;

  // Compute add-on totals
  const addonItems: { name: string; qty: number; price: number }[] = [];
  for (const step of checkoutSteps) {
    if (step.type !== "addon_select" || !step.add_ons) continue;
    const sel = addonSelections[step.id] || {};
    for (const addon of step.add_ons) {
      const qty = sel[addon.id] || 0;
      if (qty > 0) {
        addonItems.push({ name: addon.name, qty, price: addon.price });
      }
    }
  }

  const addonTotal = addonItems.reduce((s, a) => s + a.price * a.qty, 0);
  const total = tierPrice + addonTotal;

  const timeSlot = event.ticketing?.time_slots?.find((s) => s.id === timeSlotId);

  return (
    <div className="rounded-[16px] border border-sand bg-white p-5">
      <span className="mb-4 block font-mono text-[10px] uppercase tracking-[2px] text-muted">
        order summary
      </span>

      {/* Tier */}
      <div className="flex items-center justify-between pb-3">
        <div>
          <p className="font-sans text-[14px] font-medium text-near-black">{selectedTier?.label}</p>
          {selectedTier?.per_person && selectedTier.per_person > 1 && (
            <p className="font-mono text-[10px] text-muted">{selectedTier.per_person} people</p>
          )}
        </div>
        <span className="font-sans text-[14px] font-medium text-near-black">
          {tierPrice === 0 ? "Free" : `\u20B9${tierPrice}`}
        </span>
      </div>

      {/* Add-ons */}
      {addonItems.map((a, i) => (
        <div key={i} className="flex items-center justify-between border-t border-sand/50 py-2.5">
          <div>
            <p className="font-sans text-[13px] text-near-black">{a.name}</p>
            {a.qty > 1 && <p className="font-mono text-[10px] text-muted">x{a.qty}</p>}
          </div>
          <span className="font-sans text-[13px] text-near-black">
            {a.price === 0 ? "Free" : `\u20B9${a.price * a.qty}`}
          </span>
        </div>
      ))}

      {/* Pickup, time, seat */}
      {(pickupPoint || timeSlot || seatId || sectionId) && (
        <div className="mt-2 border-t border-sand/50 pt-3">
          {seatId && (
            <p className="font-mono text-[10px] text-muted">seat: {seatId}</p>
          )}
          {sectionId && !seatId && (
            <p className="font-mono text-[10px] text-muted">
              section: {event.seating?.sections?.find((s) => s.id === sectionId)?.name || sectionId}
            </p>
          )}
          {pickupPoint && pickupPoint !== "TBD" && (
            <p className="font-mono text-[10px] text-muted">pickup: {pickupPoint}</p>
          )}
          {timeSlot && (
            <p className="font-mono text-[10px] text-muted">time: {timeSlot.label}</p>
          )}
        </div>
      )}

      {/* Total */}
      <div className="mt-3 flex items-center justify-between border-t border-near-black/10 pt-3">
        <span className="font-mono text-[11px] uppercase tracking-[1px] text-near-black">total</span>
        <span className="font-sans text-xl font-semibold text-near-black">
          {total === 0 ? "Free" : `\u20B9${total}`}
        </span>
      </div>
    </div>
  );
}

/* ── Main Wizard ─────────────────────────────────── */

export function CheckoutWizard({ event, onComplete, onClose, loading }: CheckoutWizardProps) {
  const tiers = event.ticketing?.tiers || [];
  const checkoutSteps = event.checkout?.steps || [];
  const timeSlots = event.ticketing?.time_slots || [];
  const timeSlotsEnabled = event.ticketing?.time_slots_enabled && timeSlots.length > 0;
  const hasPickupStep = checkoutSteps.some((s) => s.type === "pickup_select");

  // Build step sequence
  const steps = useMemo(() => {
    const s: Array<{ type: "tier" | "timeslot" | "checkout" | "summary"; stepData?: CheckoutStep }> = [];
    // Tier selection is always first
    s.push({ type: "tier" });
    // Time slots after tier
    if (timeSlotsEnabled) s.push({ type: "timeslot" });
    // Admin-configured steps
    for (const cs of checkoutSteps) {
      // Pickup point selection is handled by checkout step type
      s.push({ type: "checkout", stepData: cs });
    }
    // If event has pickup points but no explicit pickup step, add one after checkout
    if (event.pickup_points.length > 1 && !hasPickupStep) {
      // Pickup is handled in the summary or from EventDetail — skip auto-add
    }
    // Summary is always last
    s.push({ type: "summary" });
    return s;
  }, [checkoutSteps, timeSlotsEnabled, event.pickup_points.length, hasPickupStep]);

  const [currentStep, setCurrentStep] = useState(0);
  const [selectedTierId, setSelectedTierId] = useState<string | null>(
    tiers.length === 1 && tiers[0].sold < tiers[0].capacity ? tiers[0].id : null,
  );
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [selectedPickup, setSelectedPickup] = useState<string | null>(
    event.pickup_points.length === 1 ? event.pickup_points[0].name : null,
  );
  // Per-step addon selections: { [stepId]: { [addonId]: quantity } }
  const [addonSelections, setAddonSelections] = useState<Record<string, Record<string, number>>>({});
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

  const selectedTier = tiers.find((t) => t.id === selectedTierId);
  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  // Validate current step
  const canProceed = (): boolean => {
    if (!step) return false;
    switch (step.type) {
      case "tier":
        return !!selectedTierId;
      case "timeslot":
        return !!selectedTimeSlot;
      case "checkout": {
        const cs = step.stepData!;
        if (cs.type === "addon_select") {
          // Check required add-ons
          const sel = addonSelections[cs.id] || {};
          const requiredAddons = (cs.add_ons || []).filter((a) => a.required);
          return requiredAddons.every((a) => (sel[a.id] || 0) > 0);
        }
        if (cs.type === "pickup_select") {
          return !!selectedPickup;
        }
        if (cs.type === "seat_select") {
          const seating = event.seating;
          if (!seating || seating.mode === "none") return true;
          if (!seating.allow_choice) return true; // auto-assigned
          // Need at least a seat or section selected
          return !!selectedSeatId || !!selectedSectionId;
        }
        return true; // info steps always valid
      }
      case "summary":
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (isLastStep) {
      // Compile add-ons from all steps
      const allAddons: SelectedAddon[] = [];
      for (const cs of checkoutSteps) {
        if (cs.type !== "addon_select" || !cs.add_ons) continue;
        const sel = addonSelections[cs.id] || {};
        for (const addon of cs.add_ons) {
          const qty = sel[addon.id] || 0;
          if (qty > 0) {
            allAddons.push({
              addon_id: addon.id,
              name: addon.name,
              quantity: qty,
              price: addon.price,
            });
          }
        }
      }
      onComplete(
        selectedTierId!,
        selectedPickup || undefined,
        selectedTimeSlot || undefined,
        allAddons,
        selectedSeatId || undefined,
        selectedSectionId || undefined,
      );
    } else {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    }
  };

  const handleBack = () => {
    if (currentStep === 0) {
      onClose();
    } else {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // Step title
  const stepTitle = () => {
    switch (step.type) {
      case "tier": return "select your tier";
      case "timeslot": return "pick a time slot";
      case "checkout": return step.stepData!.title.toLowerCase();
      case "summary": return "confirm your order";
      default: return "";
    }
  };

  // CTA label
  const ctaLabel = () => {
    if (loading) return "processing...";
    if (isLastStep) {
      const tierPrice = selectedTier?.price || 0;
      const addonTotal = Object.entries(addonSelections).reduce((total, [stepId, sels]) => {
        const cs = checkoutSteps.find((s) => s.id === stepId);
        if (!cs?.add_ons) return total;
        return total + cs.add_ons.reduce((s, a) => s + (sels[a.id] || 0) * a.price, 0);
      }, 0);
      const total = tierPrice + addonTotal;
      return total === 0 ? "confirm \u2192" : `pay \u20B9${total} \u2192`;
    }
    return "continue \u2192";
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
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-sand/50 font-sans text-sm text-near-black transition-colors hover:bg-sand"
            >
              {currentStep === 0 ? "\u2715" : "\u2190"}
            </button>
            <div>
              <p className="font-serif text-lg text-near-black">{stepTitle()}</p>
              <p className="font-mono text-[10px] text-muted">
                step {currentStep + 1} of {steps.length}
              </p>
            </div>
          </div>
          <span className="text-xl">{event.emoji}</span>
        </div>

        {/* Progress dots */}
        <div className="flex gap-1 px-6 pb-4">
          {steps.map((_, i) => (
            <div
              key={i}
              className="h-1 flex-1 rounded-full transition-all"
              style={{
                background: i <= currentStep
                  ? `linear-gradient(90deg, ${event.accent}, ${event.accent_dark})`
                  : "rgba(232,221,208,0.5)",
              }}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="max-h-[calc(90vh-220px)] overflow-y-auto px-6 pb-6">
          {step.type === "tier" && (
            <TierStep
              tiers={tiers}
              selected={selectedTierId}
              onSelect={setSelectedTierId}
              accent={event.accent_dark}
            />
          )}

          {step.type === "timeslot" && (
            <TimeSlotStep
              slots={timeSlots}
              selected={selectedTimeSlot}
              onSelect={setSelectedTimeSlot}
            />
          )}

          {step.type === "checkout" && step.stepData?.type === "addon_select" && (
            <AddonSelectStep
              step={step.stepData}
              selections={addonSelections[step.stepData.id] || {}}
              onChange={(sel) =>
                setAddonSelections((prev) => ({ ...prev, [step.stepData!.id]: sel }))
              }
              accent={event.accent_dark}
            />
          )}

          {step.type === "checkout" && step.stepData?.type === "info" && (
            <InfoStep step={step.stepData} />
          )}

          {step.type === "checkout" && step.stepData?.type === "pickup_select" && (
            <PickupStep
              pickupPoints={event.pickup_points}
              selected={selectedPickup}
              onSelect={setSelectedPickup}
            />
          )}

          {step.type === "checkout" && step.stepData?.type === "seat_select" && (
            <SeatSelectStep
              event={event}
              selectedSeatId={selectedSeatId}
              selectedSectionId={selectedSectionId}
              onSelectSeat={setSelectedSeatId}
              onSelectSection={setSelectedSectionId}
            />
          )}

          {step.type === "summary" && (
            <SummaryStep
              event={event}
              selectedTier={selectedTier}
              pickupPoint={selectedPickup}
              timeSlotId={selectedTimeSlot}
              addonSelections={addonSelections}
              checkoutSteps={checkoutSteps}
              seatId={selectedSeatId}
              sectionId={selectedSectionId}
            />
          )}
        </div>

        {/* CTA */}
        <div className="border-t border-sand bg-cream px-6 pb-7 pt-4">
          <button
            onClick={handleNext}
            disabled={!canProceed() || loading}
            className="w-full rounded-2xl py-[18px] font-sans text-base font-medium transition-opacity disabled:opacity-40"
            style={{
              background: canProceed() ? "#1A1715" : "#E8DDD0",
              color: canProceed() ? "#fff" : "#9B8E82",
              cursor: !canProceed() || loading ? "default" : "pointer",
            }}
          >
            {ctaLabel()}
          </button>
        </div>
      </div>
    </div>
  );
}
