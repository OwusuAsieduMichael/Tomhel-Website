import { cn } from "@/lib/utils";

interface BelowHeroShellProps {
  children: React.ReactNode;
  className?: string;
}

/** Wraps page content below the hero with the school's section background texture. */
export function BelowHeroShell({ children, className }: BelowHeroShellProps) {
  return <div className={cn("bg-section-texture", className)}>{children}</div>;
}
