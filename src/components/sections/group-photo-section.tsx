import Image from "next/image";
import { Container, Section } from "@/components/layout/container";
import { FadeIn } from "@/components/motion/fade-in";
import { cn } from "@/lib/utils";

type GroupPhotoSectionProps = {
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  surface?: boolean;
  /** Use contain to show the full photo without cropping (e.g. bus, kitchen staff). */
  imageFit?: "cover" | "contain";
};

export function GroupPhotoSection({
  eyebrow,
  title,
  description,
  image,
  imageAlt,
  surface = false,
  imageFit = "cover",
}: GroupPhotoSectionProps) {
  return (
    <Section surface={surface}>
      <Container>
        <FadeIn>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent">{eyebrow}</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-primary md:text-4xl">{title}</h2>
            <p className="mt-6 text-base leading-relaxed text-deep md:text-lg">{description}</p>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="surface-card mx-auto mt-12 max-w-5xl overflow-hidden p-0 shadow-md">
            <div
              className={cn(
                "relative aspect-[16/10] sm:aspect-[21/9]",
                imageFit === "contain" && "bg-surface"
              )}
            >
              <Image
                src={image}
                alt={imageAlt}
                fill
                className={cn(
                  imageFit === "contain"
                    ? "object-contain object-center p-6 sm:p-10"
                    : "object-cover object-center"
                )}
                sizes="(max-width: 1024px) 100vw, 1024px"
              />
            </div>
          </div>
        </FadeIn>
      </Container>
    </Section>
  );
}
