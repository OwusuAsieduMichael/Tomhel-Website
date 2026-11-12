import type { Metadata } from "next";
import { DataTable } from "@/components/prep/data-table";
import { PageHeading } from "@/components/prep/ui";
import { requireRole } from "@/lib/prep/auth/current-user";
import { getStore } from "@/lib/prep/store";
import { listClassesWithCounts, listSubjectsWithTeachers } from "@/lib/prep/queries";

export const metadata: Metadata = { title: "Classes & subjects" };

export default async function ClassesPage() {
  await requireRole("admin");
  const store = getStore();
  const [classRows, subjectRows] = await Promise.all([listClassesWithCounts(store), listSubjectsWithTeachers(store)]);

  return (
    <div className="space-y-8">
      <PageHeading title="Classes & subjects" />

      <section aria-labelledby="classes-heading" className="space-y-3">
        <h2 id="classes-heading" className="text-lg font-bold">
          Classes
        </h2>
        <DataTable
          caption="Classes"
          headers={["Class", "Year group", "Academic year", "Students"]}
          rows={classRows.map((c) => [c.name, `JHS ${c.yearGroup}`, c.academicYear, c.students])}
        />
      </section>

      <section aria-labelledby="subjects-heading" className="space-y-3">
        <h2 id="subjects-heading" className="text-lg font-bold">
          Subjects
        </h2>
        <DataTable
          caption="Subjects"
          headers={["Subject", "Code", "Theory marking", "Teachers"]}
          rows={subjectRows.map((s) => [
            s.name,
            s.code,
            s.autoMarkTheory ? "AI, teacher can override" : "Teacher only",
            s.teachers.length ? s.teachers.join(", ") : "—",
          ])}
        />
      </section>
    </div>
  );
}
