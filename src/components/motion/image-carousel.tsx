"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type CarouselSlide = {
  src: string;
  alt: string;
};

type ImageCarouselProps = {
  slides: readonly CarouselSlide[];
  className?: string;
  imageClassName?: string;
  sizes?: string;
  priority?: boolean;
  intervalMs?: number;
  showDots?: boolean;
  dotClassName?: string;
  activeDotClassName?: string;
  inactiveDotClassName?: string;
};

const DEFAULT_INTERVAL_MS = 8000;
const SWIPE_DURATION = 1.1;

export function ImageCarousel({
  slides,
  className,
  imageClassName = "object-cover",
  sizes = "100vw",
  priority = false,
  intervalMs = DEFAULT_INTERVAL_MS,
  showDots = true,
  dotClassName,
  activeDotClassName = "w-8 bg-white",
  inactiveDotClassName = "w-2 bg-white/50 hover:bg-white/75",
}: ImageCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    if (slides.length <= 1) return;

    const timer = setInterval(() => {
      setDirection(1);
      setActiveIndex((current) => (current + 1) % slides.length);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [intervalMs, slides.length]);

  if (slides.length === 0) {
    return null;
  }

  const slide = slides[activeIndex];

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
          key={slide.src}
          custom={direction}
          initial={{ opacity: 0, x: direction > 0 ? "8%" : "-8%" }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction > 0 ? "-8%" : "8%" }}
          transition={{ duration: SWIPE_DURATION, ease: [0.4, 0, 0.2, 1] }}
          className="absolute inset-0"
        >
          <Image
            src={slide.src}
            alt={slide.alt}
            fill
            priority={priority && activeIndex === 0}
            className={imageClassName}
            sizes={sizes}
          />
        </motion.div>
      </AnimatePresence>

      {showDots && slides.length > 1 && (
        <div
          className={cn("absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-2", dotClassName)}
          aria-label="Image slides"
          role="tablist"
        >
          {slides.map((item, index) => (
            <button
              key={item.src}
              type="button"
              role="tab"
              aria-selected={index === activeIndex}
              aria-label={`Show slide ${index + 1} of ${slides.length}`}
              onClick={() => {
                setDirection(index > activeIndex ? 1 : -1);
                setActiveIndex(index);
              }}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                index === activeIndex ? activeDotClassName : inactiveDotClassName
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
