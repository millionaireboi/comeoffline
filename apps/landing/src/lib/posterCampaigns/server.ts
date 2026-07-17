import type { Metadata } from "next";
import { formatEventDateShort } from "@comeoffline/ui";
import type { PosterCampaignConfig } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

/** One pickable edition of a series campaign — serializable, so it can cross
 *  the RSC boundary into PosterLanding. */
export interface PosterDateOption {
  id: string;
  /** ISO date, for ordering */
  date: string;
  /** "sat, 18 jul · 6–10 pm" — formatted server-side */
  dateLabel: string;
  spotsLeft: number;
  totalSpots: number;
  soldOut: boolean;
  /** The single live tier, when there's exactly one — preselected in the handoff */
  tier: { id: string; label: string; price: number } | null;
}

interface PublicTier {
  id: string;
  label: string;
  price: number;
  sold_out: boolean;
}

interface PublicEvent {
  id: string;
  title?: string;
  date?: string;
  time?: string;
  status?: string;
  total_spots?: number;
  spots_taken?: number;
  ticketing?: { enabled?: boolean; tiers?: PublicTier[] };
}

function toDateOption(e: PublicEvent): PosterDateOption {
  const tiers: PublicTier[] = e.ticketing?.enabled ? (e.ticketing.tiers ?? []) : [];
  const available = tiers.filter((t) => !t.sold_out);
  const tier = available.length === 1 ? available[0] : null;
  const spotsLeft = Math.max(0, (e.total_spots ?? 0) - (e.spots_taken ?? 0));
  return {
    id: e.id,
    date: e.date ?? "",
    dateLabel: e.date ? formatEventDateShort(e.date, e.time) : "",
    spotsLeft,
    totalSpots: e.total_spots ?? 0,
    soldOut: e.status === "sold_out" || spotsLeft <= 0,
    tier: tier ? { id: tier.id, label: tier.label, price: tier.price } : null,
  };
}

/** Live upcoming dates for a campaign. Series campaigns list every event
 *  whose title matches; otherwise (or when the series turns up nothing) the
 *  pinned eventId is fetched alone. A poster scan must never 404 or error,
 *  so every failure path degrades to [] and the campaign's static copy. */
export async function getPosterDates(campaign: PosterCampaignConfig): Promise<PosterDateOption[]> {
  if (campaign.series) {
    try {
      const res = await fetch(`${API_URL}/api/events/public`, { next: { revalidate: 60 } });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          const needle = campaign.series.titleMatch.toLowerCase();
          const matches = (data.data as PublicEvent[])
            .filter((e) => (e.title ?? "").toLowerCase().includes(needle))
            .map(toDateOption);
          if (matches.length > 0) return matches;
        }
      }
    } catch {
      // fall through to the pinned event
    }
  }
  const single = await getPosterEventInfo(campaign.eventId);
  return single ? [single] : [];
}

/** Live info for a single pinned event, in date-option shape. */
async function getPosterEventInfo(eventId: string): Promise<PosterDateOption | null> {
  if (!eventId) return null;
  try {
    const res = await fetch(`${API_URL}/api/events/public/${eventId}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.success) return null;
    return toDateOption(data.data as PublicEvent);
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
