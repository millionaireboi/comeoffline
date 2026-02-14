"use client";

import { useState, useEffect, useCallback } from "react";
import type { Event, RSVP } from "@comeoffline/types";
import { useAuth } from "@/hooks/useAuth";
import { useAppStore } from "@/store/useAppStore";
import { apiFetch } from "@/lib/api";
import { GlitchText } from "@/components/ui/GlitchText";
import { EventCard } from "@/components/events/EventCard";
import { EventDetail } from "@/components/events/EventDetail";
import { Noise } from "@/components/shared/Noise";

export function EventFeed() {
  const { getIdToken } = useAuth();
  const { setCurrentEvent, setActiveRsvp, setStage } = useAppStore();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailEvent, setDetailEvent] = useState<Event | null>(null);
  const [rsvpLoading, setRsvpLoading] = useState(false);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const token = await getIdToken();
        if (!token) return;
        const data = await apiFetch<{ success: boolean; data: Event[] }>("/api/events", {
          token,
        });
        if (data.data) setEvents(data.data);
      } catch (err) {
        console.error("Failed to load events:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, [getIdToken]);

  const handleRsvp = useCallback(
    async (event: Event) => {
      setRsvpLoading(true);
      try {
        const token = await getIdToken();
        if (!token) return;
        const data = await apiFetch<{ success: boolean; data: RSVP }>(`/api/events/${event.id}/rsvp`, {
          method: "POST",
          token,
        });
        if (data.data) {
          setCurrentEvent(event);
          setActiveRsvp(data.data);
          setStage("countdown");
        }
      } catch (err) {
        console.error("RSVP failed:", err);
      } finally {
        setRsvpLoading(false);
      }
    },
    [getIdToken, setCurrentEvent, setActiveRsvp, setStage],
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="animate-fadeIn text-center">
          <p className="font-mono text-[11px] uppercase tracking-[3px] text-muted">loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream pb-[120px]">
      <Noise />

      {/* Header section */}
      <section className="relative px-5 pb-12 pt-10">
        <div
          className="absolute -right-[30px] top-5 h-[120px] w-[120px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(212,165,116,0.08), transparent)",
            animation: "float 6s ease-in-out infinite",
          }}
        />
        <p className="mb-4 font-mono text-[11px] uppercase tracking-[3px] text-muted">
          invite only · est. 2026
        </p>
        <h2
          className="mb-3 max-w-[340px] font-serif text-[38px] font-normal leading-[1.15] text-near-black"
          style={{ letterSpacing: "-1px" }}
        >
          <GlitchText />
        </h2>
        <p className="max-w-[320px] font-sans text-[15px] leading-relaxed text-warm-brown">
          a community for people who still believe the best connections happen face to face.{" "}
          <span className="text-caramel">bangalore chapter.</span>
        </p>
      </section>

      {/* Events count */}
      <div className="flex justify-between px-5 pb-4">
        <span className="font-mono text-[10px] uppercase tracking-[3px] text-muted">
          upcoming events
        </span>
        <span className="font-mono text-[11px] text-caramel">
          {events.length} event{events.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Event cards */}
      <section className="flex flex-col gap-4 px-4">
        {events.map((event, i) => (
          <EventCard key={event.id} event={event} index={i} onOpen={setDetailEvent} />
        ))}

        {/* Coming soon placeholder */}
        <div
          className="animate-fadeSlideUp rounded-[20px] border-[1.5px] border-dashed border-sand p-8 text-center"
          style={{ animationDelay: `${events.length * 0.12 + 0.12}s` }}
        >
          <span className="mb-3 block text-[28px]">👀</span>
          <p className="font-serif text-lg text-warm-brown">more coming soon</p>
          <p className="mt-1 font-mono text-[11px] text-muted">
            we&apos;re cooking something unhinged
          </p>
        </div>
      </section>

      {/* Detail sheet */}
      {detailEvent && (
        <EventDetail
          event={detailEvent}
          onClose={() => setDetailEvent(null)}
          onRsvp={() => handleRsvp(detailEvent)}
          loading={rsvpLoading}
        />
      )}
    </div>
  );
}
