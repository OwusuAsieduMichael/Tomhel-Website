import Image from "next/image";
import { Container, Section } from "@/components/layout/container";
import { FadeIn } from "@/components/motion/fade-in";
import { studentRepresentativeVoting } from "@/lib/constants";

export function StudentVotingSection({ surface = false }: { surface?: boolean }) {
  return (
    <Section surface={surface}>
      <Container>
        <FadeIn>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent">
              {studentRepresentativeVoting.eyebrow}
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-primary md:text-4xl">
              {studentRepresentativeVoting.title}
            </h2>
            <p className="mt-6 text-base leading-relaxed text-deep md:text-lg">
              {studentRepresentativeVoting.description}
            </p>
          </div>
        </FadeIn>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {studentRepresentativeVoting.images.map((item, index) => (
            <FadeIn key={item.src} delay={index * 0.06}>
              <div className="surface-card overflow-hidden p-0 shadow-md">
                <div className="relative aspect-[4/5] overflow-hidden">
                  <Image
                    src={item.src}
                    alt={item.alt}
                    fill
                    className="object-cover transition-transform duration-500 hover:scale-[1.02]"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
              </div>
            </FadeIn>
          ))}
        </div>

        <FadeIn delay={0.2}>
          <p className="mx-auto mt-8 max-w-2xl text-center text-sm leading-relaxed text-deep">
            {studentRepresentativeVoting.caption}
          </p>
        </FadeIn>
      </Container>
    </Section>
  );
}
