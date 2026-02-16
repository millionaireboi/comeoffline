"use client";

import { useEffect, useState, useRef } from "react";
import { P } from "@/components/shared/P";

const PUNS = [
  "your wifi can't reach here",
  "404: loneliness not found",
  "touch grass, not screens",
  "no signal, all vibes",
  "ctrl+alt+connect",
  "buffering... jk we're live",
  "airplane mode: activated",
];

const GLITCH_CHARS = "!@#$%^&*_+=~?\u2592\u2591\u2593\u2588\u2584\u2580\u00F7\u00D7\u00B1\u221E\u2260\u2248\u2206\u2202\u2211\u222B";

function randomChar() {
  return GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
}

export function GlitchText() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isGlitching, setIsGlitching] = useState(false);
  const [displayText, setDisplayText] = useState(PUNS[0]);
  const indexRef = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsGlitching(true);
      let count = 0;
      const target = PUNS[(indexRef.current + 1) % PUNS.length];

      const glitchInterval = setInterval(() => {
        count++;
        if (count < 8) {
          // Glitch phase: random characters with some real ones bleeding through
          setDisplayText(
            target
              .split("")
              .map((ch) =>
                ch === " " ? " " : Math.random() > 0.4 ? randomChar() : ch
              )
              .join("")
          );
        } else {
          // Reveal phase: left-to-right reveal
          const revealCount = Math.floor(((count - 8) / 6) * target.length);
          setDisplayText(
            target
              .split("")
              .map((ch, i) =>
                i < revealCount ? ch : ch === " " ? " " : randomChar()
              )
              .join("")
          );
        }
        if (count >= 14) {
          clearInterval(glitchInterval);
          setDisplayText(target);
          setIsGlitching(false);
          indexRef.current = (indexRef.current + 1) % PUNS.length;
          setCurrentIndex(indexRef.current);
        }
      }, 60);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <span
      style={{
        fontFamily: "serif",
        color: isGlitching ? P.highlight : P.nearBlack,
        transition: "color 0.2s",
        position: "relative",
      }}
    >
      {displayText}
      {isGlitching && (
        <>
          <span
            aria-hidden
            style={{
              position: "absolute",
              left: "-2px",
              top: 0,
              color: P.highlight,
              opacity: 0.6,
              clipPath: "inset(10% 0 60% 0)",
              pointerEvents: "none",
            }}
          >
            {displayText}
          </span>
          <span
            aria-hidden
            style={{
              position: "absolute",
              left: "2px",
              top: 0,
              color: P.caramel,
              opacity: 0.4,
              clipPath: "inset(50% 0 10% 0)",
              pointerEvents: "none",
            }}
          >
            {displayText}
          </span>
        </>
      )}
    </span>
  );
}
