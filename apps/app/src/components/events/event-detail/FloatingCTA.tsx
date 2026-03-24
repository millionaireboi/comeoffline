import type { TicketTier } from "@comeoffline/types";

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
}: FloatingCTAProps) {
  const soldOut = spotsLeft === 0;

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
    </div>
  );
}
