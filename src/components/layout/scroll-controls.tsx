"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

const HALF_VIEWPORT = 0.5;

export function ScrollControls() {
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [visible, setVisible] = useState(false);

  const updateScrollState = useCallback(() => {
    const { scrollY, innerHeight } = window;
    const maxScroll = document.documentElement.scrollHeight - innerHeight;

    setVisible(maxScroll > 32);
    setCanScrollUp(scrollY > 8);
    setCanScrollDown(scrollY < maxScroll - 8);
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

  const scrollHalfway = (direction: "up" | "down") => {
    const distance = window.innerHeight * HALF_VIEWPORT;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const nextTop =
      direction === "down"
        ? Math.min(window.scrollY + distance, maxScroll)
        : Math.max(window.scrollY - distance, 0);

    window.scrollTo({
      top: nextTop,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  };

  if (!visible) {
    return null;
  }

  return (
    <div
      className="fixed right-3 top-1/2 z-40 flex -translate-y-1/2 flex-col gap-2 sm:right-5"
      aria-label="Page scroll controls"
    >
      <ScrollButton
        direction="up"
        disabled={!canScrollUp}
        onClick={() => scrollHalfway("up")}
      />
      <ScrollButton
        direction="down"
        disabled={!canScrollDown}
        onClick={() => scrollHalfway("down")}
      />
    </div>
  );
}

function ScrollButton({
  direction,
  disabled,
  onClick,
}: {
  direction: "up" | "down";
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = direction === "up" ? ChevronUp : ChevronDown;
  const label = direction === "up" ? "Scroll up half a screen" : "Scroll down half a screen";

  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white/95 text-primary shadow-md shadow-black/10 backdrop-blur-sm transition-all",
        "hover:border-accent/40 hover:bg-white hover:text-accent",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-black/10 disabled:hover:bg-white/95 disabled:hover:text-primary"
      )}
    >
      <Icon className="h-5 w-5" aria-hidden />
    </button>
  );
}
