import type { Metadata } from "next";
import { Suspense } from "react";
import { PosterLanding, type PosterEventInfo } from "./PosterLanding";
import { POSTER_EVENT_ID } from "@/lib/posterCampaign";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export const metadata: Metadata = {
  title: "friends house — come offline",
  description:
    "the friend's place you don't have yet. a house, a saturday night, board games, a jam corner, snacks all night. byob. everyone walks in solo — that's the point.",
  openGraph: {
    title: "🏠 friends house",
    description: "not a meetup, not networking, not a dating thing. just the friend's place you don't have yet.",
    url: "https://comeoffline.com/hi",
    siteName: "come offline.",
    type: "website",
    images: [{ url: "/Comeoffline socials.png", width: 1200, height: 630, alt: "friends house — come offline" }],
  },
  alternates: {
    canonical: "https://comeoffline.com/hi",
  },
};

/** Live spots for scarcity in the CTA. A poster scan must never 404 or error,
 *  so every failure path degrades to the static campaign copy. */
async function getEventInfo(): Promise<PosterEventInfo | null> {
  if (!POSTER_EVENT_ID) return null;
  try {
    const res = await fetch(`${API_URL}/api/events/public/${POSTER_EVENT_ID}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.success) return null;
    // Single live tier → preselect it in the handoff so the app skips tier picking
    interface Tier { id: string; label: string; price: number; sold_out: boolean }
    const tiers: Tier[] = data.data.ticketing?.enabled ? (data.data.ticketing.tiers ?? []) : [];
    const available = tiers.filter((t) => !t.sold_out);
    const tier = available.length === 1 ? available[0] : null;
    return {
      id: data.data.id,
      spotsLeft: Math.max(0, (data.data.total_spots ?? 0) - (data.data.spots_taken ?? 0)),
      totalSpots: data.data.total_spots ?? 0,
      tier: tier ? { id: tier.id, label: tier.label, price: tier.price } : null,
    };
  } catch {
    return null;
  }
}

export default async function HiPage() {
  const event = await getEventInfo();
  return (
    <Suspense>
      <PosterLanding event={event} />
    </Suspense>
  );
}
