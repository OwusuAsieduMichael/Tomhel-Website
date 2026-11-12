import { AppShell } from "@/components/prep/app-shell";
import { requireRole } from "@/lib/prep/auth/current-user";
import { listReviewQueue } from "@/lib/prep/review";
import { getStore } from "@/lib/prep/store";

export const dynamic = "force-dynamic";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("teacher");
  const queue = await listReviewQueue(getStore(), user);
  return (
    <AppShell user={user} badges={{ "/prep/teacher/review": queue.length }}>
      {children}
    </AppShell>
  );
}
