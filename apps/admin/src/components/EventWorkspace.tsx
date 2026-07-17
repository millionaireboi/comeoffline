"use client";

import { useState } from "react";
import { formatDate } from "@comeoffline/ui";
import { useApi } from "@/hooks/useApi";
import { instrumentSerif, EVENT_STATUS_COLORS } from "@/lib/constants";
import { BookingsTab } from "@/components/tabs/BookingsTab";
import { CheckInTab } from "@/components/tabs/CheckInTab";
import { ContentTab } from "@/components/tabs/ContentTab";
import { DiscountsTab } from "@/components/tabs/DiscountsTab";
import { EventBroadcastButtons } from "@/components/EventBroadcasts";
import type { Event } from "@comeoffline/types";

type View = "sales" | "door" | "content" | "discounts" | "broadcasts";

const VIEWS: Array<{ key: View; label: string }> = [
  { key: "sales", label: "sales" },
  { key: "door", label: "door check-in" },
  { key: "content", label: "content" },
  { key: "discounts", label: "discounts" },
  { key: "broadcasts", label: "broadcasts" },
];

/** One event's whole lifecycle in one place — every view below is the existing
 *  tab component locked to this event, so there's a single implementation of
 *  each tool whether it's reached globally or from here. */
export function EventWorkspace({ eventId, onBack }: { eventId: string; onBack: () => void }) {
  const { data: events, loading, refetch } = useApi<Event[]>("/api/admin/events", {
    dedupingInterval: 2 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });
  const [view, setView] = useState<View>("sales");
  const event = events?.find((e) => e.id === eventId);

  if (!event) {
    return (
      <div className="py-12 text-center">
        <p className="font-mono text-sm text-muted">
          {loading && !events ? "loading event..." : "event not found"}
        </p>
        {!loading && (
          <button onClick={onBack} className="mt-4 font-mono text-[11px] text-caramel hover:underline">
            ← back to events
          </button>
        )}
      </div>
    );
  }

  const statusColor = EVENT_STATUS_COLORS[event.status] || "#9B8E82";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="overflow-hidden rounded-xl border border-white/5 bg-white/[0.02]">
        <div
          className="h-[3px]"
          style={{
            background: event.accent && event.accent_dark
              ? `linear-gradient(90deg, ${event.accent}, ${event.accent_dark})`
              : `linear-gradient(90deg, #D4A574, #B8845A)`,
          }}
        />
        <div className="flex flex-wrap items-center gap-3 p-5">
          <button
            onClick={onBack}
            className="rounded-lg bg-white/5 px-3 py-2 font-mono text-[10px] uppercase tracking-[1.5px] text-muted transition-colors hover:bg-white/10 hover:text-cream"
          >
            ← events
          </button>
          <span className="text-2xl">{event.emoji}</span>
          <div className="min-w-0">
            <h2 className={`${instrumentSerif.className} truncate text-xl text-cream`}>{event.title}</h2>
            <p className="font-mono text-[10px] text-muted">
              {formatDate(event.date)} &middot; {event.spots_taken}/{event.total_spots} spots
            </p>
          </div>
          <span
            className="ml-auto rounded-full px-2.5 py-1 font-mono text-[9px] uppercase"
            style={{ color: statusColor, background: statusColor + "15" }}
          >
            {event.status === "live" ? "● live" : event.status}
          </span>
        </div>
      </div>

      {/* Sub-views */}
      <nav className="overflow-x-auto sm:border-b sm:border-white/5">
        <div className="flex min-w-max gap-1.5 sm:gap-1">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              className={`whitespace-nowrap rounded-full px-4 py-2.5 font-mono text-[10px] uppercase tracking-[2px] transition-colors sm:rounded-none ${
                view === v.key
                  ? "bg-caramel/15 text-caramel sm:border-b-2 sm:border-caramel sm:bg-transparent sm:text-cream"
                  : "bg-white/[0.04] text-muted hover:text-cream sm:bg-transparent"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </nav>

      {view === "sales" && <BookingsTab key={`sales-${eventId}`} eventId={eventId} />}
      {view === "door" && <CheckInTab key={`door-${eventId}`} eventId={eventId} />}
      {view === "content" && <ContentTab key={`content-${eventId}`} eventId={eventId} />}
      {view === "discounts" && <DiscountsTab key={`discounts-${eventId}`} eventId={eventId} />}
      {view === "broadcasts" && (
        <div className="max-w-2xl space-y-4">
          <p className="font-mono text-[11px] text-muted">
            WhatsApp fan-outs to this event&apos;s members — each one previews and confirms before sending.
          </p>
          <EventBroadcastButtons event={event} onChanged={refetch} />
          {(event.status === "draft" || event.status === "cancelled") && (
            <p className="font-mono text-[11px] text-muted">
              no broadcasts available — {event.status} events have no one to notify.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
