import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container, Section } from "@/components/layout/container";
import { FadeIn } from "@/components/motion/fade-in";
import { Button } from "@/components/ui/button";

export function AdmissionsCTA() {
  return (
    <Section className="bg-taim-dark">
      <Container>
        <FadeIn>
          <div className="mx-auto max-w-3xl text-center text-white">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
              Begin your child&apos;s journey at Tomhel
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-white/80">
              Join a community dedicated to academic excellence, character, and leadership.
              Admissions for the 2025/2026 academic year are now open.
            </p>
            <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
              <Button asChild size="lg" className="bg-white text-taim-dark hover:bg-white/90">
                <Link href="/admissions">
                  Start Application
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
              <Button variant="outline" asChild size="lg">
                <Link href="/contact">Schedule a Visit</Link>
              </Button>
            </div>
          </div>
        </FadeIn>
      </Container>
    </Section>
  );
}
