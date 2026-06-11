"use client";

import { useRef, useState } from "react";
import { Play } from "lucide-react";
import { Container, Section } from "@/components/layout/container";
import { FadeIn } from "@/components/motion/fade-in";
import { schoolVideo } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function SchoolVideoSection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlay = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      await video.play();
      setIsPlaying(true);
    } catch {
      video.controls = true;
      setIsPlaying(true);
    }
  };

  return (
    <Section surface>
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <FadeIn>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent">{schoolVideo.eyebrow}</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-primary md:text-4xl">{schoolVideo.title}</h2>
            <p className="mt-6 text-base leading-relaxed text-deep md:text-lg">{schoolVideo.description}</p>
            <ul className="mt-8 space-y-3">
              {schoolVideo.highlights.map((item) => (
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
                <div className="relative aspect-video bg-primary/5">
                  <video
                    ref={videoRef}
                    className="h-full w-full object-cover"
                    poster={schoolVideo.poster}
                    controls={isPlaying}
                    preload="metadata"
                    playsInline
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => setIsPlaying(false)}
                  >
                    <source src={schoolVideo.src} type="video/mp4" />
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
                      aria-label="Play Tomhel Preparatory School video"
                    >
                      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 text-primary shadow-lg shadow-black/20 transition-transform hover:scale-105">
                        <Play className="ml-1 h-7 w-7 fill-current" aria-hidden />
                      </span>
                    </button>
                  )}
                </div>
              </div>
              <p className="mt-4 text-center text-sm text-deep">{schoolVideo.caption}</p>
            </div>
          </FadeIn>
        </div>
      </Container>
    </Section>
  );
}
