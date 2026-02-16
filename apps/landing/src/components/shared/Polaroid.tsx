"use client";

import { P } from "./P";

export function Polaroid({
  color,
  rotation = -3,
  caption,
  emoji,
}: {
  color: string;
  rotation?: number;
  caption: string;
  emoji: string;
}) {
  return (
    <div
      className="relative shrink-0 rounded-[3px] bg-white p-2 pb-7"
      style={{
        width: 120,
        boxShadow: "0 3px 12px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.08)",
        transform: `rotate(${rotation}deg)`,
      }}
    >
      <div
        className="flex items-center justify-center rounded-[2px] text-[30px]"
        style={{
          width: 104,
          height: 104,
          background: `linear-gradient(135deg, ${color}25, ${color}50, ${color}15)`,
        }}
      >
        {emoji}
      </div>
      <p className="mt-1.5 text-center font-hand text-[11px] leading-[1.2] text-warm-brown">
        {caption}
      </p>
      <div
        className="absolute -top-1.5 left-1/2 rounded-[2px]"
        style={{
          transform: "translateX(-50%) rotate(2deg)",
          width: 36,
          height: 12,
          background: P.caramel + "18",
          border: `0.5px solid ${P.caramel}10`,
        }}
      />
    </div>
  );
}
