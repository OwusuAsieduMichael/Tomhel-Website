import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/container";
import { FadeIn } from "@/components/motion/fade-in";
import { schoolImages, siteConfig } from "@/lib/constants";

export function HeroSection() {
  return (
    <section className="relative flex min-h-screen items-center overflow-hidden">
      <Image
        src={schoolImages.hero}
        alt="Students learning at Tomhel Preparatory School"
        fill
        priority
        className="object-cover"
        sizes="100vw"
      />
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
    </section>
  );
}
