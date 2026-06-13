"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function ScrollControls() {
  const [visible, setVisible] = useState(false);
  const [showScrollUp, setShowScrollUp] = useState(false);

  const updateScrollState = useCallback(() => {
    const { scrollY, innerHeight } = window;
    const maxScroll = document.documentElement.scrollHeight - innerHeight;

    setVisible(maxScroll > 32);
    setShowScrollUp(scrollY >= maxScroll / 2);
  }, []);

  useEffect(() => {
    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      window.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: getScrollBehavior() });
  };

  const scrollToBottom = () => {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: maxScroll, behavior: getScrollBehavior() });
  };

  if (!visible) {
    return null;
  }

  return (
    <div
      className="fixed right-3 top-1/2 z-40 -translate-y-1/2 sm:right-5"
      aria-label="Page scroll controls"
    >
      {showScrollUp ? (
        <ScrollButton direction="up" onClick={scrollToTop} />
      ) : (
        <ScrollButton direction="down" onClick={scrollToBottom} />
      )}
    </div>
  );
}

function ScrollButton({
  direction,
  onClick,
}: {
  direction: "up" | "down";
  onClick: () => void;
}) {
  const Icon = direction === "up" ? ChevronUp : ChevronDown;
  const label = direction === "up" ? "Scroll to top" : "Scroll to bottom";

  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white/95 text-primary shadow-md shadow-black/10 backdrop-blur-sm transition-all",
        "hover:border-accent/40 hover:bg-white hover:text-accent",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      )}
    >
      <Icon className="h-5 w-5" aria-hidden />
    </button>
  );
}

function getScrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}
