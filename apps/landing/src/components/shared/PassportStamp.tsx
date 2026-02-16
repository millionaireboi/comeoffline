"use client";

import { P } from "./P";

export function PassportStamp({
  text,
  color = P.coral,
  rotation = -8,
}: {
  text: string;
  color?: string;
  rotation?: number;
}) {
  return (
    <div
      className="relative flex h-[72px] w-[72px] items-center justify-center rounded-lg"
      style={{
        border: `2px solid ${color}45`,
        transform: `rotate(${rotation}deg)`,
      }}
    >
      <span
        className="text-center font-mono text-[7.5px] uppercase leading-[1.4] font-medium"
        style={{ letterSpacing: "1.5px", color: color + "60" }}
      >
        {text}
      </span>
      <div
        className="absolute rounded-full"
        style={{
          top: "22%",
          right: "-4px",
          width: "10px",
          height: "3px",
          background: color + "12",
          transform: "rotate(15deg)",
        }}
      />
    </div>
  );
}
