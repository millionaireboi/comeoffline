"use client";

import { useState } from "react";
import { formatDate } from "@comeoffline/ui";
import { useApi } from "@/hooks/useApi";
import { apiClient } from "@/lib/apiClient";
import { instrumentSerif, EVENT_STATUS_COLORS } from "@/lib/constants";
import { EventForm } from "@/components/EventForm";
import { EventPreview } from "@/components/EventPreview";
import type { Event } from "@comeoffline/types";

export function EventsTab() {
  const { data: events, loading, refetch } = useApi<Event[]>("/api/admin/events", {
    dedupingInterval: 2 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });
  const [mode, setMode] = useState<"list" | "create" | "edit">("list");
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [expandedPickups, setExpandedPickups] = useState<string | null>(null);
  const [previewEvent, setPreviewEvent] = useState<Event | null>(null);

  async function updateStatus(eventId: string, newStatus: string) {
    try {
      await apiClient.put(`/api/admin/events/${eventId}/status`, { status: newStatus });
      refetch();
    } catch (err) {
      console.error("Status update failed:", err);
    }
  }

  if (mode === "create") {
    return (
      <EventForm
        onSave={() => { refetch(); setMode("list"); }}
        onCancel={() => setMode("list")}
        serifClassName={instrumentSerif.className}
      />
    );
  }

  if (mode === "edit" && editingEvent) {
    return (
      <EventForm
        event={editingEvent}
        onSave={() => { refetch(); setEditingEvent(null); setMode("list"); }}
        onCancel={() => { setEditingEvent(null); setMode("list"); }}
        serifClassName={instrumentSerif.className}
      />
    );
  }

  if (loading && !events) {
    return <p className="py-8 text-center font-mono text-sm text-muted">loading events...</p>;
  }

  const eventList = events || [];

  return (
    <div className="w-full space-y-4 sm:max-w-4xl">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] text-muted">{eventList.length} events</p>
        <button
          onClick={() => setMode("create")}
          className="rounded-lg bg-caramel px-4 py-2 font-mono text-[10px] uppercase tracking-[2px] text-gate-black transition-colors hover:bg-caramel/90"
        >
          + create
        </button>
      </div>

      {eventList.map((event) => (
        <div
          key={event.id}
          className="overflow-hidden rounded-xl border border-white/5 bg-white/[0.02]"
        >
          {/* Accent gradient bar */}
          <div
            className="h-[3px]"
            style={{
              background: event.accent && event.accent_dark
                ? `linear-gradient(90deg, ${event.accent}, ${event.accent_dark})`
                : `linear-gradient(90deg, #D4A574, #B8845A)`,
            }}
          />

          <div className="p-5">
            {/* Header row */}
            <div className="mb-3 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{event.emoji}</span>
                <div>
                  <p className="font-sans text-base font-medium text-cream">{event.title}</p>
                  <p className="font-mono text-[10px] text-muted">
                    {event.tag} &middot; {formatDate(event.date)}
                  </p>
                </div>
              </div>
              <span
                className="rounded-full px-2.5 py-1 font-mono text-[9px] uppercase"
                style={{
                  color: EVENT_STATUS_COLORS[event.status] || "#9B8E82",
                  background: (EVENT_STATUS_COLORS[event.status] || "#9B8E82") + "15",
                }}
              >
                {event.status === "live" ? "● live" : event.status}
              </span>
            </div>

            {/* Stats grid */}
            <div className="mb-3 grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-white/[0.04] p-2.5 text-center">
                <div className="font-mono text-base font-medium text-cream">
                  {event.spots_taken}/{event.total_spots}
                </div>
                <div className="text-[9px] text-muted">rsvps</div>
              </div>
              <div className="rounded-lg bg-white/[0.04] p-2.5 text-center">
                <div className="font-mono text-base font-medium text-muted">—</div>
                <div className="text-[9px] text-muted">attended</div>
              </div>
              <div className="rounded-lg bg-white/[0.04] p-2.5 text-center">
                <div className="font-mono text-base font-medium text-muted">—</div>
                <div className="text-[9px] text-muted">no-shows</div>
              </div>
            </div>

            {/* Capacity progress bar */}
            <div className="mb-3">
              <div className="h-1 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${event.total_spots > 0 ? Math.min(100, (event.spots_taken / event.total_spots) * 100) : 0}%`,
                    background: event.accent || "#D4A574",
                  }}
                />
              </div>
            </div>

            {/* Pickup Points (collapsible) */}
            {event.pickup_points && event.pickup_points.length > 0 && (
              <div className="mb-3">
                <button
                  onClick={() => setExpandedPickups(expandedPickups === event.id ? null : event.id)}
                  className="mb-1.5 font-mono text-[9px] uppercase tracking-[1px] text-muted transition-colors hover:text-cream"
                >
                  pickup points ({event.pickup_points.length}) {expandedPickups === event.id ? "▲" : "▼"}
                </button>
                {expandedPickups === event.id && (
                  <div className="flex flex-col gap-1">
                    {event.pickup_points.map((p, i) => (
                      <div
                        key={i}
                        className="flex justify-between rounded-md bg-white/[0.04] px-2.5 py-1.5 font-mono text-[11px]"
                      >
                        <span className="min-w-0 flex-1 truncate text-cream">{p.name}</span>
                        <span className="ml-2 shrink-0 text-muted">{p.time} · {p.capacity}pax</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setPreviewEvent(event)}
                className="flex-1 rounded-lg bg-white/5 px-3 py-2 font-mono text-[10px] text-cream transition-colors hover:bg-white/10"
              >
                preview
              </button>
              <button
                onClick={() => { setEditingEvent(event); setMode("edit"); }}
                className="flex-1 rounded-lg bg-white/5 px-3 py-2 font-mono text-[10px] text-cream transition-colors hover:bg-white/10"
              >
                edit
              </button>
              {event.status === "draft" && (
                <button
                  onClick={() => updateStatus(event.id, "upcoming")}
                  className="flex-1 rounded-lg bg-caramel/15 px-3 py-2 font-mono text-[10px] text-caramel transition-colors hover:bg-caramel/25"
                >
                  publish
                </button>
              )}
              {event.status === "upcoming" && (
                <button
                  onClick={() => updateStatus(event.id, "live")}
                  className="flex-1 rounded-lg bg-sage/15 px-3 py-2 font-mono text-[10px] text-sage transition-colors hover:bg-sage/25"
                >
                  go live
                </button>
              )}
              {event.status === "live" && (
                <button
                  onClick={() => updateStatus(event.id, "completed")}
                  className="flex-1 rounded-lg bg-white/10 px-3 py-2 font-mono text-[10px] text-muted transition-colors hover:bg-white/20"
                >
                  complete
                </button>
              )}
              {event.status === "completed" && (
                <button
                  className="flex-1 rounded-lg bg-lavender/15 px-3 py-2 font-mono text-[10px] text-lavender transition-colors hover:bg-lavender/25"
                >
                  memories
                </button>
              )}
            </div>
          </div>
        </div>
      ))}

      {previewEvent && (
        <EventPreview event={previewEvent} onClose={() => setPreviewEvent(null)} />
      )}
    </div>
  );
}
