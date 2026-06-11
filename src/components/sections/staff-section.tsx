import Image from "next/image";
import { Container, Section } from "@/components/layout/container";
import { FadeIn } from "@/components/motion/fade-in";
import { siteConfig, staffSection } from "@/lib/constants";

export function StaffSection() {
  return (
    <Section>
      <Container>
        <FadeIn>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent">{staffSection.eyebrow}</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-primary md:text-4xl">{staffSection.title}</h2>
            <p className="mt-6 text-base leading-relaxed text-deep md:text-lg">{staffSection.description}</p>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="surface-card mx-auto mt-12 max-w-5xl overflow-hidden p-0 shadow-md">
            <div className="relative aspect-[16/10] sm:aspect-[21/9]">
              <Image
                src={staffSection.image}
                alt={`${siteConfig.name} staff and teachers`}
                fill
                className="object-cover object-center"
                sizes="(max-width: 1024px) 100vw, 1024px"
              />
            </div>
          </div>
        </FadeIn>
      </Container>
    </Section>
  );
}
