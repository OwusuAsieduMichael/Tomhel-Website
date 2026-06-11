import type { Metadata } from "next";
import Image from "next/image";
import { Container, Section } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { FadeIn } from "@/components/motion/fade-in";
import { coreValues, historyTimeline, leadership, schoolImages } from "@/lib/constants";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "About",
  description:
    "Discover Tomhel Preparatory School's story, mission, vision, core values, leadership team, and history of excellence in Ghana.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About Us"
        title="A legacy of excellence in education"
        description="Since 2010, Tomhel Preparatory School has been dedicated to nurturing academic excellence, character, and leadership in every student."
      />

      <Section>
        <Container>
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <FadeIn>
              <h2 className="text-3xl font-bold tracking-tight text-primary md:text-4xl">Our Story</h2>
              <div className="mt-6 space-y-4 text-lg leading-relaxed text-muted">
                <p>
                  Tomhel Preparatory School was founded with a clear vision: to provide quality education that
                  nurtures the whole child — academically, morally, and socially.
                </p>
                <p>
                  What began as a small community school in Effiduasi has grown into one of the Ashanti Region&apos;s most
                  respected preparatory institutions, serving students from Kindergarten through Junior High School.
                </p>
                <p>
                  Today, we combine traditional values of discipline and excellence with modern learning tools like
                  the TAIM platform, preparing students not just for exams, but for life.
                </p>
              </div>
            </FadeIn>
            <FadeIn delay={0.1}>
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
                <Image
                  src={schoolImages.hero}
                  alt="Tomhel Preparatory School campus"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </FadeIn>
          </div>
        </Container>
      </Section>

      <Section surface>
        <Container>
          <div className="grid gap-12 md:grid-cols-2">
            <FadeIn>
              <h2 className="text-2xl font-bold text-primary md:text-3xl">Mission</h2>
              <p className="mt-4 text-lg leading-relaxed text-muted">
                Provide quality education that nurtures academic excellence, character development, leadership,
                creativity, and lifelong learning.
              </p>
            </FadeIn>
            <FadeIn delay={0.1}>
              <h2 className="text-2xl font-bold text-primary md:text-3xl">Vision</h2>
              <p className="mt-4 text-lg leading-relaxed text-muted">
                To be a leading preparatory school in Ghana, recognized for producing disciplined, innovative,
                and socially responsible leaders who excel in higher education and beyond.
              </p>
            </FadeIn>
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <FadeIn>
            <h2 className="text-center text-3xl font-bold tracking-tight text-primary md:text-4xl">Core Values</h2>
          </FadeIn>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {coreValues.map((value, index) => (
              <FadeIn key={value.title} delay={index * 0.08}>
                <div className="rounded-2xl border border-border p-6">
                  <h3 className="text-lg font-semibold text-primary">{value.title}</h3>
                  <p className="mt-2 text-muted">{value.description}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </Container>
      </Section>

      <Section surface>
        <Container>
          <FadeIn>
            <h2 className="text-center text-3xl font-bold tracking-tight text-primary md:text-4xl">Leadership Team</h2>
          </FadeIn>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {leadership.map((person, index) => (
              <FadeIn key={person.name} delay={index * 0.08}>
                <div className="text-center">
                  <div className="relative mx-auto aspect-square w-40 overflow-hidden rounded-full">
                    <Image src={person.image} alt={person.name} fill className="object-cover" sizes="160px" />
                  </div>
                  <h3 className="mt-4 font-semibold text-primary">{person.name}</h3>
                  <p className="text-sm text-muted">{person.role}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <FadeIn>
            <h2 className="text-center text-3xl font-bold tracking-tight text-primary md:text-4xl">Our History</h2>
          </FadeIn>
          <div className="relative mt-16">
            <div className="absolute left-4 top-0 h-full w-px bg-border md:left-1/2" aria-hidden />
            <div className="space-y-12">
              {historyTimeline.map((item, index) => (
                <FadeIn key={item.year} delay={index * 0.08}>
                  <div className={`relative flex flex-col gap-4 md:flex-row ${index % 2 === 0 ? "md:flex-row-reverse" : ""}`}>
                    <div className="hidden w-1/2 md:block" />
                    <div className="absolute left-4 top-2 h-3 w-3 -translate-x-1/2 rounded-full bg-accent md:left-1/2" aria-hidden />
                    <div className="ml-10 w-full md:ml-0 md:w-1/2 md:px-8">
                      <span className="text-sm font-bold text-accent">{item.year}</span>
                      <h3 className="mt-1 text-xl font-semibold text-primary">{item.title}</h3>
                      <p className="mt-2 text-muted">{item.description}</p>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
