import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { PosterLanding } from "../PosterLanding";
import { getCampaign, POSTER_CAMPAIGNS } from "@/lib/posterCampaigns";
import { getPosterDates, campaignMetadata } from "@/lib/posterCampaigns/server";

/** /hi/<slug> — one route per registered guerrilla campaign. */

export function generateStaticParams() {
  return Object.keys(POSTER_CAMPAIGNS).map((campaign) => ({ campaign }));
}

export async function generateMetadata({ params }: { params: Promise<{ campaign: string }> }): Promise<Metadata> {
  const { campaign: slug } = await params;
  const campaign = getCampaign(slug);
  if (!campaign) return {};
  return campaignMetadata(campaign, `/hi/${campaign.slug}`);
}

export default async function CampaignPage({ params }: { params: Promise<{ campaign: string }> }) {
  const { campaign: slug } = await params;
  const campaign = getCampaign(slug);
  // A printed QR must never dead-end — retired/typo'd slugs go home, tagged
  // as poster traffic (same fallback as /l/<code>)
  if (!campaign) redirect("/?utm_source=poster&utm_medium=offline");

  const dates = await getPosterDates(campaign);
  return (
    <Suspense>
      <PosterLanding campaignSlug={campaign.slug} dates={dates} />
    </Suspense>
  );
}
