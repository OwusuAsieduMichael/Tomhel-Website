import type { Metadata } from "next";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { Container, Section } from "@/components/layout/container";
import { BelowHeroShell } from "@/components/layout/below-hero-shell";
import { PageHero } from "@/components/layout/page-hero";
import { FadeIn } from "@/components/motion/fade-in";
import { ContactForm } from "@/components/forms/contact-form";
import { siteConfig } from "@/lib/constants";
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
        description="Whether you're exploring admissions, scheduling a visit, or have a question — our team is here to help."
      />

      <BelowHeroShell>
      <Section>
        <Container>
          <div className="grid gap-16 lg:grid-cols-2">
            <FadeIn>
              <h2 className="text-2xl font-bold text-primary">Send us a message</h2>
              <p className="mt-4 text-muted">Fill out the form and we&apos;ll respond within 1–2 business days.</p>
              <div className="mt-8 rounded-2xl border border-border bg-card p-6 md:p-8">
                <ContactForm />
              </div>
            </FadeIn>

            <FadeIn delay={0.1}>
              <h2 className="text-2xl font-bold text-primary">Contact Information</h2>
              <ul className="mt-8 space-y-6">
                <li className="flex items-start gap-4">
                  <MapPin className="mt-1 h-5 w-5 shrink-0 text-accent" aria-hidden />
                  <div>
                    <p className="font-medium text-primary">Address</p>
                    <p className="mt-1 text-muted">{siteConfig.address}</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <Phone className="mt-1 h-5 w-5 shrink-0 text-accent" aria-hidden />
                  <div>
                    <p className="font-medium text-primary">Phone</p>
                    <a href={`tel:${siteConfig.phoneHref}`} className="mt-1 block text-muted hover:text-accent">
                      {siteConfig.phone}
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <Mail className="mt-1 h-5 w-5 shrink-0 text-accent" aria-hidden />
                  <div>
                    <p className="font-medium text-primary">Email</p>
                    <a href={`mailto:${siteConfig.email}`} className="mt-1 block text-muted hover:text-accent">
                      {siteConfig.email}
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <Clock className="mt-1 h-5 w-5 shrink-0 text-accent" aria-hidden />
                  <div>
                    <p className="font-medium text-primary">Office Hours</p>
                    <p className="mt-1 text-muted">{siteConfig.officeHours}</p>
                  </div>
                </li>
              </ul>

              <div className="mt-10 overflow-hidden rounded-2xl border border-border">
                <iframe
                  title="Tomhel Preparatory School location map"
                  src="https://maps.google.com/maps?q=Effiduasi%2C%20Ashanti%20Region%2C%20Ghana&output=embed"
                  className="h-64 w-full border-0 md:h-80"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </FadeIn>
          </div>
        </Container>
      </Section>
      </BelowHeroShell>
    </>
  );
}
