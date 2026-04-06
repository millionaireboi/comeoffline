"use client";

import type { Event } from "@comeoffline/types";
import { formatDate } from "@comeoffline/ui";
import { SpotsBar } from "@/components/ui/SpotsBar";

interface EventCardProps {
  event: Event;
  index: number;
  onOpen: (event: Event) => void;
}

function getPriceLabel(event: Event): string {
  if (event.is_free || !event.ticketing?.enabled) return "free";
  const tiers = event.ticketing?.tiers || [];
  if (tiers.length === 0) return "free";
  const prices = tiers.map((t) => t.price).filter((p): p is number => typeof p === "number" && p > 0);
  if (prices.length === 0) return "free";
  const min = Math.min(...prices);
  return `from \u20B9${min}`;
}

export function EventCard({ event, index, onOpen }: EventCardProps) {
  const spotsLeft = (event.total_spots ?? 0) - (event.spots_taken ?? 0);
  const daysUntilVenue = event.venue_reveal_date
    ? Math.max(
        0,
        Math.ceil(
          (new Date(event.venue_reveal_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        ),
      )
    : 0;
  const priceLabel = event.status === "announced" ? "coming soon" : getPriceLabel(event);
  const isTicketed = event.ticketing?.enabled && !event.is_free;

  return (
    <div
      onClick={() => onOpen(event)}
      className="animate-fadeSlideUp cursor-pointer overflow-hidden rounded-[20px] bg-white shadow-[0_1px_3px_rgba(26,23,21,0.04),0_8px_24px_rgba(26,23,21,0.06)] transition-all duration-400 hover:-translate-y-1"
      style={{ animationDelay: `${index * 0.12}s` }}
    >
      {/* Cover media */}
      {event.cover_url ? (
        <div className="relative">
          {event.cover_type === "video" ? (
            <video
              src={event.cover_url}
              className="h-48 w-full object-cover"
              style={{ objectPosition: event.cover_focus || "center" }}
              muted
              loop
              playsInline
              preload="metadata"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                const fallback = e.currentTarget.parentElement?.querySelector("[data-cover-fallback]") as HTMLElement;
                if (fallback) fallback.style.display = "flex";
              }}
            />
          ) : (
            <img
              src={event.cover_url}
              alt={event.title}
              className="h-48 w-full object-cover"
              style={{ objectPosition: event.cover_focus || "center" }}
              onError={(e) => {
                e.currentTarget.style.display = "none";
                const fallback = e.currentTarget.parentElement?.querySelector("[data-cover-fallback]") as HTMLElement;
                if (fallback) fallback.style.display = "flex";
              }}
            />
          )}
          {/* Fallback when media fails to load */}
          <div
            data-cover-fallback
            className="hidden h-48 w-full items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${event.accent || "#D4A574"}, ${event.accent_dark || "#B8845A"})` }}
          >
            <span className="text-4xl">{event.emoji}</span>
          </div>
          {/* Subtle gradient at bottom to blend into card */}
          <div className="absolute inset-0 bg-gradient-to-t from-white/60 via-transparent to-transparent" />
        </div>
      ) : (
        <>
          {/* Accent bar (fallback when no cover) */}
          <div
            className="h-1"
            style={{ background: `linear-gradient(90deg, ${event.accent}, ${event.accent_dark})` }}
          />
        </>
      )}

      <div className="p-6">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span
                className="rounded-full px-2.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[1.5px]"
                style={{
                  color: event.accent_dark,
                  background: event.accent + "25",
                }}
              >
                {event.tag}
              </span>
              <span className="rounded-full bg-near-black/5 px-2.5 py-0.5 font-mono text-[10px] font-medium text-near-black">
                {priceLabel}
              </span>
            </div>
            <h3 className="font-serif text-[28px] font-normal leading-none text-near-black">
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
          <div className="font-sans text-[13px] text-soft-black">{formatDate(event.date)}</div>
          {event.venue_reveal_date && daysUntilVenue > 0 && (
            <div className="font-mono text-[11px] text-muted">
              venue drops in {daysUntilVenue}d
            </div>
          )}
        </div>

        {event.status === "announced" ? (
          <div className="flex items-center gap-2">
            <div
              className="h-1 flex-1 overflow-hidden rounded-full"
              style={{ background: (event.accent_dark || "#B8845A") + "15" }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, ((event.waitlist_count || 0) / Math.max(event.total_spots, 1)) * 100)}%`,
                  background: event.accent_dark || "#B8845A",
                  opacity: 0.6,
                }}
              />
            </div>
            <span className="shrink-0 font-mono text-[11px] text-muted">
              {event.waitlist_count || 0} interested
            </span>
          </div>
        ) : (
          <SpotsBar spotsLeft={spotsLeft} totalSpots={event.total_spots} accent={event.accent_dark} />
        )}

        {/* Actions */}
        <div className="mt-5 flex items-center justify-between">
          <button className="rounded-full bg-near-black px-7 py-3 font-sans text-sm font-medium text-white">
            {event.status === "announced"
              ? "i\u2019m interested \u2192"
              : isTicketed
                ? "get tickets \u2192"
                : "i\u2019m in \u2192"}
          </button>
          <span className="font-mono text-[11px] text-muted">tap for details</span>
        </div>
      </div>

      {/* Footer */}
      {event.pickup_points?.length > 0 && (
        <div
          className="flex items-center gap-2 border-t px-6 py-3"
          style={{
            background: "linear-gradient(135deg, #F5EFE6, #FAF6F0)",
            borderColor: "#E8DDD0",
          }}
        >
          <span className="text-sm">{"\u2713"}</span>
          <span className="font-mono text-[11px] text-warm-brown">
            pick-up & drop included
          </span>
        </div>
      )}
    </div>
  );
}
