"use client";

import { useEffect, useState } from "react";
import { LogoSpinner } from "./logo-spinner";

/** How long the welcome screen stays when someone enters Academic Prep. */
const SHOW_MS = 3000;
const FADE_MS = 400;
const SEEN_KEY = "prep-welcome-seen";

/**
 * A 3-second welcome screen (the spinning school logo) when someone enters Academic Prep, e.g. from the
 * website's "Academic Prep" button. Shown once per visit: refreshing or moving between portal pages afterwards
 * goes straight to the page. The page loads underneath meanwhile. A tap dismisses it early.
 */
export function WelcomeSplash() {
  const [phase, setPhase] = useState<"show" | "fade" | "gone">("show");

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === "1";
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      // Private browsing or blocked storage: just show it.
    }
    if (seen) {
      setPhase("gone");
      return;
    }
    const fade = setTimeout(() => setPhase("fade"), SHOW_MS);
    const gone = setTimeout(() => setPhase("gone"), SHOW_MS + FADE_MS);
    return () => {
      clearTimeout(fade);
      clearTimeout(gone);
    };
  }, []);

  if (phase === "gone") return null;
  return (
    <div
      role="status"
      aria-live="polite"
      onClick={() => setPhase("fade")}
      onTransitionEnd={() => phase === "fade" && setPhase("gone")}
      className={`fixed inset-0 z-[100] flex cursor-pointer flex-col items-center justify-center gap-5 bg-prep-ground px-6 text-center transition-opacity duration-[400ms] ${
        phase === "fade" ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <LogoSpinner size="lg" />
      <div className="flex flex-col gap-1">
        <p className="text-xl font-bold text-prep-ink">Academic Prep</p>
        <p className="text-sm text-prep-muted">Tomhel Preparatory School</p>
      </div>
      <span className="sr-only">Opening Academic Prep</span>
    </div>
  );
}
