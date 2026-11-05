"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { academicTabs, isActive } from "@/lib/prep/nav";
import { cn } from "@/lib/utils";

/** BECE / Quiz / Exams, underlined like the design. Links (not ARIA tabs) because each one is its own page. */
export function AcademicTabs({ openExams = 0 }: { openExams?: number }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Academic Preparation">
      <ul className="flex gap-6 border-b border-prep-line">
        {academicTabs.map((tab) => {
          const active = isActive(tab, pathname, false);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px flex min-h-11 items-center gap-1.5 border-b-[3px] px-0.5 text-[15px]",
                  active ? "border-prep-primary font-bold text-prep-primary" : "border-transparent font-semibold text-prep-muted hover:text-prep-ink",
                )}
              >
                {tab.label}
                {tab.label === "Exams" && openExams > 0 ? (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-prep-misspelt px-1.5 text-xs font-bold text-white">
                    {openExams}
                    <span className="sr-only"> open</span>
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
