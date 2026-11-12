import type { Metadata } from "next";
import { Container, Section } from "@/components/layout/container";
import { BelowHeroShell } from "@/components/layout/below-hero-shell";
import { PageHeroCarousel } from "@/components/layout/page-hero-carousel";
import { FadeIn } from "@/components/motion/fade-in";
import { SchoolVideoSection } from "@/components/sections/school-video-section";
import { GroupPhotoSection } from "@/components/sections/group-photo-section";
import { StudentLifeCategoriesSection } from "@/components/sections/student-life-categories-section";
import { StudentVotingSection } from "@/components/sections/student-voting-section";
import {
  carolsServiceVideo,
  schoolChoirVideo,
  studentLifeHeroSlides,
  studentLifeVideo,
  transportSection,
} from "@/lib/constants";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Student Life",
  description:
    "Discover vibrant student life at Tomhel: sports, clubs, competitions, excursions, and cultural activities.",
  path: "/student-life",
});

export default function StudentLifePage() {
  return (
    <>
      <PageHeroCarousel
        eyebrow="Student Life"
        title="Where learning meets living"
        description="Beyond the classroom, Tomhel students discover passions, build friendships, and grow through rich extracurricular experiences."
        backgroundSlides={studentLifeHeroSlides}
      />

      <BelowHeroShell>
        <StudentLifeCategoriesSection />

        <StudentVotingSection surface />

        <GroupPhotoSection {...transportSection} />

        <SchoolVideoSection video={carolsServiceVideo} playLabel={carolsServiceVideo.playLabel} />

        <SchoolVideoSection video={schoolChoirVideo} playLabel={schoolChoirVideo.playLabel} surface />

        <SchoolVideoSection video={studentLifeVideo} playLabel={studentLifeVideo.playLabel} />

        <Section surface>
          <Container>
            <FadeIn>
              <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-primary md:text-4xl">
                A community that celebrates every talent
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-deep">
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
