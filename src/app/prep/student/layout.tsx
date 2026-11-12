import { AppShell } from "@/components/prep/app-shell";
import { requireRole } from "@/lib/prep/auth/current-user";
import { unreadNoticeCount } from "@/lib/prep/notices";
import { getStore } from "@/lib/prep/store";

export const dynamic = "force-dynamic";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("student");
  const unread = await unreadNoticeCount(getStore(), user.id);
  return (
    <AppShell user={user} badges={{ "/prep/student": unread }}>
      {children}
    </AppShell>
  );
}
