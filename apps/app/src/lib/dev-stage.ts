// Dev-only stage override. Lets you preview post-event screens (memories,
// reconnect) without going through the full event/ticket/check-in pipeline.
//
// Activate by appending `?devStage=memories&mock=1` (or `reconnect`) to the URL
// in development. Disabled in production builds.

import { SIGNS, getMatchLabel, type SignKey } from "@comeoffline/types";
import type { Event, Memories } from "@comeoffline/types";

export type DevStage = "memories" | "reconnect";

interface DevOverride {
  stage: DevStage;
  mock: boolean;
}

// Cached at module load so the override survives `history.replaceState` calls
// (useNavigationHistory rewrites the URL to "/" on mount, which would otherwise
// erase the param before strict-mode's second render reads it).
let cached: DevOverride | null | undefined;

export function getDevStageOverride(): DevOverride | null {
  if (process.env.NODE_ENV === "production") return null;
  if (typeof window === "undefined") return null;
  if (cached !== undefined) return cached;

  const params = new URLSearchParams(window.location.search);
  const stage = params.get("devStage");
  if (stage !== "memories" && stage !== "reconnect") {
    cached = null;
    return null;
  }

  cached = { stage, mock: params.get("mock") === "1" };
  return cached;
}

export const MOCK_EVENT: Event = {
  id: "dev-mock-event",
  title: "rooftop sundowner",
  tagline: "phones in pouches, golden hour, strangers becoming",
  description: "a dev-mode preview event for the memories + reconnect screens.",
  date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  time: "6:30 PM",
  total_spots: 40,
  spots_taken: 32,
  accent: "#D4A574",
  accent_dark: "#8B6F47",
  emoji: "🌅",
  tag: "sundowner",
  zones: [],
  dress_code: "easy linen",
  includes: ["welcome drink", "polaroid wall", "playlist"],
  venue_reveal_date: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
  pickup_points: [],
  status: "completed",
};

export const MOCK_MEMORIES: Memories = {
  stats: { attended: 32, phones: 32, drinks: 87, hours: "4.5" },
  polaroids: [
    {
      id: "p1",
      url: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=600",
      caption: "the moment the music dropped",
      who: "shot by maya",
      color: "#D4A574",
      rotation: -2,
    },
    {
      id: "p2",
      url: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=600",
      caption: "strangers, then not",
      who: "shot by ravi",
      color: "#8B6F47",
      rotation: 3,
    },
    {
      id: "p3",
      url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600",
      caption: "golden hour did its thing",
      who: "shot by anjali",
      color: "#C97B5C",
      rotation: -1,
    },
    {
      id: "p4",
      url: "https://images.unsplash.com/photo-1469371670807-013ccf25f16a?w=600",
      caption: "rooftop confessions",
      who: "shot by kabir",
      color: "#A8956C",
      rotation: 2,
    },
  ],
  quotes: [
    {
      id: "q1",
      quote: "i haven't laughed this hard sober in years",
      context: "overheard near the bar",
    },
    {
      id: "q2",
      quote: "wait, you're the one who wrote that essay?",
      context: "near the polaroid wall",
    },
    {
      id: "q3",
      quote: "this is the first time my phone hasn't buzzed and i don't hate it",
      context: "during the second pour",
    },
  ],
};

export interface MockAttendee {
  id: string;
  name: string;
  handle: string;
  vibe_tag: string;
  instagram_handle?: string;
  connected: boolean;
  mutual: boolean;
  sign?: string;
  sign_emoji?: string;
  sign_label?: string;
  sign_color?: string;
  compat_score?: number;
  compat_label?: string;
  compat_emoji?: string;
}

function buildAttendee(
  id: string,
  name: string,
  handle: string,
  vibe: string,
  signKey: SignKey,
  score: number,
  state: "fresh" | "sent" | "mutual",
  ig?: string,
): MockAttendee {
  const sign = SIGNS[signKey];
  const match = getMatchLabel(score);
  return {
    id,
    name,
    handle,
    vibe_tag: vibe,
    instagram_handle: state === "mutual" ? ig : undefined,
    connected: state !== "fresh",
    mutual: state === "mutual",
    sign: signKey,
    sign_emoji: sign.emoji,
    sign_label: sign.name,
    sign_color: sign.color,
    compat_score: score,
    compat_label: match.text,
    compat_emoji: match.emoji,
  };
}

export const MOCK_ATTENDEES: MockAttendee[] = [
  buildAttendee("u1", "maya", "maya.k", "writer + thrifter", "labrador", 92, "fresh"),
  buildAttendee("u2", "ravi", "ravi", "filmmaker", "cat", 78, "sent"),
  buildAttendee("u3", "anjali", "anj", "designer", "mynah", 85, "mutual", "anj.designs"),
  buildAttendee("u4", "kabir", "kabir.b", "founder", "peacock", 64, "fresh"),
  buildAttendee("u5", "tara", "tara_k", "musician", "redpanda", 71, "fresh"),
  buildAttendee("u6", "arjun", "arj", "dev + dj", "bandar", 58, "sent"),
];
