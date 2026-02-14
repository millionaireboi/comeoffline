"use client";

import { useEffect } from "react";
import { useAppStore, type AppStage } from "@/store/useAppStore";
import type { Event, RSVP } from "@comeoffline/types";

/**
 * Determines the correct app stage based on auth state, active RSVP, and event dates.
 * Call this after auth is loaded and we know the user/rsvp/event state.
 */
export function useStage() {
  const { user, currentEvent, activeRsvp, stage, setStage } = useAppStore();

  useEffect(() => {
    if (!user) {
      setStage("gate");
      return;
    }

    if (!user.has_seen_welcome) {
      setStage("accepted");
      return;
    }

    if (!activeRsvp || !currentEvent) {
      setStage("feed");
      return;
    }

    const eventStage = determineEventStage(currentEvent, activeRsvp);
    setStage(eventStage);
  }, [user, currentEvent, activeRsvp, setStage]);

  return stage;
}

function determineEventStage(event: Event, rsvp: RSVP): AppStage {
  if (rsvp.status === "cancelled") return "feed";

  const now = new Date();
  const eventDate = new Date(event.date);
  const venueRevealDate = new Date(event.venue_reveal_date);

  // Post-event stages
  if (rsvp.status === "attended") return "memories";

  // Event is in the past but not yet marked attended
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
