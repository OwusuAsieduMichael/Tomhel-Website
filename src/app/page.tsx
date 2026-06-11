import type { Metadata } from "next";
import { AdmissionsCTA } from "@/components/sections/admissions-cta";
import { FacilitiesSection } from "@/components/sections/facilities-section";
import { HeadmasterWelcomeSection } from "@/components/sections/headmaster-welcome-section";
import { HeroSection } from "@/components/sections/hero-section";
import { BelowHeroShell } from "@/components/layout/below-hero-shell";
import { NewsPreview } from "@/components/sections/news-preview";
import { PillarsSection } from "@/components/sections/pillars-section";
import { ProgramsSection } from "@/components/sections/programs-section";
import { StatsSection } from "@/components/sections/stats-section";
import { TestimonialsSection } from "@/components/sections/testimonials-section";
import { siteConfig } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Home",
  description: siteConfig.description,
  openGraph: {
    title: `${siteConfig.name} — ${siteConfig.slogan}`,
    description: siteConfig.description,
  },
};

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <BelowHeroShell>
      <HeadmasterWelcomeSection />
      <PillarsSection />
      <StatsSection />
      <ProgramsSection />
      <FacilitiesSection />
      <TestimonialsSection />
      <NewsPreview />
      <AdmissionsCTA />
      </BelowHeroShell>
    </>
  );
}
