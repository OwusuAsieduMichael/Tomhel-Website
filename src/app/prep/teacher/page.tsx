import type { Metadata } from "next";
import { PageHeading, PrepCard } from "@/components/prep/ui";
import { requireRole } from "@/lib/prep/auth/current-user";
import { getStore } from "@/lib/prep/store";
import { getTeacherSubjectsWithClasses } from "@/lib/prep/queries";

export const metadata: Metadata = { title: "Dashboard" };

export default async function TeacherDashboard() {
  const user = await requireRole("teacher");
  const rows = await getTeacherSubjectsWithClasses(getStore(), user.id);

  // Group class assignments under each subject.
  const bySubject = new Map<string, { name: string; manual: boolean; classes: string[] }>();
  for (const r of rows) {
    const entry = bySubject.get(r.subjectId) ?? { name: r.subjectName, manual: !r.autoMarkTheory, classes: [] };
    entry.classes.push(r.className ?? "All classes");
    bySubject.set(r.subjectId, entry);
  }

  return (
    <>
      <PageHeading title={`Welcome, ${user.name}`} description="Your subjects and classes." />
      {bySubject.size === 0 ? (
        <PrepCard className="text-prep-muted">No subjects have been assigned to you yet. Ask the admin to add them.</PrepCard>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {[...bySubject.entries()].map(([id, s]) => (
            <li key={id}>
              <PrepCard className="h-full">
                <h2 className="font-bold">{s.name}</h2>
                <p className="mt-1 text-sm text-prep-muted">{s.classes.join(", ")}</p>
                {s.manual ? (
                  <p className="mt-3 inline-block rounded-lg bg-prep-misspelt-bg px-2 py-1 text-xs font-semibold text-prep-misspelt">
                    Theory answers are marked by you
                  </p>
                ) : null}
              </PrepCard>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
