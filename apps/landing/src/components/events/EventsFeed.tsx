"use client";

import { useState } from "react";
import { FeedEventCard } from "@/components/events/FeedEventCard";
import { FeedEventDetail } from "@/components/events/FeedEventDetail";

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

  return (
    <>
      {events.map((e, i) => (
        <FeedEventCard key={e.id} event={e} index={i} onOpen={setDetailEvent} />
      ))}
      {detailEvent && (
        <FeedEventDetail event={detailEvent} onClose={() => setDetailEvent(null)} />
      )}
    </>
  );
}
