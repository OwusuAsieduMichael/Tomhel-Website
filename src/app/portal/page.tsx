import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BarChart3, BookOpen, Calendar, ClipboardCheck, GraduationCap, Shield, Users } from "lucide-react";
import { Container, Section } from "@/components/layout/container";
import { BelowHeroShell } from "@/components/layout/below-hero-shell";
import { PageHero } from "@/components/layout/page-hero";
import { FadeIn } from "@/components/motion/fade-in";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { portalFeatures, portalRoles, siteConfig } from "@/lib/constants";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Portal Access",
  description: "Access the TAIM platform — login for students, parents, teachers, and administrators.",
  path: "/portal",
});

const featureIcons = [BarChart3, ClipboardCheck, BookOpen, Calendar];

export default function PortalPage() {
  return (
    <>
      <PageHero
        variant="taim"
        eyebrow="TAIM Portal"
        title="Your gateway to Tomhel's digital ecosystem"
        description="Access results, attendance, BECE practice, and more through the TAIM academic management platform."
      />

      <BelowHeroShell>
      <Section>
        <Container>
          <FadeIn>
            <h2 className="text-center text-3xl font-bold tracking-tight text-primary md:text-4xl">Sign in as</h2>
          </FadeIn>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {portalRoles.map((role, index) => {
              const icons = [GraduationCap, Users, BookOpen, Shield];
              const Icon = icons[index] ?? GraduationCap;
              return (
                <FadeIn key={role.title} delay={index * 0.08}>
                  <Card className="h-full transition-all hover:-translate-y-1 hover:shadow-md">
                    <CardHeader>
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-taim-light">
                        <Icon className="h-6 w-6 text-taim-dark" aria-hidden />
                      </div>
                      <CardTitle>{role.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="mb-6 text-sm text-muted">{role.description}</p>
                      <Button variant="taim" asChild className="w-full">
                        <a href={siteConfig.portalUrl} target="_blank" rel="noopener noreferrer">
                          Login
                          <ArrowRight aria-hidden />
                        </a>
                      </Button>
                    </CardContent>
                  </Card>
                </FadeIn>
              );
            })}
          </div>
        </Container>
      </Section>

      <Section surface>
        <Container>
          <FadeIn>
            <h2 className="text-center text-3xl font-bold tracking-tight text-primary md:text-4xl">Platform Features</h2>
          </FadeIn>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {portalFeatures.map((feature, index) => {
              const Icon = featureIcons[index] ?? BarChart3;
              return (
                <FadeIn key={feature.title} delay={index * 0.08}>
                  <div className="rounded-2xl border border-taim/20 bg-white p-6">
                    <Icon className="h-6 w-6 text-taim-dark" aria-hidden />
                    <h3 className="mt-4 font-semibold text-primary">{feature.title}</h3>
                    <p className="mt-2 text-sm text-muted">{feature.description}</p>
                  </div>
                </FadeIn>
              );
            })}
          </div>

          <div className="mt-16 text-center">
            <p className="text-muted">New to TAIM? Contact the school office for login credentials.</p>
            <Button variant="secondary" asChild className="mt-4">
              <Link href="/contact">Contact Support</Link>
            </Button>
          </div>
        </Container>
      </Section>
      </BelowHeroShell>
    </>
  );
}
