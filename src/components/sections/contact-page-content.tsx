"use client";

import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { Container, Section } from "@/components/layout/container";
import { FadeIn } from "@/components/motion/fade-in";
import { ContactForm } from "@/components/forms/contact-form";
import { VisitRequestForm } from "@/components/forms/visit-request-form";
import { PhoneLinks } from "@/components/layout/phone-links";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { siteConfig } from "@/lib/constants";

export function ContactPageContent() {
  return (
    <Section>
      <Container>
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
          <FadeIn>
            <div className="surface-card relative h-full md:p-8">
              <Tabs defaultValue="message" className="w-full">
                <TabsList className="mb-8 grid w-full grid-cols-2">
                  <TabsTrigger value="message">Send a Message</TabsTrigger>
                  <TabsTrigger value="visit">Schedule a Visit</TabsTrigger>
                </TabsList>
                <TabsContent value="message" className="mt-0">
                  <h2 className="text-2xl font-bold text-primary">Send us a message</h2>
                  <p className="mt-4 text-deep">
                    Fill out the form and we&apos;ll respond within 1 to 2 business days.
                  </p>
                  <div className="mt-8">
                    <ContactForm />
                  </div>
                </TabsContent>
                <TabsContent value="visit" className="mt-0">
                  <h2 className="text-2xl font-bold text-primary">Schedule a campus visit</h2>
                  <p className="mt-4 text-deep">
                    Tour our facilities, meet our team, and experience the Tomhel community firsthand.
                  </p>
                  <div className="mt-8">
                    <VisitRequestForm />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </FadeIn>

          <FadeIn delay={0.1}>
            <div className="surface-card h-full md:p-8">
              <h2 className="text-2xl font-bold text-primary">Contact Information</h2>
              <ul className="mt-8 space-y-6">
                <li className="flex items-start gap-4">
                  <MapPin className="mt-1 h-5 w-5 shrink-0 text-taim-dark" aria-hidden />
                  <div>
                    <p className="font-medium text-primary">Address</p>
                    <p className="mt-1 text-deep">{siteConfig.poBox}</p>
                    <p className="text-deep">
                      {siteConfig.addressLocality}, {siteConfig.addressRegion}, Ghana
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <Phone className="mt-1 h-5 w-5 shrink-0 text-taim-dark" aria-hidden />
                  <div>
                    <p className="font-medium text-primary">Phone</p>
                    <PhoneLinks className="mt-1" linkClassName="text-deep hover:text-accent" />
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <Mail className="mt-1 h-5 w-5 shrink-0 text-taim-dark" aria-hidden />
                  <div>
                    <p className="font-medium text-primary">Email</p>
                    <a href={`mailto:${siteConfig.email}`} className="mt-1 block text-deep hover:text-accent">
                      {siteConfig.email}
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <Clock className="mt-1 h-5 w-5 shrink-0 text-taim-dark" aria-hidden />
                  <div>
                    <p className="font-medium text-primary">Office Hours</p>
                    <p className="mt-1 text-deep">{siteConfig.officeHours}</p>
                  </div>
                </li>
              </ul>

              <div className="mt-10 overflow-hidden rounded-xl border border-black/[0.06] shadow-sm">
                <iframe
                  title="Tomhel Preparatory School location map"
                  src="https://maps.google.com/maps?q=Effiduasi%2C%20Ashanti%20Region%2C%20Ghana&output=embed"
                  className="h-64 w-full border-0 md:h-80"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          </FadeIn>
        </div>
      </Container>
    </Section>
  );
}
