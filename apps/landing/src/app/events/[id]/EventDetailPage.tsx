"use client";

import { useRouter } from "next/navigation";
import { FeedEventDetail } from "@/components/events/FeedEventDetail";

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
