"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface BackLinkProps {
  href?: string;
  label?: string;
  className?: string;
}

export function BackLink({
  href,
  label = "Back",
  className,
}: BackLinkProps) {
  const router = useRouter();
  const styles = cn(
    "inline-flex items-center gap-2 text-sm font-medium transition-colors text-muted hover:text-accent",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={styles}>
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {label}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
        } else {
          router.push("/");
        }
      }}
      className={cn(styles, "cursor-pointer bg-transparent p-0")}
    >
      <ArrowLeft className="h-4 w-4" aria-hidden />
      {label}
    </button>
  );
}
