"use client";

import { P } from "./P";

export function ScribbleArrow({ className = "" }: { className?: string }) {
  return (
    <svg width="40" height="24" viewBox="0 0 40 24" fill="none" className={`block ${className}`}>
      <path
        d="M4 16C8 14 14 8 20 10C26 12 30 6 36 5"
        stroke={P.caramel + "45"}
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
        strokeDasharray="2 3"
      />
      <path
        d="M32 2L37 5L31 8"
        stroke={P.caramel + "45"}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function ScribbleCircle({
  width = 60,
  color = P.caramel,
}: {
  width?: number;
  color?: string;
}) {
  return (
    <svg width={width} height="30" viewBox={`0 0 ${width} 30`} fill="none" className="block">
      <ellipse
        cx={width / 2}
        cy="15"
        rx={width / 2 - 4}
        ry="11"
        stroke={color + "30"}
        strokeWidth="1.5"
        fill="none"
        strokeDasharray="4 3"
        transform={`rotate(-3 ${width / 2} 15)`}
      />
    </svg>
  );
}

export function ScribbleStar({
  color = P.caramel,
  size = 14,
}: {
  color?: string;
  size?: number;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className="block">
      <path
        d="M8 1L9.5 6H14L10.5 9L12 14L8 11L4 14L5.5 9L2 6H6.5L8 1Z"
        fill={color + "20"}
        stroke={color + "35"}
        strokeWidth="0.5"
      />
    </svg>
  );
}
