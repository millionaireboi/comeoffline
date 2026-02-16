"use client";

import { P } from "./P";

export function RotatingSeal({ size = 90 }: { size?: number }) {
  const text = "COME OFFLINE \u2022 EST 2026 \u2022 BANGALORE \u2022 INVITE ONLY \u2022 ";
  return (
    <div className="animate-spin-slow" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <defs>
          <path
            id="sc"
            d="M 50,50 m -38,0 a 38,38 0 1,1 76,0 a 38,38 0 1,1 -76,0"
            fill="none"
          />
        </defs>
        <text
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "7.5px",
            fill: P.caramel + "55",
            letterSpacing: "2.5px",
            textTransform: "uppercase",
          }}
        >
          <textPath href="#sc">{text}</textPath>
        </text>
        <circle cx="50" cy="50" r="16" fill="none" stroke={P.caramel + "20"} strokeWidth="0.5" />
        <text
          x="50"
          y="54"
          textAnchor="middle"
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "12px",
            fill: P.caramel + "45",
          }}
        >
          CO
        </text>
      </svg>
    </div>
  );
}
