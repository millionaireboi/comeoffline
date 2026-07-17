"use client";

import { useRouter } from "next/navigation";
import { FeedEventDetail } from "@/components/events/FeedEventDetail";

interface PublicEventTier {
  id: string;
  label: string;
  price: number;
  description?: string;
  deadline?: string;
  opens_at?: string;
  per_person?: number;
  sold_out: boolean;
  low_stock: boolean;
}

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
  cover_url?: string;
  cover_type?: "image" | "video";
  gallery_urls?: string[];
  past_photos?: { url: string; caption?: string }[];
  ticketing?: {
    enabled: boolean;
    tiers: PublicEventTier[];
    max_per_user?: number;
  };
}

interface EventDetailPageProps {
  event: PublicEvent;
  /** Other editions of the same series (event included), for the date row */
  siblings?: PublicEvent[];
}

export function EventDetailPage({ event, siblings }: EventDetailPageProps) {
  const router = useRouter();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#FAF6F0",
      }}
    >
      <FeedEventDetail
        // Inline (no portal): the sheet IS this page — keeps the event in the
        // SSR HTML and avoids the server-null/client-portal hydration mismatch
        inline
        event={event}
        siblings={siblings}
        onSwitchEvent={(e) => router.push(`/events/${e.id}`)}
        onClose={() => router.push("/events")}
      />
    </div>
  );
}
