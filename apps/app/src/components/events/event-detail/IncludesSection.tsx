import { SectionLabel } from "./SectionLabel";

interface IncludesSectionProps {
  includes: string[];
  accent: string;
  accentDark: string;
}

export function IncludesSection({ includes, accent, accentDark }: IncludesSectionProps) {
  if (includes.length === 0) return null;

  return (
    <div className="mb-7">
      <SectionLabel
        label="what's included"
        sticker="you literally just show up"
        stickerColor="#D4A574"
        stickerRotation={1.5}
      />
      <div className="rounded-2xl border border-sand/40 bg-white p-[18px] shadow-[0_1px_4px_rgba(26,23,21,0.03)]">
        {includes.map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-3 py-2"
            style={{
              borderBottom: i < includes.length - 1 ? "1px solid rgba(232,221,208,0.3)" : "none",
            }}
          >
            <div
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
              style={{ background: accent + "20" }}
            >
              <span className="font-mono text-[10px]" style={{ color: accentDark }}>
                ✓
              </span>
            </div>
            <span className="font-sans text-sm text-warm-brown">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
