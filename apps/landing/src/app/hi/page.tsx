import { Suspense } from "react";
import { PosterLanding } from "./PosterLanding";
import { DEFAULT_CAMPAIGN } from "@/lib/posterCampaigns";
import { getPosterDates, campaignMetadata } from "@/lib/posterCampaigns/server";

// The default campaign keeps the bare /hi route — its printed QRs encode it
// directly. Other campaigns live at /hi/<slug>.
export const metadata = campaignMetadata(DEFAULT_CAMPAIGN, "/hi");

export default async function HiPage() {
  const dates = await getPosterDates(DEFAULT_CAMPAIGN);
  return (
    <Suspense>
      <PosterLanding campaignSlug={DEFAULT_CAMPAIGN.slug} dates={dates} />
    </Suspense>
  );
}
