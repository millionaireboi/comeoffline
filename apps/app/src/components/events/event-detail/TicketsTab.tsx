import { useEffect, useRef, useState } from "react";
import type { GroupDiscountSlab, TicketTier } from "@comeoffline/types";
import { tierAvailable, tierSoldOut, tierRemaining, type PublicishTier } from "@/lib/tiers";
import { GhostWatermark } from "./GhostWatermark";

interface TicketsTabProps {
  tiers: TicketTier[];
  selectedTierId: string | null;
  onSelectTier: (id: string) => void;
  maxPerUser?: number;
  /** unused — refund policy is rendered once in the overview block */
  refundPolicy?: string;
  groupDiscounts?: GroupDiscountSlab[];
  accent: string;
  accentDark: string;
}

function slabRange(s: GroupDiscountSlab): string {
  if (s.max_qty == null) return `${s.min_qty}+`;
  return s.max_qty === s.min_qty ? `${s.min_qty}` : `${s.min_qty}–${s.max_qty}`;
}

/* Animated slab price — eases the per-ticket price down through the slab
   ladder ("1 ticket ₹1,999 → 2–3 tickets ₹1,899 → …") on a slow loop.
   Display-only; per-ticket math mirrors the server's rounding and checkout
   does the real math. Static for reduced-motion users. */
function SlabPriceTicker({
  price,
  slabs,
  color,
  accentDark,
}: {
  price: number;
  slabs: GroupDiscountSlab[];
  color: string;
  accentDark: string;
}) {
  const steps = [
    { label: "1 ticket", price },
    ...slabs.map((s) => {
      const total = price * s.min_qty;
      const perTicket = Math.round(
        (total - Math.round((total * s.percent) / 100)) / s.min_qty,
      );
      return { label: `${slabRange(s)} tickets · ${s.percent}% off`, price: perTicket };
    }),
  ];
  const [idx, setIdx] = useState(0);
  const [shown, setShown] = useState(price);
  const shownRef = useRef(price);

  useEffect(() => {
    if (steps.length < 2) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % steps.length), 2400);
    return () => clearInterval(t);
  }, [steps.length]);

  const target = steps[idx % steps.length].price;
  useEffect(() => {
    const from = shownRef.current;
    if (from === target) return;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 550);
      const eased = 1 - Math.pow(1 - p, 3);
      const next = Math.round(from + (target - from) * eased);
      shownRef.current = next;
      setShown(next);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  const step = steps[idx % steps.length];
  return (
    <div>
      <div>
        <span className="font-mono text-2xl font-medium" style={{ color }}>
          ₹{shown.toLocaleString("en-IN")}
        </span>
        <span className="ml-1 font-sans text-xs text-muted">/ person</span>
      </div>
      <p
        className="mt-0.5 font-mono text-[10px]"
        style={{ color: idx === 0 ? "#9B8E82" : accentDark, transition: "color 0.3s ease" }}
      >
        {step.label}
      </p>
    </div>
  );
}

