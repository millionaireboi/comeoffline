import type { PosterCampaignConfig } from "./types";
import { friendsHouse } from "./friends-house";

export type { PosterCampaignConfig, PosterBeat, PosterChoice, HouseCopy } from "./types";

/**
 * Every live guerrilla campaign, keyed by slug. Register a new campaign here
 * and it's served at /hi/<slug> — then mint its QR codes as /l/<code> short
 * links (admin → links tab) pointing at /hi/<slug>?p=<placement>.
 */
export const POSTER_CAMPAIGNS: Record<string, PosterCampaignConfig> = {
  [friendsHouse.slug]: friendsHouse,
};

/** The campaign served at the bare /hi route — its printed QRs encode that
 *  path directly, so it must keep answering there. */
export const DEFAULT_CAMPAIGN = friendsHouse;

export function getCampaign(slug: string): PosterCampaignConfig | null {
  return POSTER_CAMPAIGNS[slug] ?? null;
}
