import { BrandsHero } from "@/components/brands/BrandsHero";
import { BrandsMarquee } from "@/components/brands/BrandsMarquee";
import { TheExperience } from "@/components/brands/TheExperience";
import { BrandFormats } from "@/components/brands/BrandFormats";
import { WhyUs } from "@/components/brands/WhyUs";
import { BrandProof } from "@/components/brands/BrandProof";
import { BrandForm } from "@/components/brands/BrandForm";
import { BrandsFooterCTA } from "@/components/brands/BrandsFooterCTA";
import { Footer } from "@/components/shared/Footer";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "for brands — come offline.",
  description: "Partner with come offline. to create authentic, phone-free brand experiences in Bangalore.",
  openGraph: {
    title: "for brands — come offline.",
    description: "Partner with come offline. to create authentic, phone-free brand experiences in Bangalore.",
    url: "https://comeoffline.com/brands",
    siteName: "come offline.",
    images: [{ url: "/Comeoffline socials.png", width: 1200, height: 630, alt: "come offline. — brand partnerships" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "for brands — come offline.",
    description: "Partner with come offline. to create authentic, phone-free brand experiences in Bangalore.",
    images: ["/Comeoffline socials.png"],
  },
  alternates: {
    canonical: "https://comeoffline.com/brands",
  },
};

export default function BrandsPage() {
  return (
    <>
      <BrandsHero />
      <BrandsMarquee />
      <TheExperience />
      <BrandFormats />
      <WhyUs />
      <BrandProof />
      <BrandForm />
      <BrandsFooterCTA />
      <Footer />
    </>
  );
}
