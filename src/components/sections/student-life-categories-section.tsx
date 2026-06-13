"use client";

import Image from "next/image";
import { Container, Section } from "@/components/layout/container";
import { FadeIn } from "@/components/motion/fade-in";
import { ImageCarousel } from "@/components/motion/image-carousel";
import { studentLifeCategories } from "@/lib/constants";

type StudentLifeCategory = (typeof studentLifeCategories)[number];

export function StudentLifeCategoryCard({
  category,
  delay,
}: {
  category: StudentLifeCategory;
  delay: number;
}) {
  const slides = "slides" in category ? category.slides : undefined;
  const hasSlides = slides && slides.length > 0;

  return (
    <FadeIn delay={delay}>
      <article className="group surface-card overflow-hidden p-0 transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-black/[0.08]">
        <div className="relative aspect-[16/10] overflow-hidden">
          {hasSlides ? (
            <ImageCarousel
              slides={slides}
              className="absolute inset-0"
              sizes="(max-width: 768px) 100vw, 33vw"
              showDots
              dotClassName="bottom-2"
              activeDotClassName="w-6 bg-white"
              inactiveDotClassName="w-1.5 bg-white/50 hover:bg-white/75"
            />
          ) : (
            <Image
              src={category.image}
              alt={category.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          )}
        </div>
        <div className="p-6">
          <h2 className="text-xl font-semibold text-primary">{category.title}</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-deep">{category.description}</p>
        </div>
      </article>
    </FadeIn>
  );
}

export function StudentLifeCategoriesSection() {
  return (
    <Section>
      <Container>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {studentLifeCategories.map((category, index) => (
            <StudentLifeCategoryCard key={category.title} category={category} delay={index * 0.08} />
          ))}
        </div>
      </Container>
    </Section>
  );
}
