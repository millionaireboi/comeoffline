"use client";

import { P } from "./P";

export function GhostText({ children, fontSize }: { children: React.ReactNode; fontSize?: string }) {
  return (
    <div
      className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-serif font-normal"
      style={{
        fontSize: fontSize || "clamp(120px, 25vw, 220px)",
        color: P.muted + "04",
        letterSpacing: "-8px",
      }}
    >
      {children}
    </div>
  );
}
