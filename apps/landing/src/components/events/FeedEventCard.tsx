"use client";

import { useState } from "react";
import { P } from "@/components/shared/P";
import { SpotsBar } from "@/components/events/SpotsBar";

interface FeedEventCardProps {
  event: any;
  index: number;
  onOpen: (event: any) => void;
}

export function FeedEventCard({ event, index, onOpen }: FeedEventCardProps) {
  const [hovered, setHovered] = useState(false);

  const spotsLeft = event.total_spots - event.spots_taken;
  const accent = event.accent || P.caramel;

  // Compute days until venue reveal
  let venueText = "";
  if (event.venue_reveal_date) {
    const now = new Date();
    const reveal = new Date(event.venue_reveal_date);
    const diffMs = reveal.getTime() - now.getTime();
    const diffDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    venueText = diffDays > 0 ? `venue drops in ${diffDays}d` : "venue revealed";
  }

  return (
    <div
      onClick={() => onOpen(event)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#FFFFFF",
        borderRadius: 18,
        overflow: "hidden",
        cursor: "pointer",
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
        transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease",
        boxShadow: hovered
          ? `0 12px 32px ${accent}18`
          : `0 2px 8px rgba(0,0,0,0.06)`,
        opacity: 1,
        animation: `fadeSlideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.1}s both`,
      }}
    >
      {/* Accent gradient top bar */}
      <div
        style={{
          height: 4,
          background: `linear-gradient(90deg, ${accent}, ${accent}60)`,
        }}
      />

      <div style={{ padding: "18px 18px 0" }}>
        {/* Tag pill */}
        <span
          className="font-mono text-[9px] uppercase tracking-[1.5px]"
          style={{
            display: "inline-block",
            color: accent,
            background: accent + "12",
            borderRadius: 20,
            padding: "4px 10px",
            marginBottom: 10,
          }}
        >
          {event.tag}
        </span>

        {/* Title row */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
          <h3
            className="font-serif font-normal"
            style={{
              fontSize: 20,
              lineHeight: 1.2,
              color: P.nearBlack,
              margin: 0,
              flex: 1,
            }}
          >
            {event.title}
          </h3>
          <span style={{ fontSize: 24, flexShrink: 0 }}>{event.emoji}</span>
        </div>

        {/* Tagline */}
        <p
          className="font-sans text-[13px]"
          style={{
            color: P.warmBrown,
            fontStyle: "italic",
            margin: "0 0 10px",
            lineHeight: 1.4,
          }}
        >
          {event.tagline}
        </p>

        {/* Date + venue hint */}
        <div
          className="font-mono text-[10px]"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            color: P.muted,
            marginBottom: 12,
          }}
        >
          <span>{event.date}</span>
          {venueText && (
            <span style={{ color: accent + "90" }}>{venueText}</span>
          )}
        </div>

        {/* Spots bar */}
        <SpotsBar
          spotsLeft={spotsLeft}
          totalSpots={event.total_spots}
          accent={accent}
        />
      </div>

      {/* CTA area */}
      <div style={{ padding: "12px 18px 14px" }}>
        <button
          className="font-sans text-[13px] font-medium"
          style={{
            display: "block",
            width: "100%",
            background: accent,
            color: "#FFFFFF",
            border: "none",
            borderRadius: 10,
            padding: "10px 0",
            cursor: "pointer",
            letterSpacing: 0.3,
          }}
        >
          i&apos;m in &rarr;
        </button>
        <p
          className="font-hand text-[11px]"
          style={{
            textAlign: "center",
            color: P.muted + "70",
            margin: "6px 0 0",
          }}
        >
          tap for details
        </p>
      </div>

      {/* Bottom strip */}
      <div
        className="font-mono text-[9px] uppercase tracking-[1px]"
        style={{
          background: accent + "08",
          borderTop: `1px solid ${accent}10`,
          color: P.muted,
          textAlign: "center",
          padding: "7px 0",
        }}
      >
        pick-up &amp; drop included
      </div>

      {/* Keyframe injection */}
      <style>{`
        @keyframes fadeSlideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
