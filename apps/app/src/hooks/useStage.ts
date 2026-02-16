"use client";

import { useEffect, useRef } from "react";
import { useAppStore, type AppStage } from "@/store/useAppStore";
import type { Event, RSVP, Ticket } from "@comeoffline/types";

/**
 * Determines the correct app stage based on auth state, active RSVP/ticket, and event dates.
 * Polls every 60s to handle time-based transitions (countdown->reveal->dayof).
 */
export function useStage() {
  const { user, currentEvent, activeRsvp, activeTicket, stage, setStage } = useAppStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    function recalculate() {
      if (!user) {
        setStage("gate");
        return;
      }

      if (!user.has_seen_welcome) {
        setStage("accepted");
        return;
      }

      // Manual stages that shouldn't be auto-overridden
      if (["profile", "vouch", "poll"].includes(stage)) return;

      // If user has neither RSVP nor ticket for any event, show feed
      if (!currentEvent || (!activeRsvp && !activeTicket)) {
        // Don't override feed if we're already on feed
        if (stage !== "feed") setStage("feed");
        return;
      }

      const eventStage = determineEventStage(currentEvent, activeRsvp, activeTicket);
      if (eventStage !== stage) {
        setStage(eventStage);
      }
    }

    recalculate();

    // Poll every 60s for time-based transitions
    intervalRef.current = setInterval(recalculate, 60_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user, currentEvent, activeRsvp, activeTicket, stage, setStage]);

  return stage;
}

function determineEventStage(
  event: Event,
  rsvp: RSVP | null,
  ticket: Ticket | null,
): AppStage {
  // Check cancellation
  if (rsvp?.status === "cancelled" && !ticket) return "feed";
  if (ticket?.status === "cancelled" && !rsvp) return "feed";

  const now = new Date();
  const eventDate = new Date(event.date);
  const venueRevealDate = new Date(event.venue_reveal_date);

  // Post-event: memories + reconnect window
  if (rsvp?.status === "attended" || ticket?.status === "checked_in") {
    return "memories";
  }

  const dayAfter = new Date(eventDate);
  dayAfter.setDate(dayAfter.getDate() + 1);
  if (now > dayAfter) return "memories";

  // Event day
  if (isSameDay(now, eventDate)) {
    if (event.status === "live") return "godark";
    return "dayof";
  }

  // Venue revealed
  if (now >= venueRevealDate) return "reveal";

  // Waiting for event
  return "countdown";
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
