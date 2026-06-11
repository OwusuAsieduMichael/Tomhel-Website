import { GraduationCap, Heart, Laptop, Users, type LucideIcon } from "lucide-react";
import { Container, Section } from "@/components/layout/container";
import { FadeIn } from "@/components/motion/fade-in";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { pillars } from "@/lib/constants";

const iconMap: Record<string, LucideIcon> = {
  GraduationCap,
  Heart,
  Laptop,
  Users,
};

export function PillarsSection() {
  return (
    <Section>
      <Container>
        <FadeIn>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent">Why Choose Tomhel</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-primary md:text-4xl lg:text-5xl">
              A foundation for lifelong success
            </h2>
            <p className="mt-4 text-lg text-deep">
              Four pillars guide everything we do, from the classroom to the community.
            </p>
          </div>
        </FadeIn>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map((pillar, index) => {
            const Icon = iconMap[pillar.icon] ?? GraduationCap;
            return (
              <FadeIn key={pillar.title} delay={index * 0.1}>
                <Card className="h-full border-black/[0.07] bg-white/95 shadow-md backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/[0.08]">
                  <CardHeader>
                    <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                      <Icon className="h-6 w-6 text-accent" aria-hidden />
                    </div>
                    <CardTitle>{pillar.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-[15px] leading-relaxed text-deep">{pillar.description}</p>
                  </CardContent>
                </Card>
              </FadeIn>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
