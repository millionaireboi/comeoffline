"use client";

import { useState, useEffect } from "react";

const puns = [
  "your wifi can't reach here",
  "404: loneliness not found",
  "touch grass, not screens",
  "no signal, all vibes",
  "ctrl+alt+connect",
  "buffering... jk we're live",
  "airplane mode: activated",
];

const GLITCH_CHARS = "!@#$%^&*_+=~?░▒▓█▄▀÷×±∞≠≈∆∂∑∏";

export function GlitchText() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isGlitching, setIsGlitching] = useState(false);
  const [displayText, setDisplayText] = useState(puns[0]);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsGlitching(true);
      let count = 0;
      const target = puns[(currentIndex + 1) % puns.length];

      const glitchInterval = setInterval(() => {
        count++;
        if (count < 8) {
          setDisplayText(
            target
              .split("")
              .map((ch) =>
                ch === " "
                  ? " "
                  : Math.random() > 0.4
                    ? GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]
                    : ch,
              )
              .join(""),
          );
        } else {
          const revealCount = Math.floor(((count - 8) / 6) * target.length);
          setDisplayText(
            target
              .split("")
              .map((ch, i) =>
                i < revealCount
                  ? ch
                  : ch === " "
                    ? " "
                    : GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)],
              )
              .join(""),
          );
        }
        if (count >= 14) {
          clearInterval(glitchInterval);
          setDisplayText(target);
          setIsGlitching(false);
          setCurrentIndex((prev) => (prev + 1) % puns.length);
        }
      }, 60);
    }, 3000);

    return () => clearInterval(interval);
  }, [currentIndex]);

  return (
    <span className="relative font-serif transition-colors duration-200" style={{ color: isGlitching ? "#C4704D" : "#1A1715" }}>
      {displayText}
      {isGlitching && (
        <>
          <span
            className="absolute left-[-2px] top-0 opacity-60"
            style={{ color: "#C4704D", clipPath: "inset(10% 0 60% 0)" }}
          >
            {displayText}
          </span>
          <span
            className="absolute left-[2px] top-0 opacity-40"
            style={{ color: "#D4A574", clipPath: "inset(50% 0 10% 0)" }}
          >
            {displayText}
          </span>
        </>
      )}
    </span>
  );
}
