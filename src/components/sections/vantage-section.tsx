import { Award, Cctv, type LucideIcon } from "lucide-react";
import { Container, Section } from "@/components/layout/container";
import { FadeIn } from "@/components/motion/fade-in";
import { vantageSection } from "@/lib/constants";

const iconMap: Record<string, LucideIcon> = {
  Award,
  Cctv,
};

export function VantageSection() {
  const RecognitionIcon = iconMap[vantageSection.recognition.icon] ?? Award;
  const SecurityIcon = iconMap[vantageSection.security.icon] ?? Cctv;

  return (
    <Section surface>
      <Container>
        <FadeIn>
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent">{vantageSection.eyebrow}</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-primary md:text-4xl lg:text-5xl">
              {vantageSection.title}
            </h2>
            <p className="mt-6 text-base leading-relaxed text-deep md:text-lg">{vantageSection.intro}</p>
          </div>
        </FadeIn>

        <div className="mt-14 grid gap-8 lg:grid-cols-2 lg:gap-10">
          <FadeIn delay={0.08}>
            <article className="surface-card relative h-full overflow-hidden border-taim/20 p-8 md:p-10">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-taim-dark via-accent to-taim" aria-hidden />
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
                <RecognitionIcon className="h-7 w-7 text-accent" aria-hidden />
              </div>
              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-taim-dark">
                {vantageSection.recognition.badge}
              </p>
              <h3 className="mt-3 text-2xl font-bold leading-tight text-primary md:text-3xl">
                {vantageSection.recognition.title}
              </h3>
              <p className="mt-5 text-[15px] leading-relaxed text-deep md:text-base">
                {vantageSection.recognition.description}
              </p>
            </article>
          </FadeIn>

          <FadeIn delay={0.16}>
            <article className="surface-card relative h-full overflow-hidden p-8 md:p-10">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/5">
                <SecurityIcon className="h-7 w-7 text-primary" aria-hidden />
              </div>
              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-taim-dark">
                {vantageSection.security.badge}
              </p>
              <h3 className="mt-3 text-2xl font-bold leading-tight text-primary md:text-3xl">
                {vantageSection.security.title}
              </h3>
              <p className="mt-5 text-[15px] leading-relaxed text-deep md:text-base">
                {vantageSection.security.description}
              </p>
              <ul className="mt-6 space-y-3">
                {vantageSection.security.points.map((point) => (
                  <li key={point.slice(0, 32)} className="flex items-start gap-3 text-[15px] leading-relaxed text-deep">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                    {point}
                  </li>
                ))}
              </ul>
            </article>
          </FadeIn>
        </div>

        <FadeIn delay={0.24}>
          <p className="mx-auto mt-12 max-w-2xl text-center text-base font-medium text-primary md:text-lg">
            {vantageSection.closing}
          </p>
        </FadeIn>
      </Container>
    </Section>
  );
}
