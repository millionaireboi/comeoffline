"use client";

import { apiClient } from "@/lib/apiClient";
import { toast } from "@/lib/toast";
import type { Event } from "@comeoffline/types";

type BroadcastResult = {
  success: boolean;
  data: { sent: number; failed: number; total_eligible: number; errors: Array<{ phone: string; error: string }> };
};

function summarizeBroadcast(label: string, data: BroadcastResult["data"]) {
  if (data.errors.length > 0) console.warn("broadcast failures:", data.errors);
  const summary = `${label} sent ${data.sent}${data.failed ? ` · ${data.failed} failed (see console)` : ""}`;
  if (data.failed > 0) toast.info(summary);
  else toast.success(summary);
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
      toast.error("venue_revealed scenario is OFF — toggle it on in whatsapp → scenarios first");
      return;
    }
    if (!event.venue_ready) {
      toast.error("venue isn't set on this event yet — add venue details first");
      return;
    }
    if (recipients.eligible === 0) {
      toast.info(`no eligible recipients${recipients.skipped_no_phone > 0 ? ` — ${recipients.skipped_no_phone} skipped (no phone on file)` : ""}`);
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

    const res = await apiClient.post<BroadcastResult>(`/api/admin/events/${eventId}/whatsapp/venue-reveal`, {});
    summarizeBroadcast("venue reveal —", res.data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Venue reveal failed:", err);
    toast.error(`venue reveal failed — ${message}`);
  }
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
    summarizeBroadcast("event change —", res.data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Event change broadcast failed:", err);
    toast.error(`event change broadcast failed — ${message}`);
  }
}

async function sendEventCancelled(eventId: string, eventTitle: string, onDone?: () => void) {
  try {
    const reason = window.prompt(`Cancelling "${eventTitle}". Reason for members? (1 line)`, "");
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
    summarizeBroadcast("cancellation —", res.data);
    onDone?.();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Cancellation broadcast failed:", err);
    toast.error(`cancellation broadcast failed — ${message}`);
  }
}

async function sendMemoriesReady(eventId: string, eventTitle: string) {
  try {
    if (!window.confirm(`Notify all attendees of "${eventTitle}" that memories are ready?`)) {
      return;
    }
    const res = await apiClient.post<BroadcastResult>(
      `/api/admin/events/${eventId}/whatsapp/memories-ready`,
      {},
    );
    summarizeBroadcast("memories —", res.data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Memories broadcast failed:", err);
    toast.error(`memories broadcast failed — ${message}`);
  }
}

/** Status-aware WhatsApp broadcast actions for one event. Renders nothing for
 *  draft/cancelled events. `onChanged` fires after an action that mutates the
 *  event itself (cancel + notify). */
export function EventBroadcastButtons({ event, onChanged }: { event: Event; onChanged?: () => void }) {
  if (event.status === "draft" || event.status === "cancelled") return null;

  const midLifecycle = event.status === "upcoming" || event.status === "listed" || event.status === "live";

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => sendVenueReveal(event.id)}
        className="flex flex-1 min-w-[140px] items-center justify-center gap-1.5 rounded-lg border border-sage/30 bg-sage/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[1.5px] text-sage transition-colors hover:bg-sage/20"
        title="Fan out the venue_reveal template to all confirmed RSVPs and ticket holders"
      >
        <span aria-hidden>📍</span>
        <span>venue reveal</span>
      </button>

      {midLifecycle && (
        <button
          onClick={() => sendEventChanged(event.id, event.title)}
          className="flex flex-1 min-w-[140px] items-center justify-center gap-1.5 rounded-lg border border-caramel/30 bg-caramel/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[1.5px] text-caramel transition-colors hover:bg-caramel/20"
          title="Notify confirmed members of a time/venue/agenda change"
        >
          <span aria-hidden>📝</span>
          <span>announce change</span>
        </button>
      )}

      {midLifecycle && (
        <button
          onClick={() => sendEventCancelled(event.id, event.title, onChanged)}
          className="flex flex-1 min-w-[140px] items-center justify-center gap-1.5 rounded-lg border border-coral/40 bg-coral/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[1.5px] text-coral transition-colors hover:bg-coral/20"
          title="Cancel this event AND notify all confirmed members"
        >
          <span aria-hidden>🚫</span>
          <span>cancel + notify</span>
        </button>
      )}

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
  );
}
