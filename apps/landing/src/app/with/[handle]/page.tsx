import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { CreatorLanding } from "./CreatorLanding";
import { CREATORS } from "@/lib/creators";
import { getCreatorEvents, resolveCreator } from "@/lib/creators/server";

/** /with/<handle> — one route per onboarded creator (their bio link).
 *  Creators resolve from Firestore first (admin → creators tab, no deploy),
 *  then the code registry; unknown handles fall through to home. */

export function generateStaticParams() {
  // Registry handles prebuild; Firestore-onboarded creators render on demand
  return Object.keys(CREATORS).map((handle) => ({ handle }));
}

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params;
  const creator = await resolveCreator(handle);
  if (!creator) return {};
  const url = `https://www.comeoffline.com/with/${creator.handle}`;
  return {
    title: creator.meta.title,
    description: creator.meta.description,
    openGraph: {
      title: creator.meta.title,
      description: creator.meta.description,
      url,
      siteName: "come offline.",
      type: "website",
      images: [{ url: "/Comeoffline socials.png", width: 1200, height: 630, alt: creator.meta.title }],
    },
    alternates: { canonical: url },
  };
}

export default async function CreatorPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const creator = await resolveCreator(handle);
  // A printed bio link must never dead-end — retired/typo'd handles go home,
  // still tagged as creator traffic (same fallback rule as /hi and /l)
  if (!creator) redirect("/?utm_source=creator&utm_medium=social");

  const events = await getCreatorEvents(creator);
  return (
    <Suspense>
      <CreatorLanding config={creator} events={events} />
    </Suspense>
  );
}
