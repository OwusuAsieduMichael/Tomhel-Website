import { BackLink } from "@/components/layout/back-link";
import { Container, Section } from "@/components/layout/container";

export default function NotFound() {
  return (
    <Section className="flex min-h-[60vh] items-center pt-32">
      <Container className="text-center">
        <p className="text-sm font-medium uppercase tracking-wider text-accent">404</p>
        <h1 className="mt-4 text-4xl font-bold text-primary md:text-5xl">Page not found</h1>
        <p className="mt-4 text-lg text-muted">The page you&apos;re looking for doesn&apos;t exist or has been moved.</p>
        <div className="mt-8 flex justify-center">
          <BackLink href="/" label="Back to Home" />
        </div>
      </Container>
    </Section>
  );
}
