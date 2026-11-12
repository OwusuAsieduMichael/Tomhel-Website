import type { Metadata } from "next";
import { BelowHeroShell } from "@/components/layout/below-hero-shell";
import { PageHero } from "@/components/layout/page-hero";
import { ContactPageContent } from "@/components/sections/contact-page-content";
import { schoolImages } from "@/lib/constants";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Contact",
  description: "Get in touch with Tomhel Preparatory School. Contact form, phone, email, location, and office hours.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="We'd love to hear from you"
        description="Whether you're exploring admissions, scheduling a visit, or have a question, our team is here to help."
        backgroundImage={schoolImages.contactHero}
      />

      <BelowHeroShell>
        <ContactPageContent />
      </BelowHeroShell>
    </>
  );
}
