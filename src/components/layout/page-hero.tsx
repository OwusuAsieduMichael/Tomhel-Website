import { BackLink } from "@/components/layout/back-link";
import { Container } from "@/components/layout/container";
import { FadeIn } from "@/components/motion/fade-in";

interface PageHeroProps {
  title: string;
  description: string;
  eyebrow?: string;
  variant?: "default" | "taim";
  backHref?: string;
  backLabel?: string;
  showBack?: boolean;
}

export function PageHero({
  title,
  description,
  eyebrow,
  variant = "default",
  backHref,
  backLabel,
  showBack = true,
}: PageHeroProps) {
  const isTaim = variant === "taim";

  return (
    <section
      className={
        isTaim
          ? "border-b border-taim/20 bg-taim-light pt-32 pb-16 md:pt-40 md:pb-24"
          : "border-b border-border bg-surface pt-32 pb-16 md:pt-40 md:pb-24"
      }
    >
      <Container>
        <FadeIn>
          {showBack && (
            <div className="mb-6">
              <BackLink
                href={backHref}
                label={backLabel}
                variant={isTaim ? "taim" : "default"}
              />
            </div>
          )}
          {eyebrow && (
            <p
              className={
                isTaim
                  ? "mb-4 text-sm font-medium uppercase tracking-[0.2em] text-taim-dark"
                  : "mb-4 text-sm font-medium uppercase tracking-[0.2em] text-accent"
              }
            >
              {eyebrow}
            </p>
          )}
          <h1 className="max-w-3xl text-balance text-4xl font-bold tracking-tight text-primary md:text-5xl lg:text-6xl">
            {title}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted md:text-xl">{description}</p>
        </FadeIn>
      </Container>
    </section>
  );
}
