"use client";

import { BackLink } from "@/components/layout/back-link";
import { Container } from "@/components/layout/container";
import { FadeIn } from "@/components/motion/fade-in";
import { ImageCarousel, type CarouselSlide } from "@/components/motion/image-carousel";

interface PageHeroCarouselProps {
  title: string;
  description: string;
  eyebrow?: string;
  backHref?: string;
  backLabel?: string;
  showBack?: boolean;
  backgroundSlides: readonly CarouselSlide[];
}

export function PageHeroCarousel({
  title,
  description,
  eyebrow,
  backHref,
  backLabel,
  showBack = true,
  backgroundSlides,
}: PageHeroCarouselProps) {
  return (
    <section className="relative overflow-hidden border-b border-border pt-32 pb-16 md:pt-40 md:pb-24">
      <ImageCarousel
        slides={backgroundSlides}
        className="absolute inset-0"
        sizes="100vw"
        priority
        showDots
        dotClassName="bottom-6"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/80 to-primary/60" aria-hidden />

      <Container className="relative z-10">
        <FadeIn>
          {showBack && (
            <div className="mb-6">
              <BackLink href={backHref} label={backLabel} className="text-white/80 hover:text-white" />
            </div>
          )}
          {eyebrow && (
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-taim">{eyebrow}</p>
          )}
          <h1 className="max-w-3xl text-balance text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-6xl">
            {title}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/85 md:text-xl">{description}</p>
        </FadeIn>
      </Container>
    </section>
  );
}
