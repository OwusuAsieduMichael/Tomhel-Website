import { AppShell } from "@/components/prep/app-shell";
import { requireRole } from "@/lib/prep/auth/current-user";

export const dynamic = "force-dynamic";

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("parent");
  return <AppShell user={user}>{children}</AppShell>;
}
