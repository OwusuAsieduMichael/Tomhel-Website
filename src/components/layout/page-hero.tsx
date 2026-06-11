import Image from "next/image";
import { BackLink } from "@/components/layout/back-link";
import { Container } from "@/components/layout/container";
import { FadeIn } from "@/components/motion/fade-in";
import { cn } from "@/lib/utils";

interface PageHeroProps {
  title: string;
  description: string;
  eyebrow?: string;
  backHref?: string;
  backLabel?: string;
  showBack?: boolean;
  backgroundImage?: string;
}

export function PageHero({
  title,
  description,
  eyebrow,
  backHref,
  backLabel,
  showBack = true,
  backgroundImage,
}: PageHeroProps) {
  const hasBackground = Boolean(backgroundImage);

  return (
    <section
      className={cn(
        "relative overflow-hidden border-b border-border pt-32 pb-16 md:pt-40 md:pb-24",
        !hasBackground && "bg-surface"
      )}
    >
      {backgroundImage && (
        <>
          <Image src={backgroundImage} alt="" fill className="object-cover" sizes="100vw" priority />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/80 to-primary/60" aria-hidden />
        </>
      )}

      <Container className="relative z-10">
        <FadeIn>
          {showBack && (
            <div className="mb-6">
              <BackLink
                href={backHref}
                label={backLabel}
                className={hasBackground ? "text-white/80 hover:text-white" : undefined}
              />
            </div>
          )}
          {eyebrow && (
            <p
              className={cn(
                "mb-4 text-sm font-medium uppercase tracking-[0.2em]",
                hasBackground ? "text-taim" : "text-accent"
              )}
            >
              {eyebrow}
            </p>
          )}
          <h1
            className={cn(
              "max-w-3xl text-balance text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl",
              hasBackground ? "text-white" : "text-primary"
            )}
          >
            {title}
          </h1>
          <p
            className={cn(
              "mt-6 max-w-2xl text-lg leading-relaxed md:text-xl",
              hasBackground ? "text-white/85" : "text-muted"
            )}
          >
            {description}
          </p>
        </FadeIn>
      </Container>
    </section>
  );
}
