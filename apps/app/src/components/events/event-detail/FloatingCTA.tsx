import { useState } from "react";
import type { TicketTier, WaitlistEntry } from "@comeoffline/types";

interface FloatingCTAProps {
  spotsLeft: number;
  isTicketed: boolean;
  hasCheckoutWizard: boolean;
  selectedTier: TicketTier | undefined;
  activeSection: string;
  cheapestPrice: number | null;
  onCTA: () => void;
  onSwitchToTickets: () => void;
  canPurchase: boolean;
  loading?: boolean;
  accent: string;
  accentDark: string;
  quizPending?: boolean;
  isAnnounced?: boolean;
  waitlistCount?: number;
  activeWaitlistEntry?: WaitlistEntry | null;
  onJoinWaitlist?: (spotsWanted: number) => void;
  onLeaveWaitlist?: (entryId: string) => void;
}

export function FloatingCTA({
  spotsLeft,
  isTicketed,
  hasCheckoutWizard,
  selectedTier,
  activeSection,
  cheapestPrice,
  onCTA,
  onSwitchToTickets,
  canPurchase,
  loading,
  accent,
  accentDark,
  quizPending,
  isAnnounced,
  waitlistCount,
  activeWaitlistEntry,
  onJoinWaitlist,
  onLeaveWaitlist,
}: FloatingCTAProps) {
  const soldOut = spotsLeft === 0;
  const [spotsWanted, setSpotsWanted] = useState(1);

  // Announced event — waitlist mode
  if (isAnnounced) {
    return (
      <div className="relative z-[5] shrink-0 px-5 pt-3" style={{ paddingBottom: "calc(1rem + 56px + env(safe-area-inset-bottom, 0px))" }}>
        <div className="pointer-events-none absolute -top-6 left-0 right-0 h-6 bg-gradient-to-t from-cream to-transparent" />

        {activeWaitlistEntry ? (
          // Already on waitlist
          <div className="rounded-[20px] bg-near-black p-[14px_20px] shadow-[0_4px_24px_rgba(26,23,21,0.25),0_0_0_1px_rgba(155,142,130,0.1)]">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="font-sans text-xs text-cream/90">you&apos;re on the list</span>
              <span className="font-mono text-[11px]" style={{ color: accent }}>
                {activeWaitlistEntry.spots_wanted} spot{activeWaitlistEntry.spots_wanted > 1 ? "s" : ""}
              </span>
            </div>
            <p className="mb-3 font-mono text-[10px] text-cream/40">
              we&apos;ll notify you when tickets drop
            </p>
            <button
              onClick={() => onLeaveWaitlist?.(activeWaitlistEntry.id)}
              disabled={loading}
              className="w-full rounded-[14px] border border-white/10 py-3 font-sans text-sm text-cream/60 transition-all active:border-white/20 active:text-cream/80"
              style={{ opacity: loading ? 0.6 : 1 }}
            >
              {loading ? "leaving..." : "leave waitlist"}
            </button>
          </div>
        ) : (
          // Join waitlist
          <div className="rounded-[20px] bg-near-black p-[14px_20px] shadow-[0_4px_24px_rgba(26,23,21,0.25),0_0_0_1px_rgba(155,142,130,0.1)]">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="font-sans text-xs text-cream/90">how many spots?</span>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    onClick={() => setSpotsWanted(n)}
                    className="flex h-7 w-7 items-center justify-center rounded-full font-mono text-xs transition-all"
                    style={{
                      background: spotsWanted === n ? accent : "rgba(255,255,255,0.08)",
                      color: spotsWanted === n ? "#1A1715" : "rgba(255,255,255,0.6)",
                      fontWeight: spotsWanted === n ? 600 : 400,
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => onJoinWaitlist?.(spotsWanted)}
              disabled={loading}
              className="w-full rounded-[14px] border-[1.5px] py-3.5 font-sans text-sm font-semibold tracking-wide text-near-black transition-transform active:scale-[0.97]"
              style={{
                background: `linear-gradient(135deg, ${accentDark}, ${accent})`,
                borderColor: accent + "40",
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? "joining..." : "i'm interested →"}
            </button>
            {(waitlistCount || 0) > 0 && (
              <p className="mt-2 text-center font-mono text-[10px] text-cream/40">
                {waitlistCount} {waitlistCount === 1 ? "person" : "people"} interested
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative z-[5] shrink-0 px-5 pt-3" style={{ paddingBottom: "calc(1rem + 56px + env(safe-area-inset-bottom, 0px))" }}>
      {/* Gradient fade */}
      <div className="pointer-events-none absolute -top-6 left-0 right-0 h-6 bg-gradient-to-t from-cream to-transparent" />

      {/* Expanded dark card — tier selected and on tickets tab */}
      {isTicketed && selectedTier && activeSection === "tickets" && !soldOut ? (
        <div className="rounded-[20px] bg-near-black p-[14px_20px] shadow-[0_4px_24px_rgba(26,23,21,0.25),0_0_0_1px_rgba(155,142,130,0.1)]">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="font-sans text-xs text-cream/90">{selectedTier.label}</span>
            <span className="font-mono text-[15px] font-semibold" style={{ color: accent }}>
              {selectedTier.price === 0 ? "Free" : `₹${selectedTier.price}`}
            </span>
          </div>
          <button
            onClick={onCTA}
            disabled={loading}
            className="w-full rounded-[14px] border-[1.5px] py-3.5 font-sans text-sm font-semibold tracking-wide text-near-black transition-transform active:scale-[0.97]"
            style={{
              background: `linear-gradient(135deg, ${accentDark}, ${accent})`,
              borderColor: accent + "40",
              opacity: loading ? 0.6 : 1,
              cursor: loading ? "default" : "pointer",
            }}
          >
            {loading ? "getting your ticket..." : "save me a spot →"}
          </button>
          {quizPending && (
            <p className="mt-2 text-center font-mono text-[10px] text-cream/40">
              ✦ you'll need to take the sign quiz before the event
            </p>
          )}
        </div>
      ) : (
        /* Simple button */
        <button
          onClick={() => {
            if (soldOut) return;
            if (isTicketed && activeSection !== "tickets") {
              onSwitchToTickets();
            } else {
              onCTA();
            }
          }}
          disabled={soldOut || loading || (isTicketed && !hasCheckoutWizard && !canPurchase && activeSection === "tickets")}
          className="w-full rounded-[18px] py-4 font-sans text-sm font-medium transition-transform active:scale-[0.97]"
          style={{
            background: soldOut ? "#E8DDD0" : "#1A1715",
            color: soldOut ? "#9B8E82" : "#fff",
            cursor: soldOut || loading ? "default" : "pointer",
            boxShadow: soldOut
              ? "none"
              : "0 4px 24px rgba(26,23,21,0.3), 0 0 0 1px rgba(155,142,130,0.1)",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {soldOut
            ? "sold out. told you to hurry."
            : loading
              ? isTicketed
                ? "getting your ticket..."
                : "reserving spot..."
              : isTicketed
                ? activeSection === "tickets"
                  ? !canPurchase
                    ? "select a tier"
                    : hasCheckoutWizard
                      ? "get tickets →"
                      : `pay ₹${selectedTier?.price ?? cheapestPrice ?? 0} →`
                  : cheapestPrice != null && cheapestPrice < Infinity
                    ? `i'm literally coming · ₹${cheapestPrice}+ →`
                    : "get tickets →"
                : "i'm in →"}
        </button>
      )}
      {quizPending && !soldOut && !(isTicketed && selectedTier && activeSection === "tickets") && (
        <p className="mt-2 text-center font-mono text-[10px] text-muted/50">
          ✦ you'll need to take the sign quiz before the event
        </p>
      )}
    </div>
  );
}
