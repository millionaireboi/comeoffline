import { useState } from "react";
import type { TicketTier, WaitlistEntry } from "@comeoffline/types";

interface FloatingCTAProps {
  /** User already holds an active ticket — CTA becomes "view your ticket" */
  alreadyBooked?: boolean;
  spotsLeft: number;
  isTicketed: boolean;
  hasCheckoutWizard: boolean;
  selectedTier: TicketTier | undefined;
  cheapestPrice: number | null;
  onCTA: () => void;
  onScrollToTickets: () => void;
  canPurchase: boolean;
  loading?: boolean;
  accent: string;
  accentDark: string;
  isAnnounced?: boolean;
  waitlistCount?: number;
  activeWaitlistEntry?: WaitlistEntry | null;
  onJoinWaitlist?: (spotsWanted: number) => void;
  onLeaveWaitlist?: (entryId: string) => void;
}

export function FloatingCTA({
  alreadyBooked,
  spotsLeft,
  isTicketed,
  hasCheckoutWizard,
  selectedTier,
  cheapestPrice,
  onCTA,
  onScrollToTickets,
  canPurchase,
  loading,
  accent,
  accentDark,
  isAnnounced,
  waitlistCount,
  activeWaitlistEntry,
  onJoinWaitlist,
  onLeaveWaitlist,
}: FloatingCTAProps) {
  const soldOut = spotsLeft === 0;
  const [spotsWanted, setSpotsWanted] = useState(1);

  // Bottom nav is hidden while the event detail is open, so the CTA only needs
  // to clear the iOS home indicator — no 56px reserved for the nav.
  const safeAreaPadding = "calc(0.75rem + env(safe-area-inset-bottom, 0px))";

  // Announced event — waitlist mode
  if (isAnnounced) {
    return (
      <div className="relative z-[5] shrink-0 px-5 pt-3" style={{ paddingBottom: safeAreaPadding }}>
        <div className="pointer-events-none absolute -top-6 left-0 right-0 h-6 bg-gradient-to-t from-cream to-transparent" />

        {activeWaitlistEntry ? (
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

  // Already booked — a single "view your ticket" action, never re-entering checkout.
  if (alreadyBooked) {
    return (
      <div className="relative z-[5] shrink-0 px-5 pt-3" style={{ paddingBottom: safeAreaPadding }}>
        <div className="pointer-events-none absolute -top-6 left-0 right-0 h-6 bg-gradient-to-t from-cream to-transparent" />
        <button
          onClick={onCTA}
          className="w-full rounded-[100px] py-[16px] text-center font-sans text-[15px] font-semibold text-near-black transition-transform active:scale-[0.98]"
          style={{
            background: `linear-gradient(135deg, ${accentDark}, ${accent})`,
            boxShadow: "0 6px 24px rgba(26,23,21,0.18), 0 0 0 1px rgba(155,142,130,0.08)",
          }}
        >
          you&apos;re in {"✓"} — view your ticket
        </button>
      </div>
    );
  }

  // Single sticky CTA — always shows price + action when a tier is selected.
  // Tap goes straight to checkout (one-step), no "select a tier → enable button → buy".
  const handleTap = () => {
    if (soldOut || loading) return;
    if (!isTicketed) {
      onCTA();
      return;
    }
    if (!selectedTier) {
      // Edge case: no tier auto-selected (e.g. all sold out). Bounce the user
      // to the tier list so they can see the situation.
      onScrollToTickets();
      return;
    }
    if (!canPurchase) {
      // Time slots / pickup required — bounce to the tier list so they pick.
      onScrollToTickets();
      return;
    }
    onCTA();
  };

  // Single CTA copy — clean and generic. No price, no tier name.
  let label = "Buy Tickets";
  if (soldOut) {
    label = "Sold Out";
  } else if (loading) {
    label = "Buying...";
  } else if (!isTicketed) {
    label = "I'm In";
  }

  return (
    <div
      className="relative z-[5] shrink-0 px-5 pt-3"
      style={{ paddingBottom: safeAreaPadding }}
    >
      <div className="pointer-events-none absolute -top-6 left-0 right-0 h-6 bg-gradient-to-t from-cream to-transparent" />

      <button
        onClick={handleTap}
        disabled={soldOut || loading}
        className="w-full rounded-[100px] py-[16px] text-center font-sans text-[15px] font-semibold transition-transform active:scale-[0.98]"
        style={{
          background: soldOut ? "#E8DDD0" : "#1A1715",
          color: soldOut ? "#9B8E82" : "#fff",
          cursor: soldOut || loading ? "default" : "pointer",
          boxShadow: soldOut
            ? "none"
            : "0 6px 24px rgba(26,23,21,0.28), 0 0 0 1px rgba(155,142,130,0.08)",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {label}
      </button>
    </div>
  );
}
