"use client";

import { useEffect, useRef } from "react";
import { BackLink } from "@/components/layout/back-link";
import { Container } from "@/components/layout/container";
import { FadeIn } from "@/components/motion/fade-in";

interface PageHeroVideoProps {
  title: string;
  description: string;
  eyebrow?: string;
  backHref?: string;
  backLabel?: string;
  showBack?: boolean;
  videoSrc: string;
}

export function PageHeroVideo({
  title,
  description,
  eyebrow,
  backHref,
  backLabel,
  showBack = true,
  videoSrc,
}: PageHeroVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    el.play().catch(() => {
      // Autoplay may be blocked; first frame still shows as the hero background.
    });
  }, []);

  return (
    <section className="relative overflow-hidden border-b border-border pt-32 pb-16 md:pt-40 md:pb-24">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden
      >
        <source src={videoSrc} type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/80 to-primary/60" aria-hidden />

      <Container className="relative z-10">
        <FadeIn>
          {showBack && (
            <div className="mb-6">
              <BackLink href={backHref} label={backLabel} className="text-white/80 hover:text-white" />
            </div>
          )}
          {eyebrow && (
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-taim">{eyebrow}</p>
          )}
          <h1 className="max-w-3xl text-balance text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-6xl">
            {title}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/85 md:text-xl">{description}</p>
        </FadeIn>
      </Container>
    </section>
  );
}
