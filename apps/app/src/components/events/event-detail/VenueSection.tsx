import { SectionLabel } from "./SectionLabel";

interface VenueSectionProps {
  venueName?: string;
  venueArea?: string;
  venueAddress?: string;
  venueRevealDate?: string;
  accent: string;
  accentDark: string;
}

export function VenueSection({
  venueName,
  venueArea,
  venueAddress,
  venueRevealDate,
  accent,
  accentDark,
}: VenueSectionProps) {
  // Skip if no venue info at all
  if (!venueName && !venueRevealDate) return null;

  const isRevealed =
    !!venueName &&
    venueName !== "TBD" &&
    !!venueRevealDate &&
    new Date(venueRevealDate) <= new Date();

  return (
    <div className="mb-7">
      <SectionLabel label="venue" />

      {isRevealed ? (
        <div className="relative overflow-hidden rounded-2xl border border-sand/40 bg-white p-5 shadow-[0_1px_4px_rgba(26,23,21,0.03)]">
          {/* Revealed badge */}
          <div className="absolute right-3 top-2">
            <span className="rounded-full bg-[#A8B5A0]/15 px-2 py-0.5 font-mono text-[9px] text-[#A8B5A0]">
              revealed
            </span>
          </div>
          {/* Sticker */}
          <div
            className="absolute bottom-2.5 right-3.5 font-hand text-xs opacity-70"
            style={{ color: accent, transform: "rotate(4deg)" }}
          >
            screenshot this 📸
          </div>
          <div className="flex items-start gap-3.5">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl"
              style={{ background: accent + "15" }}
            >
              📍
            </div>
            <div>
              <p className="font-serif text-lg text-near-black">{venueName}</p>
              {venueArea && (
                <p className="mt-0.5 font-sans text-[13px] text-warm-brown">{venueArea}</p>
              )}
              {venueAddress && (
                <p className="mt-0.5 font-mono text-[11px] text-muted">{venueAddress}</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-2xl bg-near-black p-6 text-center">
          {/* Radial glow */}
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(circle at 50% 50%, ${accent}10, transparent 70%)`,
            }}
          />
          {/* Sticker */}
          <div
            className="absolute right-4 top-3 font-hand text-xs opacity-60"
            style={{ color: "#D4A574", transform: "rotate(3deg)" }}
          >
            patience is a virtue
          </div>
          <span className="relative mb-2.5 block text-[28px]">🔐</span>
          <p className="relative mb-1 font-serif text-lg text-cream">venue sealed</p>
          <p className="relative font-mono text-[11px] text-muted">
            {venueRevealDate
              ? `drops ${new Date(venueRevealDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
              : "dropping soon"}
          </p>
        </div>
      )}
    </div>
  );
}
