"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/container";
import { FadeIn } from "@/components/motion/fade-in";
import { heroSlides, siteConfig } from "@/lib/constants";

const SLIDE_INTERVAL_MS = 8000;
const SWIPE_DURATION = 1.1;

export function HeroSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    const timer = setInterval(() => {
      setDirection(1);
      setActiveIndex((current) => (current + 1) % heroSlides.length);
    }, SLIDE_INTERVAL_MS);

    return () => clearInterval(timer);
  }, []);

  const slide = heroSlides[activeIndex];

  return (
    <section className="relative flex min-h-screen items-center overflow-hidden">
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
          key={slide.src}
          custom={direction}
          initial={{ opacity: 0, x: direction > 0 ? "8%" : "-8%" }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction > 0 ? "-8%" : "8%" }}
          transition={{ duration: SWIPE_DURATION, ease: [0.4, 0, 0.2, 1] }}
          className="absolute inset-0"
        >
          <Image
            src={slide.src}
            alt={slide.alt}
            fill
            priority={activeIndex === 0}
            className="object-cover"
            sizes="100vw"
          />
        </motion.div>
      </AnimatePresence>

      <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/75 to-taim-dark/30" aria-hidden />

      <Container className="relative z-10 pt-20">
        <FadeIn>
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.25em] text-taim">
            Tomhel Preparatory School
          </p>
          <h1 className="max-w-4xl text-balance text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
            {siteConfig.slogan}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/80 md:text-xl">
            Provide quality education through academic excellence, character development, innovation, and leadership.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Button variant="taim" asChild size="lg">
              <Link href="/admissions">
                Apply Now
                <ArrowRight aria-hidden />
              </Link>
            </Button>
            <Button variant="outline" asChild size="lg">
              <Link href="/academics">Explore Academics</Link>
            </Button>
          </div>
        </FadeIn>
      </Container>

      <div
        className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 gap-2"
        aria-label="Hero image slides"
        role="tablist"
      >
        {heroSlides.map((item, index) => (
          <button
            key={item.src}
            type="button"
            role="tab"
            aria-selected={index === activeIndex}
            aria-label={`Show slide ${index + 1} of ${heroSlides.length}`}
            onClick={() => {
              setDirection(index > activeIndex ? 1 : -1);
              setActiveIndex(index);
            }}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === activeIndex ? "w-8 bg-white" : "w-2 bg-white/50 hover:bg-white/75"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
