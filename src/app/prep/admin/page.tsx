import type { Metadata } from "next";
import { PageHeading, PrepCard } from "@/components/prep/ui";
import { requireRole } from "@/lib/prep/auth/current-user";
import { getStore } from "@/lib/prep/store";
import { getAdminCounts } from "@/lib/prep/queries";

export const metadata: Metadata = { title: "Admin overview" };

export default async function AdminOverview() {
  await requireRole("admin");
  const c = await getAdminCounts(getStore());

  const stats = [
    { label: "Students", value: c.students },
    { label: "Teachers", value: c.teachers },
    { label: "Classes", value: c.classes },
    { label: "Past papers", value: c.papers },
    { label: "Approved questions", value: c.approvedQuestions },
    { label: "Draft questions", value: c.draftQuestions },
  ];

  return (
    <>
      <PageHeading title="School overview" />
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {stats.map((s) => (
          <PrepCard key={s.label}>
            <dt className="text-sm text-prep-muted">{s.label}</dt>
            <dd className="mt-1 text-3xl font-bold tabular-nums">{s.value}</dd>
          </PrepCard>
        ))}
      </dl>
    </>
  );
}
