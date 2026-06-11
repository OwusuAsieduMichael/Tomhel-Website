import type { Metadata } from "next";
import { Container, Section } from "@/components/layout/container";
import { BelowHeroShell } from "@/components/layout/below-hero-shell";
import { PageHero } from "@/components/layout/page-hero";
import { FadeIn } from "@/components/motion/fade-in";
import { academicsData } from "@/lib/constants";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Academics",
  description:
    "Explore Tomhel's academic programs from Kindergarten through Junior High School — curriculum, subjects, methodology, and assessments.",
  path: "/academics",
});

export default function AcademicsPage() {
  return (
    <>
      <PageHero
        eyebrow="Academics"
        title="Rigorous programs for every learner"
        description="From early childhood through BECE preparation, our curriculum is designed to challenge, inspire, and prepare students for success."
      />

      <BelowHeroShell>
      {academicsData.map((program, index) => (
        <Section key={program.id} id={program.id} surface={index % 2 === 1}>
          <Container>
            <FadeIn>
              <div className="max-w-3xl">
                <h2 className="text-3xl font-bold tracking-tight text-primary md:text-4xl">{program.title}</h2>
                <p className="mt-4 text-lg text-muted">{program.curriculum}</p>
              </div>
            </FadeIn>

            <div className="mt-12 grid gap-8 md:grid-cols-3">
              <FadeIn delay={0.1}>
                <div className="rounded-2xl border border-border p-6">
                  <h3 className="font-semibold text-primary">Subjects</h3>
                  <ul className="mt-4 space-y-2">
                    {program.subjects.map((subject) => (
                      <li key={subject} className="flex items-center gap-2 text-muted">
                        <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
                        {subject}
                      </li>
                    ))}
                  </ul>
                </div>
              </FadeIn>
              <FadeIn delay={0.15}>
                <div className="rounded-2xl border border-border p-6">
                  <h3 className="font-semibold text-primary">Teaching Methodology</h3>
                  <p className="mt-4 leading-relaxed text-muted">{program.methodology}</p>
                </div>
              </FadeIn>
              <FadeIn delay={0.2}>
                <div className="rounded-2xl border border-border p-6">
                  <h3 className="font-semibold text-primary">Assessments</h3>
                  <p className="mt-4 leading-relaxed text-muted">{program.assessments}</p>
                </div>
              </FadeIn>
            </div>
          </Container>
        </Section>
      ))}
      </BelowHeroShell>
    </>
  );
}
