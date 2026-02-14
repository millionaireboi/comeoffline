"use client";

interface SpotsBarProps {
  spotsLeft: number;
  totalSpots: number;
  accent: string;
}

export function SpotsBar({ spotsLeft, totalSpots, accent }: SpotsBarProps) {
  const pct = ((totalSpots - spotsLeft) / totalSpots) * 100;

  return (
    <div className="flex items-center gap-2.5">
      <div className="h-1 flex-1 overflow-hidden rounded-sm bg-sand">
        <div
          className="h-full rounded-sm transition-all duration-1000 ease-out"
          style={{ width: `${pct}%`, background: accent }}
        />
      </div>
      <span className="whitespace-nowrap font-mono text-[11px] text-muted">
        {spotsLeft} spots left
      </span>
    </div>
  );
}
