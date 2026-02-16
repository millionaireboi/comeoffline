"use client";

import { P } from "./P";

export function Sticker({
  text,
  rotation = -3,
  color = P.caramel,
  top,
  right,
  left,
  bottom,
  delay = 0,
  visible = true,
}: {
  text: string;
  rotation?: number;
  color?: string;
  top?: string;
  right?: string;
  left?: string;
  bottom?: string;
  delay?: number;
  visible?: boolean;
}) {
  return (
    <div
      className="pointer-events-none absolute transition-all duration-600"
      style={{
        top,
        right,
        left,
        bottom,
        transform: `rotate(${rotation}deg)`,
        opacity: visible ? 1 : 0,
        transitionDelay: `${delay}s`,
      }}
    >
      <span
        className="whitespace-nowrap rounded-full font-mono text-[9px] uppercase tracking-[2px]"
        style={{
          color,
          border: `1px solid ${color}40`,
          padding: "6px 14px",
          background: color + "08",
        }}
      >
        {text}
      </span>
    </div>
  );
}
