import Image from "next/image";
import { Container, Section } from "@/components/layout/container";
import { FadeIn } from "@/components/motion/fade-in";
import { facilities } from "@/lib/constants";

export function FacilitiesSection() {
  return (
    <Section surface>
      <Container>
        <FadeIn>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent">Facilities</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-primary md:text-4xl lg:text-5xl">
              Spaces designed for learning
            </h2>
          </div>
        </FadeIn>

        <div className="mt-16 grid gap-4 sm:grid-cols-2">
          {facilities.map((facility, index) => (
            <FadeIn key={facility.title} delay={index * 0.08}>
              <div className="group relative aspect-[16/10] overflow-hidden rounded-2xl surface-card p-0 shadow-md">
                <Image
                  src={facility.image}
                  alt={facility.title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/70 to-transparent" />
                <h3 className="absolute bottom-6 left-6 text-2xl font-semibold text-white">{facility.title}</h3>
              </div>
            </FadeIn>
          ))}
        </div>
      </Container>
    </Section>
  );
}
