import type { Metadata } from "next";
import { Container, Section } from "@/components/layout/container";
import { BelowHeroShell } from "@/components/layout/below-hero-shell";
import { PageHero } from "@/components/layout/page-hero";
import { AdmissionsCTA } from "@/components/sections/admissions-cta";
import { FadeIn } from "@/components/motion/fade-in";
import { ApplicationForm } from "@/components/forms/application-form";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { admissionFaqs, admissionSteps } from "@/lib/constants";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Admissions",
  description:
    "Apply to Tomhel Preparatory School. Learn about our admission process, requirements, and submit your application online.",
  path: "/admissions",
});

const requirements = [
  "Completed application form",
  "Birth certificate (copy)",
  "Passport-sized photographs (2)",
  "Previous school report card (if applicable)",
  "Immunization records",
  "Parent/guardian national ID (copy)",
];

export default function AdmissionsPage() {
  return (
    <>
      <PageHero
        eyebrow="Admissions"
        title="Join the Tomhel family"
        description="We welcome applications for Kindergarten through Junior High School. Limited spaces available — apply early to secure your place."
      />

      <BelowHeroShell>
      <Section>
        <Container>
          <FadeIn>
            <h2 className="text-3xl font-bold tracking-tight text-primary md:text-4xl">Admission Process</h2>
            <p className="mt-4 max-w-2xl text-lg text-muted">
              Our streamlined process ensures a smooth experience from inquiry to enrollment.
            </p>
          </FadeIn>
          <div className="mt-12 grid gap-6 md:grid-cols-5">
            {admissionSteps.map((step, index) => (
              <FadeIn key={step.step} delay={index * 0.08}>
                <div className="relative rounded-2xl border border-border p-6">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
                    {step.step}
                  </span>
                  <h3 className="mt-4 font-semibold text-primary">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{step.description}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </Container>
      </Section>

      <Section surface>
        <Container>
          <div className="grid gap-16 lg:grid-cols-2">
            <FadeIn>
              <h2 className="text-3xl font-bold tracking-tight text-primary">Requirements</h2>
              <ul className="mt-6 space-y-3">
                {requirements.map((req) => (
                  <li key={req} className="flex items-start gap-3 text-muted">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                    {req}
                  </li>
                ))}
              </ul>
            </FadeIn>
            <FadeIn delay={0.1}>
              <h2 className="text-3xl font-bold tracking-tight text-primary">Application Form</h2>
              <p className="mt-4 text-muted">Complete the form below to begin your application.</p>
              <div className="mt-8 rounded-2xl border border-border bg-card p-6 md:p-8">
                <ApplicationForm />
              </div>
            </FadeIn>
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <FadeIn>
            <h2 className="text-3xl font-bold tracking-tight text-primary md:text-4xl">Frequently Asked Questions</h2>
          </FadeIn>
          <Accordion type="single" collapsible className="mt-8 max-w-3xl">
            {admissionFaqs.map((faq, index) => (
              <AccordionItem key={index} value={`faq-${index}`}>
                <AccordionTrigger>{faq.question}</AccordionTrigger>
                <AccordionContent>{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Container>
      </Section>

      <AdmissionsCTA />
      </BelowHeroShell>
    </>
  );
}
