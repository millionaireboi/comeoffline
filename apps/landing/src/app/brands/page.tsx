import { BrandsHero } from "@/components/brands/BrandsHero";
import { BrandsMarquee } from "@/components/brands/BrandsMarquee";
import { TheExperience } from "@/components/brands/TheExperience";
import { BrandFormats } from "@/components/brands/BrandFormats";
import { WhyUs } from "@/components/brands/WhyUs";
import { BrandProof } from "@/components/brands/BrandProof";
import { BrandForm } from "@/components/brands/BrandForm";
import { BrandsFooterCTA } from "@/components/brands/BrandsFooterCTA";
import { Footer } from "@/components/shared/Footer";

export const dynamic = "force-dynamic";

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
