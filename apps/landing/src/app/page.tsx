import { Hero } from "@/components/consumer/Hero";
import { MarqueeSection } from "@/components/consumer/MarqueeSection";
import { WhatIsThis } from "@/components/consumer/WhatIsThis";
import { HowItWorks } from "@/components/consumer/HowItWorks";
import { GoldenTicket } from "@/components/consumer/GoldenTicket";
import { StatsStripe } from "@/components/consumer/StatsStripe";
import { Overheard } from "@/components/consumer/Overheard";
import { Events } from "@/components/consumer/Events";
import { FinalCTA } from "@/components/consumer/FinalCTA";
import { Footer } from "@/components/shared/Footer";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <>
      <Hero />
      <MarqueeSection />
      <WhatIsThis />
      <HowItWorks />
      <GoldenTicket />
      <StatsStripe />
      <Overheard />
      <Events />
      <FinalCTA />
      <Footer />
    </>
  );
}
