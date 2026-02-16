"use client";

import { P } from "@/components/shared/P";

interface SpotsBarProps {
  spotsLeft: number;
  totalSpots: number;
  accent: string;
}

export function SpotsBar({ spotsLeft, totalSpots, accent }: SpotsBarProps) {
  const pct = ((totalSpots - spotsLeft) / totalSpots) * 100;

  return (
    <div>
      <div
        className="h-[4px] w-full overflow-hidden rounded-[2px]"
        style={{ background: P.sand }}
      >
        <div
          className="h-full rounded-[2px]"
          style={{
            width: `${pct}%`,
            background: accent,
            transition: "width 1s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />
      </div>
      <div className="mt-1.5 text-right">
        <span
          className="font-mono text-[10px]"
          style={{ color: accent }}
        >
          {spotsLeft} spots left
        </span>
      </div>
    </div>
  );
}
