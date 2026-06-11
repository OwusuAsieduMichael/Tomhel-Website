"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { navigation, schoolImages, siteConfig } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled ? "border-b border-border/60 bg-background/90 backdrop-blur-md" : "bg-transparent"
      )}
    >
      <div className="container-width flex h-16 items-center justify-between lg:h-20">
        <Link href="/" className="group flex items-center gap-3" aria-label={`${siteConfig.name} home`}>
          <Image
            src={schoolImages.logo}
            alt=""
            width={52}
            height={52}
            className="h-11 w-11 rounded-full object-cover ring-2 ring-white/20 lg:h-12 lg:w-12"
            priority
          />
          <div className="flex flex-col">
            <span
              className={cn(
                "text-lg font-bold tracking-tight lg:text-xl",
                scrolled ? "text-primary" : "text-white"
              )}
            >
              Tomhel
            </span>
            <span
              className={cn(
                "max-w-[140px] text-[9px] font-medium uppercase leading-tight tracking-[0.15em] sm:max-w-none lg:text-[10px] lg:tracking-[0.2em]",
                scrolled ? "text-muted" : "text-white/70"
              )}
            >
              {siteConfig.slogan}
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:text-accent",
                pathname === item.href
                  ? "text-accent"
                  : scrolled
                    ? "text-primary/80"
                    : "text-white/90"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Button variant="taim" asChild>
            <Link href="/admissions">Apply Now</Link>
          </Button>
        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center rounded-lg p-2 lg:hidden"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className={cn("h-6 w-6", !scrolled && "text-white")} /> : <Menu className={cn("h-6 w-6", !scrolled && "text-white")} />}
        </button>
      </div>

      {open && (
        <nav
          id="mobile-menu"
          className="border-t border-border bg-background px-6 py-4 lg:hidden"
          aria-label="Mobile navigation"
        >
          <div className="flex flex-col gap-1">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-3 py-3 text-base font-medium",
                  pathname === item.href ? "bg-surface text-accent" : "text-primary"
                )}
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
              <Button variant="taim" asChild className="w-full">
                <Link href="/admissions">Apply Now</Link>
              </Button>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
