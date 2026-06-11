import { Container, Section } from "@/components/layout/container";
import { AnimatedCounter } from "@/components/motion/animated-counter";
import { FadeIn } from "@/components/motion/fade-in";
import { stats } from "@/lib/constants";

export function StatsSection() {
  return (
    <Section surface id="stats">
      <Container>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <FadeIn key={stat.label} delay={index * 0.08}>
              <div className="surface-card text-center">
                <p className="text-4xl font-bold tracking-tight text-primary md:text-5xl lg:text-6xl">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </p>
                <p className="mt-2 text-sm font-medium uppercase tracking-wider text-deep">{stat.label}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </Container>
    </Section>
  );
}
