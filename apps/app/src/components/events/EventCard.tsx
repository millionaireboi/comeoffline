"use client";

import type { Event } from "@comeoffline/types";
import { SpotsBar } from "@/components/ui/SpotsBar";

interface EventCardProps {
  event: Event;
  index: number;
  onOpen: (event: Event) => void;
}

export function EventCard({ event, index, onOpen }: EventCardProps) {
  const spotsLeft = event.total_spots - event.spots_taken;
  const daysUntilVenue = Math.max(
    0,
    Math.ceil(
      (new Date(event.venue_reveal_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    ),
  );

  return (
    <div
      onClick={() => onOpen(event)}
      className="animate-fadeSlideUp cursor-pointer overflow-hidden rounded-[20px] bg-white shadow-[0_1px_3px_rgba(26,23,21,0.04),0_8px_24px_rgba(26,23,21,0.06)] transition-all duration-400 hover:-translate-y-1"
      style={{ animationDelay: `${index * 0.12}s` }}
    >
      {/* Accent bar */}
      <div
        className="h-1"
        style={{ background: `linear-gradient(90deg, ${event.accent}, ${event.accent_dark})` }}
      />

      <div className="p-6">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div>
            <span
              className="rounded-full px-2.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[1.5px]"
              style={{
                color: event.accent_dark,
                background: event.accent + "25",
              }}
            >
              {event.tag}
            </span>
            <h3 className="mt-2 font-serif text-[28px] font-normal leading-none text-near-black">
              {event.title}
            </h3>
          </div>
          <span className="text-[32px]">{event.emoji}</span>
        </div>

        <p className="mb-5 font-sans text-[15px] italic text-warm-brown">
          {event.tagline}
        </p>

        {/* Meta */}
        <div className="mb-4 flex flex-wrap gap-4">
          <div className="font-sans text-[13px] text-soft-black">📅 {event.date}</div>
          <div className="font-mono text-[11px] text-muted">
            📍 venue drops in {daysUntilVenue}d
          </div>
        </div>

        <SpotsBar spotsLeft={spotsLeft} totalSpots={event.total_spots} accent={event.accent_dark} />

        {/* Actions */}
        <div className="mt-5 flex items-center justify-between">
          <button className="rounded-full bg-near-black px-7 py-3 font-sans text-sm font-medium text-white">
            i&apos;m in →
          </button>
          <span className="font-mono text-[11px] text-muted">tap for details</span>
        </div>
      </div>

      {/* Footer */}
      <div
        className="flex items-center gap-2 border-t px-6 py-3"
        style={{
          background: "linear-gradient(135deg, #F5EFE6, #FAF6F0)",
          borderColor: "#E8DDD0",
        }}
      >
        <span className="text-sm">✓</span>
        <span className="font-mono text-[11px] text-warm-brown">
          pick-up & drop included
        </span>
      </div>
    </div>
  );
}
