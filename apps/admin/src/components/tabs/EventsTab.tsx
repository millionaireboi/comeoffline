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
  const [expandedWaitlist, setExpandedWaitlist] = useState<string | null>(null);
  const [waitlistData, setWaitlistData] = useState<Record<string, Array<{ id: string; user_id: string; user_name?: string; spots_wanted: number; status: string; created_at: string }>>>({});
  const [previewEvent, setPreviewEvent] = useState<Event | null>(null);

  async function updateStatus(eventId: string, newStatus: string) {
    try {
      await apiClient.put(`/api/admin/events/${eventId}/status`, { status: newStatus });
      refetch();
    } catch (err) {
      console.error("Status update failed:", err);
    }
  }

  async function openSales(eventId: string) {
    try {
      const res = await apiClient.put<{ success: boolean; data: { sent: number; failed: number } }>(
        `/api/admin/events/${eventId}/open-sales`,
        {},
      );
      alert(`Sales opened! Notifications sent: ${res.data.sent}, failed: ${res.data.failed}`);
      refetch();
    } catch (err) {
      console.error("Open sales failed:", err);
    }
  }

  async function duplicateEvent(eventId: string) {
    try {
      await apiClient.post(`/api/admin/events/${eventId}/duplicate`, {});
      refetch();
    } catch (err) {
      console.error("Duplicate failed:", err);
    }
  }

  async function sendVenueReveal(eventId: string) {
    try {
      const preview = await apiClient.get<{
        success: boolean;
        data: {
          event: { title: string; date: string; time: string; venue_address: string; venue_ready: boolean };
          scenario: { enabled: boolean; template_name: string };
          recipients: { eligible: number; skipped_no_phone: number };
        };
      }>(`/api/admin/events/${eventId}/whatsapp/venue-reveal/preview`);

      const { event, scenario, recipients } = preview.data;

      if (!scenario.enabled) {
        alert("venue_revealed scenario is OFF. Toggle it on in WhatsApp → Scenarios first.");
        return;
      }
      if (!event.venue_ready) {
        alert("Venue isn't set on this event yet. Edit the event and add venue details first.");
        return;
      }
      if (recipients.eligible === 0) {
        alert(
          `No eligible recipients.${recipients.skipped_no_phone > 0 ? `\n${recipients.skipped_no_phone} member(s) skipped — no phone on file.` : ""}`,
        );
        return;
      }

      const ok = window.confirm(
        `Send venue reveal to ${recipients.eligible} member(s)?\n\n` +
          `Event: ${event.title}\n` +
          `When: ${event.date} · ${event.time}\n` +
          `Address: ${event.venue_address}\n\n` +
          (recipients.skipped_no_phone > 0
            ? `(${recipients.skipped_no_phone} member(s) will be skipped — no phone on file)\n\n`
            : "") +
          `Template: ${scenario.template_name}`,
      );
      if (!ok) return;

      const res = await apiClient.post<{
        success: boolean;
        data: { sent: number; failed: number; total_eligible: number; errors: Array<{ phone: string; error: string }> };
      }>(`/api/admin/events/${eventId}/whatsapp/venue-reveal`, {});

      const { sent, failed, errors } = res.data;
      const errorPreview = errors.slice(0, 3).map((e) => `  ${e.phone}: ${e.error}`).join("\n");
      alert(
        `Sent: ${sent} · Failed: ${failed}` +
          (errorPreview ? `\n\nFirst failures:\n${errorPreview}` : ""),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Venue reveal failed:", err);
      alert(`Venue reveal failed: ${message}`);
    }
  }

  type BroadcastResult = {
    success: boolean;
    data: { sent: number; failed: number; total_eligible: number; errors: Array<{ phone: string; error: string }> };
  };

  function summarizeBroadcast(label: string, data: BroadcastResult["data"]) {
    const errorPreview = data.errors.slice(0, 3).map((e) => `  ${e.phone}: ${e.error}`).join("\n");
    alert(
      `${label}\nSent: ${data.sent} · Failed: ${data.failed}` +
        (errorPreview ? `\n\nFirst failures:\n${errorPreview}` : ""),
    );
  }

  async function sendEventChanged(eventId: string, eventTitle: string) {
    try {
      const change = window.prompt(
        `What changed for "${eventTitle}"?\nKeep it short (1 line). Examples:\n  Time changed to 1:00 PM\n  Venue moved to Indiranagar\n  Dress code updated`,
        "",
      );
      if (!change || change.trim().length === 0) return;
      const res = await apiClient.post<BroadcastResult>(
        `/api/admin/events/${eventId}/whatsapp/event-changed`,
        { change_text: change.trim() },
      );
      summarizeBroadcast("Event change broadcast complete.", res.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Event change broadcast failed:", err);
      alert(`Event change broadcast failed: ${message}`);
    }
  }

  async function sendEventCancelled(eventId: string, eventTitle: string) {
    try {
      const reason = window.prompt(
        `Cancelling "${eventTitle}". Reason for members? (1 line)`,
        "",
      );
      if (!reason || reason.trim().length === 0) return;
      if (
        !window.confirm(
          `This will:\n  • Notify all confirmed members\n  • Set the event status to "cancelled"\n\nProceed?`,
        )
      ) {
        return;
      }
      const res = await apiClient.post<BroadcastResult>(
        `/api/admin/events/${eventId}/whatsapp/event-cancelled`,
        { reason: reason.trim() },
      );
      summarizeBroadcast("Cancellation broadcast complete.", res.data);
      refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Cancellation broadcast failed:", err);
      alert(`Cancellation broadcast failed: ${message}`);
    }
  }

  async function sendMemoriesReady(eventId: string, eventTitle: string) {
    try {
      if (
        !window.confirm(
          `Notify all attendees of "${eventTitle}" that memories are ready?`,
        )
      ) {
        return;
      }
      const res = await apiClient.post<BroadcastResult>(
        `/api/admin/events/${eventId}/whatsapp/memories-ready`,
        {},
      );
      summarizeBroadcast("Memories broadcast complete.", res.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Memories broadcast failed:", err);
      alert(`Memories broadcast failed: ${message}`);
    }
  }

  async function loadWaitlist(eventId: string) {
    if (expandedWaitlist === eventId) {
      setExpandedWaitlist(null);
      return;
    }
    try {
      const res = await apiClient.get<{ success: boolean; data: Array<{ id: string; user_id: string; user_name?: string; spots_wanted: number; status: string; created_at: string }> }>(
        `/api/admin/events/${eventId}/waitlist`,
      );
      setWaitlistData((prev) => ({ ...prev, [eventId]: res.data }));
      setExpandedWaitlist(eventId);
    } catch (err) {
      console.error("Failed to load waitlist:", err);
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
                  {event.status === "announced" ? (event.waitlist_count || 0) : `${event.spots_taken}/${event.total_spots}`}
                </div>
                <div className="text-[9px] text-muted">{event.status === "announced" ? "interested" : "rsvps"}</div>
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

            {/* Waitlist viewer (announced events) */}
            {event.status === "announced" && (event.waitlist_count || 0) > 0 && (
              <div className="mb-3">
                <button
                  onClick={() => loadWaitlist(event.id)}
                  className="mb-1.5 font-mono text-[9px] uppercase tracking-[1px] text-muted transition-colors hover:text-cream"
                >
                  waitlist ({event.waitlist_count || 0}) {expandedWaitlist === event.id ? "▲" : "▼"}
                </button>
                {expandedWaitlist === event.id && waitlistData[event.id] && (
                  <div className="flex flex-col gap-1">
                    {waitlistData[event.id].map((entry) => (
                      <div
                        key={entry.id}
                        className="flex justify-between rounded-md bg-white/[0.04] px-2.5 py-1.5 font-mono text-[11px]"
                      >
                        <span className="min-w-0 flex-1 truncate text-cream">{entry.user_name || entry.user_id}</span>
                        <span className="ml-2 shrink-0 text-muted">{entry.spots_wanted} spot{entry.spots_wanted > 1 ? "s" : ""} · {entry.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
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
              <button
                onClick={() => duplicateEvent(event.id)}
                className="flex-1 rounded-lg bg-white/5 px-3 py-2 font-mono text-[10px] text-cream transition-colors hover:bg-white/10"
              >
                duplicate
              </button>
              {event.status === "draft" && (
                <>
                  <button
                    onClick={() => updateStatus(event.id, "announced")}
                    className="flex-1 rounded-lg bg-lavender/15 px-3 py-2 font-mono text-[10px] text-lavender transition-colors hover:bg-lavender/25"
                  >
                    announce
                  </button>
                  <button
                    onClick={() => updateStatus(event.id, "listed")}
                    className="flex-1 rounded-lg bg-caramel/15 px-3 py-2 font-mono text-[10px] text-caramel transition-colors hover:bg-caramel/25"
                  >
                    list
                  </button>
                </>
              )}
              {event.status === "announced" && (
                <button
                  onClick={() => openSales(event.id)}
                  className="flex-1 rounded-lg bg-caramel/15 px-3 py-2 font-mono text-[10px] text-caramel transition-colors hover:bg-caramel/25"
                >
                  open sales
                </button>
              )}
              {(event.status === "upcoming" || event.status === "listed") && (
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
            </div>

            {/* WhatsApp broadcasts */}
            {event.status !== "draft" && event.status !== "cancelled" && (
              <div className="mt-2 flex flex-wrap gap-2">
                {/* Venue reveal — show for any non-draft/cancelled event */}
                <button
                  onClick={() => sendVenueReveal(event.id)}
                  className="flex flex-1 min-w-[140px] items-center justify-center gap-1.5 rounded-lg border border-sage/30 bg-sage/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[1.5px] text-sage transition-colors hover:bg-sage/20"
                  title="Fan out the venue_reveal template to all confirmed RSVPs and ticket holders"
                >
                  <span aria-hidden>📍</span>
                  <span>venue reveal</span>
                </button>

                {/* Event-changed broadcast — show for live event lifecycle */}
                {(event.status === "upcoming" || event.status === "listed" || event.status === "live") && (
                  <button
                    onClick={() => sendEventChanged(event.id, event.title)}
                    className="flex flex-1 min-w-[140px] items-center justify-center gap-1.5 rounded-lg border border-caramel/30 bg-caramel/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[1.5px] text-caramel transition-colors hover:bg-caramel/20"
                    title="Notify confirmed members of a time/venue/agenda change"
                  >
                    <span aria-hidden>📝</span>
                    <span>announce change</span>
                  </button>
                )}

                {/* Cancel + notify — show pre-completion */}
                {(event.status === "upcoming" || event.status === "listed" || event.status === "live") && (
                  <button
                    onClick={() => sendEventCancelled(event.id, event.title)}
                    className="flex flex-1 min-w-[140px] items-center justify-center gap-1.5 rounded-lg border border-coral/40 bg-coral/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[1.5px] text-coral transition-colors hover:bg-coral/20"
                    title="Cancel this event AND notify all confirmed members"
                  >
                    <span aria-hidden>🚫</span>
                    <span>cancel + notify</span>
                  </button>
                )}

                {/* Memories broadcast — show after the event is completed */}
                {event.status === "completed" && (
                  <button
                    onClick={() => sendMemoriesReady(event.id, event.title)}
                    className="flex flex-1 min-w-[140px] items-center justify-center gap-1.5 rounded-lg border border-lavender/30 bg-lavender/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[1.5px] text-lavender transition-colors hover:bg-lavender/20"
                    title="Notify attendees that memories (photos, quotes, stats) are now live"
                  >
                    <span aria-hidden>📸</span>
                    <span>send memories</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      ))}

      {previewEvent && (
        <EventPreview event={previewEvent} onClose={() => setPreviewEvent(null)} />
      )}
    </div>
  );
}
