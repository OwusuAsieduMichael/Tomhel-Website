"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BookOpen, ClipboardList, Home, Inbox, Library, School, User, Users, type LucideIcon } from "lucide-react";
import { isActive, type NavIcon, type NavItem } from "@/lib/prep/nav";
import { cn } from "@/lib/utils";

const icons: Record<NavIcon, LucideIcon> = {
  home: Home,
  book: BookOpen,
  chart: BarChart3,
  user: User,
  clipboard: ClipboardList,
  inbox: Inbox,
  users: Users,
  school: School,
  library: Library,
};

export function PrepNav({ items, variant }: { items: NavItem[]; variant: "side" | "bottom" }) {
  const pathname = usePathname();

  if (variant === "side") {
    return (
      <nav aria-label="Main" className="hidden w-56 shrink-0 md:block">
        <ul className="sticky top-24 space-y-1">
          {items.map((item, i) => {
            const active = isActive(item, pathname, i === 0);
            const Icon = icons[item.icon];
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold",
                    active ? "bg-prep-primary-soft text-prep-primary" : "text-prep-muted hover:bg-prep-surface hover:text-prep-ink",
                  )}
                >
                  <Icon className="size-5" aria-hidden />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-prep-line bg-prep-surface pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="flex">
        {items.map((item, i) => {
          const active = isActive(item, pathname, i === 0);
          const Icon = icons[item.icon];
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[11px] font-semibold leading-tight",
                  active ? "text-prep-primary" : "text-prep-muted",
                )}
              >
                <Icon className={cn("size-5", active && "stroke-[2.5]")} aria-hidden />
                <span className="text-center">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