function TierCard({
  tier,
  selected,
  onSelect,
  accent,
  accentDark,
  slabs,
}: {
  tier: TicketTier;
  selected: boolean;
  onSelect: () => void;
  accent: string;
  accentDark: string;
  slabs?: GroupDiscountSlab[];
}) {
  const soldOut = tierSoldOut(tier);
  // null when the public payload strips raw counts — stock UI hides itself
  const remaining = tierRemaining(tier);
  const closed = tier.deadline ? new Date(tier.deadline) < new Date() : false;
  const notYetOpen = tier.opens_at ? new Date(tier.opens_at) > new Date() : false;
  const unavailable = soldOut || closed || notYetOpen;
  const fillPct = remaining !== null && tier.capacity > 0 ? ((tier.capacity - remaining) / tier.capacity) * 100 : null;

  return (
    <button
      onClick={() => !unavailable && onSelect()}
      disabled={!!unavailable}
      className="relative w-full overflow-hidden rounded-[18px] border-[1.5px] p-5 text-left transition-all duration-300"
      style={{
        background: selected
          ? `linear-gradient(135deg, ${accent}15, #fff)`
          : unavailable
            ? "rgba(232,221,208,0.2)"
            : "#fff",
        borderColor: selected
          ? accentDark
          : unavailable
            ? "rgba(232,221,208,0.4)"
            : "rgba(232,221,208,0.6)",
        borderWidth: selected ? "2px" : "1.5px",
        opacity: unavailable ? 0.6 : 1,
        transform: selected ? "scale(1.01)" : "scale(1)",
        boxShadow: selected
          ? `0 4px 16px ${accent}20`
          : "0 1px 3px rgba(26,23,21,0.03)",
        cursor: unavailable ? "default" : "pointer",
      }}
    >
      {/* Sold out badge */}
      {soldOut && (
        <div className="absolute right-3.5 top-3">
          <span className="rounded-full bg-sand/50 px-2 py-0.5 font-mono text-[9px] text-muted">
            sold out
          </span>
        </div>
      )}
      {/* Selected checkmark */}
      {selected && !unavailable && (
        <div className="absolute right-3.5 top-3">
          <div
            className="flex h-[22px] w-[22px] items-center justify-center rounded-full"
            style={{ background: accentDark }}
          >
            <span className="text-[11px] text-white">✓</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-2 pr-9">
        <p
          className="font-sans text-base font-medium"
          style={{ color: unavailable ? "#9B8E82" : "#1A1715" }}
        >
          {tier.label}
        </p>
        {tier.description && (
          <p className="mt-0.5 font-sans text-xs italic text-muted">{tier.description}</p>
        )}
      </div>

      {/* Price + availability */}
      <div className="mt-3 flex items-end justify-between">
        {!unavailable &&
        tier.price > 0 &&
        (!tier.per_person || tier.per_person <= 1) &&
        slabs &&
        slabs.length > 0 ? (
          <SlabPriceTicker
            price={tier.price}
            slabs={slabs}
            color={accentDark}
            accentDark={accentDark}
          />
        ) : (
          <div>
            <span
              className="font-mono text-2xl font-medium"
              style={{ color: unavailable ? "#9B8E82" : accentDark }}
            >
              {tier.price === 0 ? "Free" : `₹${tier.price}`}
            </span>
            {tier.price > 0 && (
              <span className="ml-1 font-sans text-xs text-muted">/ person</span>
            )}
          </div>
        )}
        <div className="text-right">
          {!unavailable && remaining !== null && remaining <= 15 && (
            <p
              className="mb-0.5 font-mono text-[11px]"
              style={{ color: remaining <= 5 ? "#C44A26" : accentDark }}
            >
              only {remaining} left
            </p>
          )}
          {!unavailable && remaining === null && (tier as PublicishTier).low_stock && (
            <p className="mb-0.5 font-mono text-[11px]" style={{ color: accentDark }}>
              selling fast
            </p>
          )}
          {closed && !soldOut && (
            <p className="font-mono text-[10px] font-medium text-muted">tier closed</p>
          )}
          {notYetOpen && (
            <p className="font-mono text-[10px] font-medium text-muted">opens soon</p>
          )}
          {tier.deadline && (
            <p className="font-mono text-[10px] text-muted/80">
              ends{" "}
              {new Date(tier.deadline).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </p>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {!unavailable && fillPct !== null && (
        <div className="mt-2.5 h-[3px] overflow-hidden rounded-sm bg-sand/40">
          <div
            className="h-full rounded-sm transition-all duration-700"
            style={{ width: `${fillPct}%`, background: accentDark }}
          />
        </div>
      )}

      {/* Per-person badge */}
      {tier.per_person && tier.per_person > 1 && !unavailable && (
        <p className="mt-2 font-mono text-[10px] text-muted">
          group of {tier.per_person}
        </p>
      )}
    </button>
  );
}

export function TicketsTab({
  tiers,
  selectedTierId,
  onSelectTier,
  maxPerUser,
  groupDiscounts,
  accent,
  accentDark,
}: TicketsTabProps) {
  // Slabs only apply to solo-tier multi-quantity orders — per_person tiers
  // already price the whole pass. Pitch the discount before quantity is picked,
  // but never advertise a slab the max_per_user cap makes unreachable.
  const now = new Date();
  const hasSoloTier = tiers.some(
    (t) =>
      (!t.per_person || t.per_person <= 1) &&
      t.price > 0 &&
      tierAvailable(t) &&
      (!t.deadline || new Date(t.deadline) >= now) &&
      (!t.opens_at || new Date(t.opens_at) <= now),
  );
  const maxQty = maxPerUser || 1;
  const slabs = hasSoloTier
    ? (groupDiscounts || [])
        .filter((s) => s.min_qty <= maxQty)
        .sort((a, b) => a.min_qty - b.min_qty)
    : [];

  return (
    <div className="relative">
      <GhostWatermark text="₹" className="-top-5 -right-2 text-[140px]" />

      {/* Section header */}
      <p
        className="mb-3 inline-block font-hand text-sm"
        style={{ color: accentDark, transform: "rotate(-0.5deg)" }}
      >
        early bird gets the best deal. obviously.
      </p>

      {/* Tier cards */}
      <div className="flex flex-col gap-3">
        {tiers.map((tier) => (
          <TierCard
            key={tier.id}
            tier={tier}
            selected={selectedTierId === tier.id}
            onSelect={() => onSelectTier(tier.id)}
            accent={accent}
            accentDark={accentDark}
            slabs={slabs}
          />
        ))}
      </div>

      {/* Group-discount pitch — sell the "bring friends" math up-front */}
      {slabs.length > 0 && (
        <div
          className="mt-3 flex items-center gap-2.5 rounded-[14px] px-3.5 py-2.5"
          style={{
            background: accent + "0C",
            border: `1px dashed ${accent}55`,
          }}
        >
          <span className="shrink-0 text-[15px]">👯</span>
          <p className="font-sans text-xs leading-relaxed text-warm-brown">
            <span className="font-medium text-near-black">cheaper with friends — </span>
            {slabs.map((s, i) => (
              <span key={s.min_qty}>
                {i > 0 && <span className="opacity-50"> · </span>}
                {slabRange(s)} tickets{" "}
                <span className="font-medium" style={{ color: accentDark }}>
                  {s.percent}% off
                </span>
              </span>
            ))}
          </p>
        </div>
      )}
    </div>
  );
}
