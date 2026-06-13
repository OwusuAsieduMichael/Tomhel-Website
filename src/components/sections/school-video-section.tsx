"use client";

import { useRef, useState } from "react";
import { Play } from "lucide-react";
import { Container, Section } from "@/components/layout/container";
import { FadeIn } from "@/components/motion/fade-in";
import { schoolVideo } from "@/lib/constants";
import { cn } from "@/lib/utils";

type FeaturedVideoConfig = {
  src: string;
  poster: string;
  eyebrow: string;
  title: string;
  description: string;
  highlights: readonly string[];
  caption: string;
  aspectClass?: string;
  posterClass?: string;
};

type SchoolVideoSectionProps = {
  video?: FeaturedVideoConfig & { playLabel?: string };
  playLabel?: string;
  surface?: boolean;
};

export function SchoolVideoSection({
  video = schoolVideo,
  playLabel,
  surface = true,
}: SchoolVideoSectionProps = {}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const ariaLabel = playLabel ?? ("playLabel" in video && video.playLabel ? video.playLabel : "Play video");
  const aspectClass = video.aspectClass ?? "aspect-video";
  const posterClass = video.posterClass ?? "object-cover";

  const handlePlay = async () => {
    const el = videoRef.current;
    if (!el) return;

    try {
      await el.play();
      setIsPlaying(true);
    } catch {
      el.controls = true;
      setIsPlaying(true);
    }
  };

  return (
    <Section surface={surface}>
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <FadeIn>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent">{video.eyebrow}</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-primary md:text-4xl">{video.title}</h2>
            <p className="mt-6 text-base leading-relaxed text-deep md:text-lg">{video.description}</p>
            <ul className="mt-8 space-y-3">
              {video.highlights.map((item) => (
                <li key={item} className="flex items-start gap-3 text-[15px] leading-relaxed text-deep">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-taim-dark" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </FadeIn>

          <FadeIn delay={0.1}>
            <div className="relative mx-auto w-full max-w-2xl lg:max-w-none">
              <div className="surface-card overflow-hidden p-0 shadow-xl shadow-black/10">
                <div className={cn("relative bg-primary/5", aspectClass)}>
                  <video
                    ref={videoRef}
                    className={cn("h-full w-full", isPlaying ? "object-cover" : posterClass)}
                    poster={video.poster}
                    controls={isPlaying}
                    preload="metadata"
                    playsInline
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => setIsPlaying(false)}
                  >
                    <source src={video.src} type="video/mp4" />
                    Your browser does not support embedded video playback.
                  </video>

                  {!isPlaying && (
                    <button
                      type="button"
                      onClick={handlePlay}
                      className={cn(
                        "absolute inset-0 flex items-center justify-center bg-primary/20 transition-colors hover:bg-primary/30",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                      )}
                      aria-label={ariaLabel}
                    >
                      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 text-primary shadow-lg shadow-black/20 transition-transform hover:scale-105">
                        <Play className="ml-1 h-7 w-7 fill-current" aria-hidden />
                      </span>
                    </button>
                  )}
                </div>
              </div>
              <p className="mt-4 text-center text-sm text-deep">{video.caption}</p>
            </div>
          </FadeIn>
        </div>
      </Container>
    </Section>
  );
}
