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

interface EventDetailPageProps {
  event: {
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
    ticketing?: {
      enabled: boolean;
      tiers: PublicEventTier[];
      max_per_user?: number;
    };
  };
}

export function EventDetailPage({ event }: EventDetailPageProps) {
  const router = useRouter();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#FAF6F0",
      }}
    >
      <FeedEventDetail
        event={event}
        onClose={() => router.push("/events")}
      />
    </div>
  );
}
