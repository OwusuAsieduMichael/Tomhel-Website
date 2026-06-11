import Image from "next/image";
import { Container, Section } from "@/components/layout/container";
import { FadeIn } from "@/components/motion/fade-in";
import { headmasterWelcome, siteConfig } from "@/lib/constants";

export function HeadmasterWelcomeSection() {
  return (
    <Section surface>
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(240px,320px)_1fr] lg:gap-16">
          <FadeIn>
            <div className="mx-auto max-w-xs lg:mx-0">
              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <div className="relative aspect-[3/4]">
                  <Image
                    src={headmasterWelcome.image}
                    alt={`${headmasterWelcome.name}, ${headmasterWelcome.title} of ${siteConfig.name}`}
                    fill
                    className="object-cover object-top"
                    sizes="(max-width: 1024px) 280px, 320px"
                    priority
                  />
                </div>
              </div>
              <div className="mt-6 text-center lg:text-left">
                <p className="font-semibold text-primary">{headmasterWelcome.name}</p>
                <p className="text-sm text-muted">{headmasterWelcome.title}</p>
                <p className="mt-1 text-sm font-medium text-taim-dark">{siteConfig.name}</p>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.1}>
            <div className="relative">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent">
                {headmasterWelcome.eyebrow}
              </p>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-primary md:text-4xl">
                A formal welcome to our school community
              </h2>

              <div className="mt-8 space-y-5 border-l-2 border-taim/40 pl-6 md:pl-8">
                {headmasterWelcome.paragraphs.map((paragraph) => (
                  <p key={paragraph.slice(0, 32)} className="text-base leading-relaxed text-muted md:text-lg">
                    {paragraph}
                  </p>
                ))}
              </div>

              <footer className="mt-10 border-t border-border pt-6">
                <p className="text-sm font-semibold uppercase tracking-wider text-taim-dark">
                  {headmasterWelcome.closing}
                </p>
                <p className="mt-3 font-medium text-primary">{headmasterWelcome.name}</p>
                <p className="text-sm text-muted">{headmasterWelcome.title}, {siteConfig.shortName}</p>
              </footer>
            </div>
          </FadeIn>
        </div>
      </Container>
    </Section>
  );
}
