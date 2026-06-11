import { Container, Section } from "@/components/layout/container";
import { FadeIn } from "@/components/motion/fade-in";
import { Card, CardContent } from "@/components/ui/card";
import { testimonials } from "@/lib/constants";

export function TestimonialsSection() {
  return (
    <Section>
      <Container>
        <FadeIn>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent">Testimonials</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-primary md:text-4xl lg:text-5xl">
              Voices from our community
            </h2>
          </div>
        </FadeIn>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {testimonials.map((item, index) => (
            <FadeIn key={item.author} delay={index * 0.1}>
              <Card className="h-full border-black/[0.07] bg-white/95 shadow-md backdrop-blur-sm transition-shadow hover:shadow-lg hover:shadow-black/[0.08]">
                <CardContent className="flex h-full flex-col p-8">
                  <blockquote className="flex-1 text-base leading-relaxed text-primary/90">
                    &ldquo;{item.quote}&rdquo;
                  </blockquote>
                  <footer className="mt-6 border-t border-border pt-6">
                    <p className="font-semibold text-primary">{item.author}</p>
                    <p className="text-sm text-deep">{item.role}</p>
                  </footer>
                </CardContent>
              </Card>
            </FadeIn>
          ))}
        </div>
      </Container>
    </Section>
  );
}
