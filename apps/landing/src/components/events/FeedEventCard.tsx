"use client";

import { useState, useEffect, useRef } from "react";
import { useAnalytics, EVENT_CARD_VIEWED } from "@comeoffline/analytics";
import { formatEventDateShort } from "@comeoffline/ui";
import { P } from "@/components/shared/P";
import { SpotsBar } from "@/components/events/SpotsBar";

/** Cheapest bookable price from the sanitized public ticketing payload */
function getPriceLabel(event: any): string {
  if (event.status === "announced") return "coming soon";
  const tiers: Array<{ price: number; sold_out?: boolean }> = event.ticketing?.enabled
    ? event.ticketing.tiers || []
    : [];
  const open = tiers.filter((t) => !t.sold_out);
  const prices = (open.length ? open : tiers)
    .map((t) => t.price)
    .filter((p) => typeof p === "number" && p > 0);
  if (prices.length === 0) return "free";
  const min = Math.min(...prices);
  return new Set(prices).size > 1 ? `from ₹${min}` : `₹${min}`;
}

interface FeedEventCardProps {
  event: any;
  index: number;
  onOpen: (event: any) => void;
}

export function FeedEventCard({ event, index, onOpen }: FeedEventCardProps) {
  const [hovered, setHovered] = useState(false);
  const cardRef = useRef<HTMLAnchorElement>(null);
  const { track } = useAnalytics();
  const trackedRef = useRef(false);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !trackedRef.current) {
          trackedRef.current = true;
          track(EVENT_CARD_VIEWED, {
            event_id: event.id,
            event_title: event.title,
            card_index: index,
          });
          observer.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [event.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const spotsLeft = event.total_spots - event.spots_taken;
  const accent = event.accent || P.caramel;
  const priceLabel = getPriceLabel(event);

  // when + where-ish, on one human line: "sat, 20 jun · 8:00 pm · indiranagar"
  const whenWhere = [
    formatEventDateShort(event.date, event.time),
    event.venue_area ? event.venue_area.toLowerCase() : null,
  ].filter(Boolean).join(" · ");

  // Venue-drop hint only while it's still pending — "venue revealed" told a
  // not-yet-booked visitor nothing.
  let venueText = "";
  if (event.venue_reveal_date) {
    const diffDays = Math.max(0, Math.ceil((new Date(event.venue_reveal_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    if (diffDays > 0) venueText = `venue drops in ${diffDays}d`;
  }

  // Scarcity only when TRUE — "20 spots left" on a 20-spot event reads as
  // "nobody is going". Below 40% remaining: urgency bar. 3+ booked: social
  // proof. Otherwise: nothing.
  const soldOut = spotsLeft <= 0 && event.status !== "announced";
  const scarce = !soldOut && event.total_spots > 0 && spotsLeft / event.total_spots <= 0.4;
  const showGoing = !soldOut && !scarce && (event.spots_taken || 0) >= 3;

  return (
    // Real <a> so crawlers (and no-JS visitors) can reach /events/[id] — the
    // SSR detail pages were orphaned behind div onClick handlers. JS users
    // still get the in-page sheet via preventDefault.
    <a
      href={`/events/${event.id}`}
      ref={cardRef}
      onClick={(e) => {
        e.preventDefault();
        onOpen(event);
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "block",
        color: "inherit",
        textDecoration: "none",
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
      {/* Cover image or accent bar */}
      {event.cover_url ? (
        <div style={{ position: "relative", height: 180, overflow: "hidden" }}>
          {event.cover_type === "video" ? (
            <video
              src={event.cover_url}
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: event.cover_focus || "center", display: "block" }}
              muted
              loop
              playsInline
              autoPlay
              preload="metadata"
            />
          ) : (
            <img
              src={event.cover_url}
              alt={event.title}
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: event.cover_focus || "center", display: "block" }}
            />
          )}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(255,255,255,0.5) 0%, transparent 50%)" }} />
        </div>
      ) : (
        <div style={{ height: 4, background: `linear-gradient(90deg, ${accent}, ${accent}60)` }} />
      )}

      <div style={{ padding: "18px 18px 0" }}>
        {/* Tag + price pills — cost is a filter, not a deterrent; hiding it
            just moves the drop-off one screen deeper */}
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          <span
            className="font-mono text-[9px] uppercase tracking-[1.5px]"
            style={{
              display: "inline-block",
              color: accent,
              background: accent + "12",
              borderRadius: 20,
              padding: "4px 10px",
            }}
          >
            {event.tag}
          </span>
          <span
            className="font-mono text-[9px] uppercase tracking-[1.5px]"
            style={{
              display: "inline-block",
              color: P.nearBlack,
              background: P.nearBlack + "0A",
              borderRadius: 20,
              padding: "4px 10px",
            }}
          >
            {priceLabel}
          </span>
        </div>

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

        {/* When + where-ish + venue-drop hint */}
        <div
          className="font-mono text-[10px]"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
            color: P.muted,
            marginBottom: 12,
          }}
        >
          <span style={{ color: P.darkBrown }}>{whenWhere}</span>
          {venueText && (
            <span style={{ color: accent + "90", flexShrink: 0 }}>{venueText}</span>
          )}
        </div>

        {/* Scarcity / social proof — only when it's real */}
        {scarce && (
          <SpotsBar
            spotsLeft={spotsLeft}
            totalSpots={event.total_spots}
            accent={accent}
          />
        )}
        {showGoing && (
          <p className="font-mono text-[10px]" style={{ color: accent, margin: 0, textAlign: "right" }}>
            {event.spots_taken} going
          </p>
        )}
      </div>

      {/* CTA area — visual affordance only; the whole card is the link.
          (A <button> inside an <a> is invalid HTML and it never had a handler.) */}
      <div style={{ padding: "12px 18px 14px" }}>
        <span
          className="font-sans text-[13px] font-medium"
          style={{
            display: "block",
            width: "100%",
            background: soldOut ? P.sand : accent,
            color: soldOut ? P.muted : "#FFFFFF",
            borderRadius: 10,
            padding: "10px 0",
            textAlign: "center",
            letterSpacing: 0.3,
          }}
        >
          {soldOut
            ? "sold out"
            : event.status === "announced"
              ? "i’m interested →"
              : priceLabel === "free"
                ? "i’m in →"
                : `i’m in · ${priceLabel} →`}
        </span>
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
      {event.pickup_points?.length > 0 && (
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
      )}

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
    </a>
  );
}
