import type { Metadata } from "next";
import type { PosterCampaignConfig } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export interface PosterEventInfo {
  id: string;
  spotsLeft: number;
  totalSpots: number;
  /** The single live tier, when there's exactly one — preselected in the handoff */
  tier: { id: string; label: string; price: number } | null;
}

/** Live spots for scarcity in the CTA. A poster scan must never 404 or error,
 *  so every failure path degrades to the campaign's static copy. */
export async function getPosterEventInfo(eventId: string): Promise<PosterEventInfo | null> {
  if (!eventId) return null;
  try {
    const res = await fetch(`${API_URL}/api/events/public/${eventId}`, {
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

/** Page metadata for a campaign. `path` is the route it's served at —
 *  "/hi" for the default campaign, "/hi/<slug>" otherwise. */
export function campaignMetadata(campaign: PosterCampaignConfig, path: string): Metadata {
  // www is the served domain (bare domain 307s to it) — canonicals should match
  const url = `https://www.comeoffline.com${path}`;
  return {
    title: campaign.meta.title,
    description: campaign.meta.description,
    openGraph: {
      title: campaign.meta.ogTitle,
      description: campaign.meta.ogDescription,
      url,
      siteName: "come offline.",
      type: "website",
      images: [{ url: "/Comeoffline socials.png", width: 1200, height: 630, alt: campaign.meta.title }],
    },
    alternates: {
      canonical: url,
    },
  };
}
