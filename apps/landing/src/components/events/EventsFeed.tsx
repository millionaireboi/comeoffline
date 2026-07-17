"use client";

import { useState } from "react";
import { FeedEventCard } from "@/components/events/FeedEventCard";
import { FeedEventDetail } from "@/components/events/FeedEventDetail";
import { groupSeries, seriesSiblings } from "@/lib/series";

interface PublicEvent {
  id: string;
  title: string;
  tagline: string;
  description: string;
  date: string;
  time: string;
  total_spots: number;
  spots_taken: number;
  accent: string;
  accent_dark: string;
  emoji: string;
  tag: string;
  zones: { name: string; icon: string; desc: string }[];
  dress_code: string;
  includes: string[];
  venue_reveal_date?: string;
  status: string;
}

export function EventsFeed({ events }: { events: PublicEvent[] }) {
  const [detailEvent, setDetailEvent] = useState<PublicEvent | null>(null);

  // One card per series — "friends house" with 3 dates is one listing, not
  // three. The card shows the earliest open date; the sheet offers them all.
  const groups = groupSeries(events);

  return (
    <>
      {groups.map((g, i) => (
        <FeedEventCard
          key={g.event.id}
          event={g.event}
          index={i}
          dateCount={g.siblings.length}
          onOpen={setDetailEvent}
        />
      ))}
      {detailEvent && (
        <FeedEventDetail
          // Remount on date switch so tier selection + analytics reset for the new event
          key={detailEvent.id}
          event={detailEvent}
          siblings={seriesSiblings(detailEvent, events)}
          onSwitchEvent={(e) => setDetailEvent(e as PublicEvent)}
          onClose={() => setDetailEvent(null)}
        />
      )}
    </>
  );
}
