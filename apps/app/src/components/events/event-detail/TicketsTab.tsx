import type { TicketTier } from "@comeoffline/types";
import { GhostWatermark } from "./GhostWatermark";

interface TicketsTabProps {
  tiers: TicketTier[];
  selectedTierId: string | null;
  onSelectTier: (id: string) => void;
  maxPerUser?: number;
  refundPolicy?: string;
  accent: string;
  accentDark: string;
}

function TierCard({
  tier,
  selected,
  onSelect,
  accent,
  accentDark,
}: {
  tier: TicketTier;
  selected: boolean;
  onSelect: () => void;
  accent: string;
  accentDark: string;
}) {
  const soldOut = tier.sold >= tier.capacity;
  const remaining = tier.capacity - tier.sold;
  const closed = tier.deadline ? new Date(tier.deadline) < new Date() : false;
  const notYetOpen = tier.opens_at ? new Date(tier.opens_at) > new Date() : false;
  const unavailable = soldOut || closed || notYetOpen;
  const fillPct = ((tier.capacity - remaining) / tier.capacity) * 100;

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
        <div className="text-right">
          {!unavailable && (
            <p className="mb-0.5 font-mono text-[11px] text-muted">
              {remaining} left of {tier.capacity}
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
      {!unavailable && (
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
  refundPolicy,
  accent,
  accentDark,
}: TicketsTabProps) {
  return (
    <div className="relative">
      <GhostWatermark text="₹" className="-top-5 -right-2 text-[140px]" />

      {/* Intro */}
      <p
        className="mb-5 inline-block font-hand text-sm"
        style={{ color: "#D4A574", transform: "rotate(-0.5deg)" }}
      >
        early bird gets the best deal. obviously.
      </p>

      {/* Tier cards */}
      <div className="mb-6 flex flex-col gap-3">
        {tiers.map((tier) => (
          <TierCard
            key={tier.id}
            tier={tier}
            selected={selectedTierId === tier.id}
            onSelect={() => onSelectTier(tier.id)}
            accent={accent}
            accentDark={accentDark}
          />
        ))}
      </div>

      {/* Refund policy */}
      {refundPolicy && (
        <div className="rounded-xl bg-sand/25 px-4 py-3.5 text-center">
          <p className="font-mono text-[10px] text-muted">{refundPolicy}</p>
        </div>
      )}
    </div>
  );
}
