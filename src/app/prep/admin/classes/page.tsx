import type { Metadata } from "next";
import { DataTable } from "@/components/prep/data-table";
import { PageHeading, PrepCard } from "@/components/prep/ui";
import { listTeachingAssignments } from "@/lib/prep/admin/teaching";
import { requireRole } from "@/lib/prep/auth/current-user";
import { getStore } from "@/lib/prep/store";
import { listClassesWithCounts, listPeople, listSubjectsWithTeachers } from "@/lib/prep/queries";
import { unassignTeacherAction } from "../actions";
import { AddClassForm, AssignTeacherForm } from "./teaching-forms";

export const metadata: Metadata = { title: "Classes & subjects" };

export default async function ClassesPage() {
  await requireRole("admin");
  const store = getStore();
  const [classRows, subjectRows, assignments, people] = await Promise.all([
    listClassesWithCounts(store),
    listSubjectsWithTeachers(store),
    listTeachingAssignments(store),
    listPeople(store),
  ]);
  const teachers = people.filter((p) => p.role === "teacher" && p.active).map((p) => ({ id: p.id, name: p.name, loginId: p.loginId }));
  const latestYear = [...classRows.map((c) => c.academicYear)].sort().at(-1) ?? "2026/2027";

  return (
    <div className="space-y-8">
      <PageHeading title="Classes & subjects" description="Who teaches what. A teacher can only set work and mark for the subjects and classes assigned here." />

      <section aria-labelledby="assign-heading" className="space-y-3">
        <h2 id="assign-heading" className="text-lg font-bold">
          Assign a teacher
        </h2>
        <PrepCard>
          <AssignTeacherForm teachers={teachers} subjects={subjectRows.map((s) => ({ id: s.id, name: s.name }))} classes={classRows.map((c) => ({ id: c.id, name: c.name }))} />
        </PrepCard>
        {assignments.length ? (
          <DataTable
            caption="Teaching assignments"
            headers={["Teacher", "Subject", "Class", ""]}
            rows={assignments.map((a) => [
              <span key="t">
                {a.teacher} <span className="text-prep-muted">({a.teacherLoginId})</span>
              </span>,
              a.subject,
              a.className,
              <form key="r" action={unassignTeacherAction}>
                <input type="hidden" name="id" value={a.id} />
                <button type="submit" className="min-h-11 rounded-xl px-3 text-sm font-semibold text-prep-incorrect hover:bg-prep-incorrect-bg">
                  Remove
                </button>
              </form>,
            ])}
          />
        ) : (
          <p className="text-sm text-prep-muted">No teachers assigned yet.</p>
        )}
      </section>

      <section aria-labelledby="classes-heading" className="space-y-3">
        <h2 id="classes-heading" className="text-lg font-bold">
          Classes
        </h2>
        <DataTable
          caption="Classes"
          headers={["Class", "Year group", "Academic year", "Students"]}
          rows={classRows.map((c) => [c.name, `JHS ${c.yearGroup}`, c.academicYear, c.students])}
        />
        <PrepCard>
          <h3 className="mb-3 font-semibold">Add a class</h3>
          <AddClassForm defaultYear={latestYear} />
        </PrepCard>
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
            s.autoMarkTheory ? "Marked point by point, teacher can change" : "Teacher only",
            s.teachers.length ? s.teachers.join(", ") : "—",
          ])}
        />
      </section>
    </div>
  );
}
