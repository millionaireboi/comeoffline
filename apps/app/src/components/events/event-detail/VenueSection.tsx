import { SectionLabel } from "./SectionLabel";

interface VenueSectionProps {
  venueName?: string;
  venueArea?: string;
  venueAddress?: string;
  venueDirectionsUrl?: string;
  venueRevealDate?: string;
  venuePhotos?: string[];
  accent: string;
  accentDark: string;
}

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export function VenueSection({
  venueName,
  venueArea,
  venueAddress,
  venueDirectionsUrl,
  venueRevealDate,
  venuePhotos,
  accent,
  accentDark,
}: VenueSectionProps) {
  // Skip if no venue info at all
  if (!venueName && !venueRevealDate) return null;

  const safeDirectionsUrl =
    venueDirectionsUrl && isSafeUrl(venueDirectionsUrl) ? venueDirectionsUrl : null;

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
              {safeDirectionsUrl && (
                <a
                  href={safeDirectionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-[11px] font-medium text-white transition-opacity active:opacity-80"
                  style={{ backgroundColor: accent }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Z" />
                    <circle cx="12" cy="9" r="2.5" />
                  </svg>
                  get directions
                </a>
              )}
            </div>
          </div>

          {venuePhotos && venuePhotos.length > 0 && (
            <div className="-mx-5 -mb-5 mt-4 overflow-x-auto pb-5 pl-5 pr-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex gap-2">
                {venuePhotos.map((url, idx) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block h-[120px] w-[160px] shrink-0 overflow-hidden rounded-xl bg-sand/40 transition-transform active:scale-[0.98]"
                  >
                    <img
                      src={url}
                      alt={`${venueName} photo ${idx + 1}`}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}
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
