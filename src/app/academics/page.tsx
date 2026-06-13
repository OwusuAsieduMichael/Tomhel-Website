import type { Metadata } from "next";
import { Container, Section } from "@/components/layout/container";
import { BelowHeroShell } from "@/components/layout/below-hero-shell";
import { PageHero } from "@/components/layout/page-hero";
import { FadeIn } from "@/components/motion/fade-in";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { academicsData, schoolImages } from "@/lib/constants";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Academics",
  description:
    "Explore Tomhel's academic programs from Creche through Basic School and Junior High: curriculum, subjects, methodology, and assessments.",
  path: "/academics",
});

const cardClassName =
  "h-full border-black/[0.07] bg-white/95 shadow-md shadow-black/[0.06] backdrop-blur-sm transition-shadow hover:shadow-lg hover:shadow-black/[0.08]";

export default function AcademicsPage() {
  return (
    <>
      <PageHero
        eyebrow="Academics"
        title="Rigorous programs for every learner"
        description="From Creche and Nursery through KG, Basic School, and BECE preparation, our curriculum is designed to challenge, inspire, and prepare students for success."
        backgroundImage={schoolImages.academicHero}
      />

      <BelowHeroShell>
        {academicsData.map((program, index) => (
          <Section key={program.id} id={program.id} surface={index % 2 === 1}>
            <Container>
              <FadeIn>
                <div className="max-w-3xl">
                  <h2 className="text-3xl font-bold tracking-tight text-primary md:text-4xl">{program.title}</h2>
                  <p className="mt-4 text-lg leading-relaxed text-deep">{program.curriculum}</p>
                </div>
              </FadeIn>

              <div className="mt-12 grid gap-6 md:grid-cols-3 md:gap-8">
                <FadeIn delay={0.1}>
                  <Card className={cardClassName}>
                    <CardHeader className="pb-0">
                      <CardTitle className="text-base font-semibold tracking-tight text-primary">Subjects</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="mt-4 space-y-2.5">
                        {program.subjects.map((subject) => (
                          <li key={subject} className="flex items-center gap-2.5 text-[15px] leading-snug text-deep">
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-taim-dark" aria-hidden />
                            {subject}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </FadeIn>
                <FadeIn delay={0.15}>
                  <Card className={cardClassName}>
                    <CardHeader className="pb-0">
                      <CardTitle className="text-base font-semibold tracking-tight text-primary">
                        Teaching Methodology
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="mt-4 text-[15px] leading-relaxed text-deep">{program.methodology}</p>
                    </CardContent>
                  </Card>
                </FadeIn>
                <FadeIn delay={0.2}>
                  <Card className={cardClassName}>
                    <CardHeader className="pb-0">
                      <CardTitle className="text-base font-semibold tracking-tight text-primary">Assessments</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="mt-4 text-[15px] leading-relaxed text-deep">{program.assessments}</p>
                    </CardContent>
                  </Card>
                </FadeIn>
              </div>
            </Container>
          </Section>
        ))}
      </BelowHeroShell>
    </>
  );
}
