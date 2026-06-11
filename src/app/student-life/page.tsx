import type { Metadata } from "next";
import Image from "next/image";
import { Container, Section } from "@/components/layout/container";
import { BelowHeroShell } from "@/components/layout/below-hero-shell";
import { PageHero } from "@/components/layout/page-hero";
import { FadeIn } from "@/components/motion/fade-in";
import { studentLifeCategories } from "@/lib/constants";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Student Life",
  description:
    "Discover vibrant student life at Tomhel — sports, clubs, competitions, excursions, and cultural activities.",
  path: "/student-life",
});

export default function StudentLifePage() {
  return (
    <>
      <PageHero
        eyebrow="Student Life"
        title="Where learning meets living"
        description="Beyond the classroom, Tomhel students discover passions, build friendships, and grow through rich extracurricular experiences."
      />

      <BelowHeroShell>
      <Section>
        <Container>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {studentLifeCategories.map((category, index) => (
              <FadeIn key={category.title} delay={index * 0.08}>
                <article className="group overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-1 hover:shadow-lg">
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <Image
                      src={category.image}
                      alt={category.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  </div>
                  <div className="p-6">
                    <h2 className="text-xl font-semibold text-primary">{category.title}</h2>
                    <p className="mt-3 leading-relaxed text-muted">{category.description}</p>
                  </div>
                </article>
              </FadeIn>
            ))}
          </div>
        </Container>
      </Section>

      <Section surface>
        <Container>
          <FadeIn>
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-primary md:text-4xl">
                A community that celebrates every talent
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-muted">
                From the football field to the debate podium, Tomhel encourages every student to explore,
                compete, and contribute. Our vibrant culture builds confidence, teamwork, and a lifelong
                love of learning.
              </p>
            </div>
          </FadeIn>
        </Container>
      </Section>
      </BelowHeroShell>
    </>
  );
}
