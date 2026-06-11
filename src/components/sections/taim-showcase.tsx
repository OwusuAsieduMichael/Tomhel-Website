import Link from "next/link";
import { BarChart3, Calendar, CheckCircle2, ClipboardList, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container, Section } from "@/components/layout/container";
import { FadeIn } from "@/components/motion/fade-in";
import { siteConfig, taimFeatures } from "@/lib/constants";

const featureIcons = [Users, ClipboardList, CheckCircle2, BarChart3, Calendar];

export function TaimShowcase() {
  return (
    <Section className="bg-taim-light">
      <Container>
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <FadeIn>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-taim-dark">TAIM Platform</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-primary md:text-4xl lg:text-5xl">
              Your school ecosystem, connected
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-muted">
              TAIM is Tomhel&apos;s integrated academic management platform — giving students, parents, and teachers
              real-time access to everything that matters.
            </p>
            <Button variant="taim" asChild className="mt-8">
              <Link href="/portal">Access Portal</Link>
            </Button>
          </FadeIn>

          <div className="grid gap-4 sm:grid-cols-2">
            {taimFeatures.map((feature, index) => {
              const Icon = featureIcons[index] ?? CheckCircle2;
              return (
                <FadeIn key={feature.title} delay={index * 0.08}>
                  <div className="rounded-2xl border border-taim/30 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-taim hover:shadow-md">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-taim-light">
                      <Icon className="h-5 w-5 text-taim-dark" aria-hidden />
                    </div>
                    <h3 className="mt-4 font-semibold text-primary">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{feature.description}</p>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>

        <p className="mt-12 text-center text-sm text-taim-dark/70">
          Powered by <span className="font-semibold text-taim-dark">TAIM</span> · {siteConfig.portalUrl}
        </p>
      </Container>
    </Section>
  );
}
