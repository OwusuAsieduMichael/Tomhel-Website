import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Container, Section } from "@/components/layout/container";
import { FadeIn } from "@/components/motion/fade-in";
import { programs } from "@/lib/constants";

export function ProgramsSection() {
  return (
    <Section>
      <Container>
        <FadeIn>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent">Academic Programs</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-primary md:text-4xl lg:text-5xl">
              Education for every stage
            </h2>
          </div>
        </FadeIn>

        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {programs.map((program, index) => (
            <FadeIn key={program.title} delay={index * 0.1}>
              <Link
                href={program.href}
                className="group block overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={program.image}
                    alt={program.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="text-xl font-semibold text-primary">{program.title}</h3>
                    <ArrowUpRight className="h-5 w-5 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent" aria-hidden />
                  </div>
                  <p className="mt-3 leading-relaxed text-muted">{program.description}</p>
                </div>
              </Link>
            </FadeIn>
          ))}
        </div>
      </Container>
    </Section>
  );
}
