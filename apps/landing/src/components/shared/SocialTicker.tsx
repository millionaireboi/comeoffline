"use client";

import { useState, useEffect } from "react";
import { P } from "./P";

export function SocialTicker() {
  const [idx, setIdx] = useState(0);
  const [show, setShow] = useState(true);
  const msgs = [
    { text: "Aisha just got vouched in", time: "2m ago", dot: P.sage },
    { text: "3 spots left for House Party", time: "just now", dot: P.coral },
    { text: "Priya earned 2 vouch codes", time: "5m ago", dot: P.caramel },
    { text: "someone passed the vibe check", time: "1m ago", dot: P.lavender },
    { text: "No Color Holi is 44% full", time: "just now", dot: P.sage },
  ];
  useEffect(() => {
    const iv = setInterval(() => {
      setShow(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % msgs.length);
        setShow(true);
      }, 350);
    }, 3200);
    return () => clearInterval(iv);
  }, [msgs.length]);
  const m = msgs[idx];
  return (
    <div
      className="inline-flex items-center gap-2.5 rounded-full px-4 py-2 backdrop-blur-md transition-all duration-300"
      style={{
        background: P.cream + "06",
        border: `1px solid ${P.cream}10`,
        opacity: show ? 1 : 0,
        transform: show ? "translateY(0)" : "translateY(-6px)",
      }}
    >
      <div
        className="h-1.5 w-1.5 shrink-0 rounded-full animate-pulse-custom"
        style={{ background: m.dot }}
      />
      <span className="font-sans text-xs" style={{ color: P.cream + "bb" }}>
        {m.text}
      </span>
      <span className="whitespace-nowrap font-mono text-[9px]" style={{ color: P.muted + "50" }}>
        {m.time}
      </span>
    </div>
  );
}
