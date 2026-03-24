"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import type { Event, TicketTier, CheckoutStep, CheckoutAddOn, TimeSlot, SeatingSection, Seat, SeatingConfig, AddonSeatingConfig, Spot } from "@comeoffline/types";
import { useAnalytics, CHECKOUT_STARTED, CHECKOUT_STEP_VIEWED, CHECKOUT_STEP_COMPLETED, TIER_SELECTED, CHECKOUT_COMPLETED, CHECKOUT_ABANDONED } from "@comeoffline/analytics";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";

interface SelectedAddon {
  addon_id: string;
  name: string;
  quantity: number;
  price: number;
  spot_id?: string;
  spot_name?: string;
  spot_seat_id?: string;
  spot_seat_label?: string;
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
    spotSeatId?: string,
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
  addonSeatSelections,
  onAddonSeatChange,
  liveAddonSeating,
}: {
  step: CheckoutStep;
  selections: Record<string, number>;
  onChange: (selections: Record<string, number>) => void;
  accent: string;
  addonSeatSelections: Record<string, { spotId: string | null; spotSeatId: string | null }>;
  onAddonSeatChange: (addonId: string, sel: { spotId: string | null; spotSeatId: string | null } | ((prev: { spotId: string | null; spotSeatId: string | null }) => { spotId: string | null; spotSeatId: string | null })) => void;
  liveAddonSeating: Record<string, AddonSeatingConfig> | null;
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
        const addonSeating = liveAddonSeating?.[addon.id] || addon.seating;
        const hasSeating = addonSeating?.enabled && addonSeating.spots?.length > 0;
        const seatSel = addonSeatSelections[addon.id];

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
                  onClick={() => {
                    onChange({ ...selections, [addon.id]: selected ? 0 : 1 });
                    if (selected) onAddonSeatChange(addon.id, { spotId: null, spotSeatId: null });
                  }}
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
                    onClick={() => {
                      const newQty = Math.max(0, qty - 1);
                      onChange({ ...selections, [addon.id]: newQty });
                      if (newQty === 0) onAddonSeatChange(addon.id, { spotId: null, spotSeatId: null });
                    }}
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

            {/* Inline spot picker for add-ons with seating */}
            {selected && hasSeating && addonSeating.allow_choice && (
              <div className="mt-3 rounded-xl border border-sand/50 bg-sand/5 p-3">
                <span className="mb-2 block font-mono text-[10px] text-muted">
                  pick your spot for {addon.name.toLowerCase()}
                </span>
                <CustomSpotPicker
                  spots={addonSeating.spots}
                  accent={accent}
                  selectedSpotId={seatSel?.spotId || null}
                  selectedSpotSeatId={seatSel?.spotSeatId || null}
                  onSelectSpot={(id) => onAddonSeatChange(addon.id, { spotId: id, spotSeatId: null })}
                  onSelectSpotSeat={(id) => {
                    // Use functional updater — onSelectSpot may have fired in the same tick
                    onAddonSeatChange(addon.id, (prev) => ({ ...prev, spotSeatId: id }));
                  }}
                />
              </div>
            )}
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

/* ── Reusable custom spot picker (used by SeatSelectStep + add-on seating) ── */

function CustomSpotPicker({
  spots: allSpots,
  accent,
  selectedSpotId,
  selectedSpotSeatId,
  onSelectSpot,
  onSelectSpotSeat,
}: {
  spots: Spot[];
  accent: string;
  selectedSpotId: string | null;
  selectedSpotSeatId: string | null;
  onSelectSpot: (id: string | null) => void;
  onSelectSpotSeat: (id: string | null) => void;
}) {
  const [expandedSpotId, setExpandedSpotId] = useState<string | null>(null);

  const tables = allSpots.filter((s) => (s.spot_type || "table") === "table");
  const fixtures = allSpots.filter((s) => s.spot_type === "fixture");
  const zones = allSpots.filter((s) => s.spot_type === "zone");
  const hasCoordinates = allSpots.some((s) => s.x != null && s.y != null);
  const expandedSpot = tables.find((s) => s.id === expandedSpotId);

  // Seat picker drill-in
  if (expandedSpot && expandedSpot.seats && expandedSpot.seats.length > 0) {
    const tableShape = expandedSpot.shape || "circle";
    return (
      <div>
        <button
          onClick={() => setExpandedSpotId(null)}
          className="mb-3 flex items-center gap-1.5 font-mono text-[11px] text-muted transition-colors hover:text-near-black"
        >
          &larr; back to tables
        </button>
        <div className="mb-3 text-center">
          <span className="text-2xl">{expandedSpot.emoji || "\u{1FA91}"}</span>
          <p className="mt-1 font-sans text-base font-medium text-near-black">{expandedSpot.name}</p>
          {expandedSpot.description && (
            <p className="mt-0.5 font-mono text-[11px] text-muted">{expandedSpot.description}</p>
          )}
        </div>
        <div className="relative mx-auto flex h-[220px] w-[220px] items-center justify-center">
          <div
            className={`flex items-center justify-center border-2 bg-sand/20 text-2xl ${tableShape === "rectangle" ? "h-16 w-28 rounded-2xl" : tableShape === "square" ? "h-20 w-20 rounded-2xl" : "h-20 w-20 rounded-full"}`}
            style={{ borderColor: accent + "40" }}
          >
            {expandedSpot.emoji || "\u{1FA91}"}
          </div>
          {expandedSpot.seats.map((seat, si) => {
            const angle = (seat.angle ?? (360 / expandedSpot.seats!.length) * si) * (Math.PI / 180);
            const r = tableShape === "rectangle" ? 85 : 75;
            const sx = Math.sin(angle) * r;
            const sy = -Math.cos(angle) * r;
            const isBooked = seat.status !== "available";
            const isSelected = selectedSpotSeatId === seat.id;
            return (
              <button
                key={seat.id}
                onClick={() => {
                  if (!isBooked) {
                    onSelectSpot(expandedSpot.id);
                    onSelectSpotSeat(isSelected ? null : seat.id);
                    if (!isSelected) {
                      setTimeout(() => setExpandedSpotId(null), 400);
                    }
                  }
                }}
                disabled={isBooked}
                className={`absolute flex h-9 w-9 items-center justify-center rounded-full border-2 font-mono text-[10px] font-medium transition-all ${
                  isSelected
                    ? "scale-110 border-near-black bg-near-black text-white shadow-lg"
                    : isBooked
                      ? "border-sand/40 bg-sand/20 text-muted/40"
                      : "border-sand bg-white text-near-black shadow-sm hover:scale-105 hover:shadow-md"
                }`}
                style={{ transform: `translate(${sx}px, ${sy}px)` }}
              >
                {si + 1}
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex justify-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full border border-sand bg-white" />
            <span className="font-mono text-[9px] text-muted">available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full border-2 border-near-black bg-near-black" />
            <span className="font-mono text-[9px] text-muted">selected</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full border border-sand/40 bg-sand/20" />
            <span className="font-mono text-[9px] text-muted">taken</span>
          </div>
        </div>
        {selectedSpotSeatId && (
          <div className="mt-3 rounded-xl bg-sand/20 px-4 py-2.5 text-center">
            <span className="font-mono text-[11px] text-near-black">
              <strong>{expandedSpot.name}</strong> &mdash; {expandedSpot.seats.find((s) => s.id === selectedSpotSeatId)?.label || "Seat"} selected
            </span>
          </div>
        )}
      </div>
    );
  }

  // Hybrid layout: mini map + scrollable card list
  return (
    <div>
      <span className="mb-2.5 block font-mono text-[10px] uppercase tracking-[2px] text-muted">
        {tables.some((s) => s.seats && s.seats.length > 0) ? "pick a table, then choose your seat" : "tap a spot to select"}
      </span>

      {/* Mini venue map */}
      {hasCoordinates && (
        <div className="relative mb-4 h-[160px] overflow-hidden rounded-2xl border border-sand bg-sand/5">
          {fixtures.map((f) => (
            <div
              key={f.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{ left: `${f.x ?? 50}%`, top: `${f.y ?? 50}%` }}
            >
              <div className="flex items-center gap-0.5 rounded-full bg-sand/20 px-1.5 py-0.5">
                <span className="text-[8px]">{f.emoji}</span>
                <span className="font-mono text-[6px] text-muted/70">{f.name}</span>
              </div>
            </div>
          ))}
          {zones.map((z) => (
            <div
              key={z.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{ left: `${z.x ?? 50}%`, top: `${z.y ?? 50}%` }}
            >
              <span className="font-mono text-[6px] text-muted/50">{z.emoji} {z.name}</span>
            </div>
          ))}
          {tables.map((spot) => {
            const availableSeats = spot.seats ? spot.seats.filter((s) => s.status === "available").length : 0;
            const remaining = spot.seats && spot.seats.length > 0 ? availableSeats : spot.capacity - spot.booked;
            const full = remaining <= 0;
            const selected = selectedSpotId === spot.id;
            return (
              <button
                key={spot.id}
                onClick={() => {
                  if (full) return;
                  const el = document.getElementById(`spot-card-${spot.id}`);
                  el?.scrollIntoView({ behavior: "smooth", block: "center" });
                  if (spot.seats && spot.seats.length > 0) {
                    setExpandedSpotId(spot.id);
                  } else {
                    onSelectSpot(selected ? null : spot.id);
                    onSelectSpotSeat(null);
                  }
                }}
                disabled={full}
                className={`absolute -translate-x-1/2 -translate-y-1/2 transition-all ${full ? "opacity-30" : selected ? "z-10 scale-125" : ""}`}
                style={{ left: `${spot.x ?? 50}%`, top: `${spot.y ?? 50}%` }}
              >
                <div
                  className="flex h-5 w-5 items-center justify-center rounded-full border text-[8px]"
                  style={{
                    borderColor: selected ? "#0E0D0B" : accent + "80",
                    background: selected ? accent + "30" : "white",
                  }}
                >
                  {spot.emoji || "\u{1FA91}"}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Scrollable card list */}
      <div className="flex flex-col gap-2">
        {fixtures.length > 0 && (
          <div className="mb-1 flex flex-wrap gap-1.5">
            {fixtures.map((f) => (
              <div key={f.id} className="flex items-center gap-1 rounded-full bg-sand/15 px-2.5 py-1">
                <span className="text-xs">{f.emoji}</span>
                <span className="font-mono text-[9px] text-muted/60">{f.name}</span>
              </div>
            ))}
          </div>
        )}

        {zones.length > 0 && (
          <div className="mb-1 flex flex-wrap gap-1.5">
            {zones.map((z) => (
              <div key={z.id} className="flex items-center gap-1 rounded-lg bg-sand/10 px-2.5 py-1">
                <span className="text-xs">{z.emoji}</span>
                <span className="font-mono text-[9px] text-muted/50">{z.name}</span>
              </div>
            ))}
          </div>
        )}

        {tables.map((spot) => {
          const availableSeats = spot.seats ? spot.seats.filter((s) => s.status === "available").length : 0;
          const remaining = spot.seats && spot.seats.length > 0 ? availableSeats : spot.capacity - spot.booked;
          const full = remaining <= 0;
          const selected = selectedSpotId === spot.id;
          const selectedSeatLabel = selectedSpotSeatId ? spot.seats?.find((s) => s.id === selectedSpotSeatId)?.label : null;

          return (
            <button
              key={spot.id}
              id={`spot-card-${spot.id}`}
              onClick={() => {
                if (full) return;
                if (spot.seats && spot.seats.length > 0) {
                  setExpandedSpotId(spot.id);
                } else {
                  onSelectSpot(selected ? null : spot.id);
                  onSelectSpotSeat(null);
                }
              }}
              disabled={full}
              className={`flex w-full items-center gap-3 rounded-2xl border-2 p-3.5 text-left transition-all ${
                selected
                  ? "border-near-black bg-near-black/[0.03]"
                  : full
                    ? "border-sand/30 opacity-40"
                    : "border-sand bg-white hover:border-near-black/30"
              }`}
            >
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg"
                style={{ background: accent + "10" }}
              >
                {spot.emoji || "\u{1FA91}"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-sans text-sm font-medium text-near-black">{spot.name}</p>
                {spot.description && (
                  <p className="truncate font-mono text-[10px] text-muted">{spot.description}</p>
                )}
                {spot.seats && spot.seats.length > 0 && (
                  <div className="mt-1 flex items-center gap-0.5">
                    {spot.seats.map((seat) => (
                      <div
                        key={seat.id}
                        className="h-2 w-2 rounded-full"
                        style={{
                          background: seat.status === "available" ? accent : "#E8E0D4",
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
              <div className="shrink-0 text-right">
                {selected && selectedSeatLabel ? (
                  <p className="font-mono text-[10px] font-medium text-near-black">{selectedSeatLabel}</p>
                ) : (
                  <>
                    <p className={`font-mono text-xs font-medium ${full ? "text-terracotta" : "text-near-black"}`}>
                      {full ? "full" : remaining}
                    </p>
                    <p className="font-mono text-[8px] text-muted">
                      {full ? "" : spot.seats && spot.seats.length > 0 ? "seats left" : "left"}
                    </p>
                  </>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Seat / Section selection step ────────────────── */

function SeatSelectStep({
  event,
  selectedSeatId,
  selectedSectionId,
  selectedSpotSeatId,
  onSelectSeat,
  onSelectSection,
  onSelectSpotSeat,
}: {
  event: Event;
  selectedSeatId: string | null;
  selectedSectionId: string | null;
  selectedSpotSeatId: string | null;
  onSelectSeat: (id: string | null) => void;
  onSelectSection: (id: string | null) => void;
  onSelectSpotSeat: (id: string | null) => void;
}) {
  const seating = event.seating;
  if (!seating) return null;

  const mode = seating.mode;
  const accent = event.accent || "#D4A574";

  // Custom spot selection — delegates to extracted CustomSpotPicker
  if (mode === "custom") {
    return (
      <CustomSpotPicker
        spots={seating.spots || []}
        accent={accent}
        selectedSpotId={selectedSeatId}
        selectedSpotSeatId={selectedSpotSeatId}
        onSelectSpot={(id) => {
          onSelectSeat(id);
          if (id) {
            const spot = seating.spots?.find((s) => s.id === id);
            onSelectSection(spot?.section_id || null);
          } else {
            onSelectSection(null);
          }
        }}
        onSelectSpotSeat={onSelectSpotSeat}
      />
    );
  }

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
  addonSeatSelections,
  liveAddonSeating,
  checkoutSteps,
  seatId,
  sectionId,
  spotSeatId,
}: {
  event: Event;
  selectedTier: TicketTier | undefined;
  pickupPoint: string | null;
  timeSlotId: string | null;
  addonSelections: Record<string, Record<string, number>>;
  addonSeatSelections: Record<string, { spotId: string | null; spotSeatId: string | null }>;
  liveAddonSeating: Record<string, AddonSeatingConfig> | null;
  checkoutSteps: CheckoutStep[];
  seatId: string | null;
  sectionId: string | null;
  spotSeatId: string | null;
}) {
  const tierPrice = selectedTier?.price || 0;

  // Compute add-on totals
  const addonItems: { name: string; qty: number; price: number; spotName?: string; seatLabel?: string }[] = [];
  for (const step of checkoutSteps) {
    if (step.type !== "addon_select" || !step.add_ons) continue;
    const sel = addonSelections[step.id] || {};
    for (const addon of step.add_ons) {
      const qty = sel[addon.id] || 0;
      if (qty > 0) {
        const seatSel = addonSeatSelections[addon.id];
        const addonSeating = liveAddonSeating?.[addon.id] || addon.seating;
        const spot = seatSel?.spotId ? addonSeating?.spots?.find((s) => s.id === seatSel.spotId) : null;
        const spotSeatObj = seatSel?.spotSeatId ? spot?.seats?.find((s) => s.id === seatSel.spotSeatId) : null;
        addonItems.push({ name: addon.name, qty, price: addon.price, spotName: spot?.name, seatLabel: spotSeatObj?.label });
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
            {a.spotName && (
              <p className="font-mono text-[10px] text-muted">
                spot: {a.spotName}{a.seatLabel ? `, ${a.seatLabel}` : ""}
              </p>
            )}
          </div>
          <span className="font-sans text-[13px] text-near-black">
            {a.price === 0 ? "Free" : `\u20B9${a.price * a.qty}`}
          </span>
        </div>
      ))}

      {/* Pickup, time, seat */}
      {(pickupPoint || timeSlot || seatId || sectionId) && (
        <div className="mt-2 border-t border-sand/50 pt-3">
          {seatId && event.seating?.mode === "custom" && (
            <p className="font-mono text-[10px] text-muted">
              spot: {event.seating.spots?.find((s) => s.id === seatId)?.name || seatId}
              {spotSeatId && (() => {
                const spot = event.seating?.spots?.find((s) => s.id === seatId);
                const seat = spot?.seats?.find((s) => s.id === spotSeatId);
                return seat ? `, ${seat.label}` : "";
              })()}
            </p>
          )}
          {seatId && event.seating?.mode !== "custom" && (
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
  const { track } = useAnalytics();
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
  const [selectedSpotSeatId, setSelectedSpotSeatId] = useState<string | null>(null);
  // Per-addon seat selections: { [addonId]: { spotId, spotSeatId } }
  const [addonSeatSelections, setAddonSeatSelections] = useState<
    Record<string, { spotId: string | null; spotSeatId: string | null }>
  >({});

  // Live seating polling
  const { getIdToken } = useAuth();
  const [liveSeating, setLiveSeating] = useState<SeatingConfig | null>(null);
  const [liveAddonSeating, setLiveAddonSeating] = useState<Record<string, AddonSeatingConfig> | null>(null);
  const [seatConflictToast, setSeatConflictToast] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const addonPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedTier = tiers.find((t) => t.id === selectedTierId);
  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  // Track checkout started on mount
  useEffect(() => {
    track(CHECKOUT_STARTED, {
      event_id: event.id,
      event_title: event.title,
      tier_count: tiers.length,
      total_steps: steps.length,
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Track step views
  useEffect(() => {
    track(CHECKOUT_STEP_VIEWED, {
      event_id: event.id,
      step_type: step?.type === "checkout" ? step.stepData?.type : step?.type,
      step_index: currentStep,
    });
  }, [currentStep]); // eslint-disable-line react-hooks/exhaustive-deps

  // Determine if current step is a seat_select step
  const isOnSeatStep = step?.type === "checkout" && step.stepData?.type === "seat_select";

  // Poll seating availability when on seat selection step
  useEffect(() => {
    if (!isOnSeatStep) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    const pollSeating = async () => {
      try {
        const token = await getIdToken();
        if (!token) return;
        const res = await apiFetch<{ success: boolean; data: SeatingConfig | null }>(
          `/api/events/${event.id}/seating`,
          { token },
        );
        if (res.data) {
          setLiveSeating(res.data);
        }
      } catch {
        // Silently ignore polling errors
      }
    };

    pollSeating();
    pollingRef.current = setInterval(pollSeating, 5000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [isOnSeatStep, event.id, getIdToken]);

  // Determine if current step has add-ons with seating
  const isOnAddonStepWithSeating = step?.type === "checkout" && step.stepData?.type === "addon_select" &&
    (step.stepData.add_ons || []).some((a) => a.seating?.enabled);

  // Poll add-on seating when on an addon_select step with seating
  useEffect(() => {
    if (!isOnAddonStepWithSeating) {
      if (addonPollingRef.current) {
        clearInterval(addonPollingRef.current);
        addonPollingRef.current = null;
      }
      return;
    }

    const pollAddonSeating = async () => {
      try {
        const token = await getIdToken();
        if (!token) return;
        const res = await apiFetch<{ success: boolean; data: Record<string, AddonSeatingConfig> }>(
          `/api/events/${event.id}/addon-seating`,
          { token },
        );
        if (res.data) {
          setLiveAddonSeating(res.data);
        }
      } catch {
        // Silently ignore polling errors
      }
    };

    pollAddonSeating();
    addonPollingRef.current = setInterval(pollAddonSeating, 5000);

    return () => {
      if (addonPollingRef.current) {
        clearInterval(addonPollingRef.current);
        addonPollingRef.current = null;
      }
    };
  }, [isOnAddonStepWithSeating, event.id, getIdToken]);

  // Merge live seating into event for the seat picker
  const eventWithLiveSeating = useMemo(() => {
    if (!liveSeating) return event;
    return { ...event, seating: liveSeating };
  }, [event, liveSeating]);

  // Detect if the user's selected seat was taken by someone else
  useEffect(() => {
    if (!liveSeating || !isOnSeatStep) return;

    if (liveSeating.mode === "custom" && selectedSeatId && liveSeating.spots) {
      const spot = liveSeating.spots.find((s) => s.id === selectedSeatId);
      if (spot?.seats && selectedSpotSeatId) {
        const seat = spot.seats.find((s) => s.id === selectedSpotSeatId);
        if (seat && seat.status !== "available") {
          setSelectedSeatId(null);
          setSelectedSpotSeatId(null);
          setSelectedSectionId(null);
          setSeatConflictToast(`${spot.name} \u2013 ${seat.label} was just taken`);
          setTimeout(() => setSeatConflictToast(null), 4000);
        }
      }
    } else if (selectedSeatId && liveSeating.mode !== "custom" && liveSeating.seats) {
      const seat = liveSeating.seats.find((s) => s.id === selectedSeatId);
      if (seat && seat.status !== "available") {
        setSelectedSeatId(null);
        setSelectedSectionId(null);
        setSeatConflictToast(`Seat ${selectedSeatId} was just taken`);
        setTimeout(() => setSeatConflictToast(null), 4000);
      }
    }
  }, [liveSeating, isOnSeatStep, selectedSeatId, selectedSpotSeatId]);

  // Detect if add-on seat selections were taken
  useEffect(() => {
    if (!liveAddonSeating) return;
    for (const [addonId, sel] of Object.entries(addonSeatSelections)) {
      if (!sel.spotId) continue;
      const addonSeating = liveAddonSeating[addonId];
      if (!addonSeating) continue;
      const spot = addonSeating.spots?.find((s) => s.id === sel.spotId);
      if (spot?.seats && sel.spotSeatId) {
        const seat = spot.seats.find((s) => s.id === sel.spotSeatId);
        if (seat && seat.status !== "available") {
          setAddonSeatSelections((prev) => ({ ...prev, [addonId]: { spotId: null, spotSeatId: null } }));
          setSeatConflictToast(`${spot.name} \u2013 ${seat.label} was just taken`);
          setTimeout(() => setSeatConflictToast(null), 4000);
          break; // one toast at a time
        }
      }
    }
  }, [liveAddonSeating, addonSeatSelections]);

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
          const requiredMet = requiredAddons.every((a) => (sel[a.id] || 0) > 0);
          // Check add-on seating selections
          const seatingMet = (cs.add_ons || []).every((addon) => {
            const qty = sel[addon.id] || 0;
            if (qty === 0 || !addon.seating?.enabled || !addon.seating.allow_choice) return true;
            const seatSel = addonSeatSelections[addon.id];
            if (!seatSel?.spotId) return false;
            const addonSeating = liveAddonSeating?.[addon.id] || addon.seating;
            const spot = addonSeating.spots?.find((s) => s.id === seatSel.spotId);
            if (spot?.seats && spot.seats.length > 0) return !!seatSel.spotSeatId;
            return true;
          });
          return requiredMet && seatingMet;
        }
        if (cs.type === "pickup_select") {
          return !!selectedPickup;
        }
        if (cs.type === "seat_select") {
          const seating = eventWithLiveSeating.seating;
          if (!seating || seating.mode === "none") return true;
          if (!seating.allow_choice) return true; // auto-assigned
          if (seating.mode === "custom" && selectedSeatId) {
            // If selected spot has individual seats, require a seat pick
            const spot = seating.spots?.find((s) => s.id === selectedSeatId);
            if (spot?.seats && spot.seats.length > 0) {
              return !!selectedSpotSeatId;
            }
            return true;
          }
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
    // Track step completion
    track(CHECKOUT_STEP_COMPLETED, {
      event_id: event.id,
      step_type: step?.type === "checkout" ? step.stepData?.type : step?.type,
      step_index: currentStep,
    });

    // Track tier selection specifically
    if (step?.type === "tier" && selectedTierId) {
      track(TIER_SELECTED, {
        event_id: event.id,
        tier_id: selectedTierId,
        tier_label: selectedTier?.label,
        tier_price: selectedTier?.price,
        revenue: selectedTier?.price,
        currency: "INR",
      });
    }

    if (isLastStep) {
      track(CHECKOUT_COMPLETED, {
        event_id: event.id,
        tier_id: selectedTierId,
        tier_price: selectedTier?.price,
        total_steps: steps.length,
        revenue: selectedTier?.price,
        currency: "INR",
      });

      // Compile add-ons from all steps (with seat selections if applicable)
      const allAddons: SelectedAddon[] = [];
      for (const cs of checkoutSteps) {
        if (cs.type !== "addon_select" || !cs.add_ons) continue;
        const sel = addonSelections[cs.id] || {};
        for (const addon of cs.add_ons) {
          const qty = sel[addon.id] || 0;
          if (qty > 0) {
            const seatSel = addonSeatSelections[addon.id];
            const addonSeating = liveAddonSeating?.[addon.id] || addon.seating;
            const spot = seatSel?.spotId ? addonSeating?.spots?.find((s) => s.id === seatSel.spotId) : null;
            const spotSeat = seatSel?.spotSeatId ? spot?.seats?.find((s) => s.id === seatSel.spotSeatId) : null;
            allAddons.push({
              addon_id: addon.id,
              name: addon.name,
              quantity: qty,
              price: addon.price,
              spot_id: seatSel?.spotId || undefined,
              spot_name: spot?.name || undefined,
              spot_seat_id: seatSel?.spotSeatId || undefined,
              spot_seat_label: spotSeat?.label || undefined,
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
        selectedSpotSeatId || undefined,
      );
    } else {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    }
  };

  const handleBack = () => {
    if (currentStep === 0) {
      track(CHECKOUT_ABANDONED, {
        event_id: event.id,
        last_step_type: step?.type === "checkout" ? step.stepData?.type : step?.type,
        last_step_index: currentStep,
        selected_tier_id: selectedTierId,
      });
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
        onClick={() => {
          track(CHECKOUT_ABANDONED, { event_id: event.id, step: currentStep, method: "backdrop" });
          onClose();
        }}
        className="absolute inset-0 bg-[rgba(10,9,7,0.5)] backdrop-blur-sm"
      />

      {/* Sheet */}
      <div
        className="relative max-h-[90dvh] w-full max-w-[430px] overflow-hidden rounded-t-3xl bg-cream"
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
        <div className="max-h-[calc(90dvh-220px)] overflow-y-auto px-6 pb-6">
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
              addonSeatSelections={addonSeatSelections}
              onAddonSeatChange={(addonId, sel) =>
                setAddonSeatSelections((prev) => {
                  const defaultSel = { spotId: null, spotSeatId: null };
                  const resolved = typeof sel === "function" ? sel(prev[addonId] || defaultSel) : sel;
                  return { ...prev, [addonId]: resolved };
                })
              }
              liveAddonSeating={liveAddonSeating}
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
              event={eventWithLiveSeating}
              selectedSeatId={selectedSeatId}
              selectedSectionId={selectedSectionId}
              selectedSpotSeatId={selectedSpotSeatId}
              onSelectSeat={setSelectedSeatId}
              onSelectSection={setSelectedSectionId}
              onSelectSpotSeat={setSelectedSpotSeatId}
            />
          )}

          {step.type === "summary" && (
            <SummaryStep
              event={event}
              selectedTier={selectedTier}
              pickupPoint={selectedPickup}
              timeSlotId={selectedTimeSlot}
              addonSelections={addonSelections}
              addonSeatSelections={addonSeatSelections}
              liveAddonSeating={liveAddonSeating}
              checkoutSteps={checkoutSteps}
              seatId={selectedSeatId}
              sectionId={selectedSectionId}
              spotSeatId={selectedSpotSeatId}
            />
          )}
        </div>

        {/* Seat conflict toast */}
        {seatConflictToast && (
          <div className="pointer-events-none absolute bottom-28 left-1/2 z-50 -translate-x-1/2">
            <div className="rounded-xl bg-near-black px-5 py-3 shadow-lg" style={{ animation: "chatSlideIn 0.3s ease both" }}>
              <p className="whitespace-nowrap font-mono text-[11px] text-cream">
                {seatConflictToast}
              </p>
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="border-t border-sand bg-cream px-6 pt-4" style={{ paddingBottom: "calc(1.25rem + 56px + env(safe-area-inset-bottom, 0px))" }}>
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
