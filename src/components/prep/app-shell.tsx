import Image from "next/image";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { logoutAction } from "@/app/prep/actions";
import type { SessionUser } from "@/lib/prep/auth/session";
import { navByRole, roleLabel } from "@/lib/prep/nav";
import { schoolImages } from "@/lib/constants";
import { PrepNav } from "./prep-nav";

/**
 * Signed-in layout for every role: top bar, side nav on desktop, bottom tab bar on phones.
 * Only receives already-authorised users (the role layouts call requireRole first).
 */
export function AppShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const items = navByRole[user.role];

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <a
        href="#prep-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-prep-surface focus:px-4 focus:py-3 focus:font-semibold"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-30 border-b border-prep-line bg-prep-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
          <Link href={items[0].href} className="flex min-h-11 items-center gap-2.5" aria-label="BECE Prep home">
            <Image src={schoolImages.logo} alt="" width={36} height={36} className="h-9 w-9 rounded-full object-cover" />
            <span className="font-bold">BECE Prep</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold leading-tight">{user.name}</p>
              <p className="text-xs text-prep-muted">
                {roleLabel[user.role]} · {user.loginId}
              </p>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-prep-muted hover:bg-prep-ground hover:text-prep-ink"
              >
                <LogOut className="size-4" aria-hidden />
                <span>Log out</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-8 px-4 md:py-8">
        <PrepNav items={items} variant="side" />
        <main id="prep-main" className="min-w-0 flex-1 py-6 md:py-0">
          {children}
        </main>
      </div>

      <PrepNav items={items} variant="bottom" />
    </div>
  );
}
