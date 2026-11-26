import type { Metadata } from "next";
import Link from "next/link";
import { DataTable } from "@/components/prep/data-table";
import { PageHeading, PrepCard } from "@/components/prep/ui";
import { requireRole } from "@/lib/prep/auth/current-user";
import { formatDayTime } from "@/lib/prep/format";
import { classReport, reportClasses, type WorkPart } from "@/lib/prep/reports";
import { getStore } from "@/lib/prep/store";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Student progress" };

const pct = (p: number | null) => (p === null ? "—" : `${p}%`);
const work = (w: WorkPart) => (w.set ? `${w.done}/${w.set} done · ${pct(w.average)}` : "None set");

/** A class at a glance: each student's BECE Prep, quizzes and assignments in the teacher's subjects. */
export default async function StudentProgressPage({ searchParams }: { searchParams: Promise<{ class?: string }> }) {
  const user = await requireRole("teacher");
  const store = getStore();
  const classes = await reportClasses(store, user);
  const wanted = (await searchParams).class;
  const current = classes.find((c) => c.id === wanted) ?? classes[0];
  const report = current ? await classReport(store, user, current.id) : null;

  return (
    <>
      <PageHeading title="Student progress" description="BECE Prep, quizzes and assignments for each student, in the subjects you teach them." />
      {!classes.length ? (
        <PrepCard className="text-prep-muted">You aren&apos;t assigned to a class yet. Ask the admin to add your subjects and classes.</PrepCard>
      ) : (
        <div className="space-y-5">
          <nav aria-label="Classes" className="flex flex-wrap gap-2">
            {classes.map((c) => (
              <Link
                key={c.id}
                href={`/prep/teacher/students?class=${c.id}`}
                aria-current={c.id === current?.id ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-xl border px-4 text-sm font-semibold",
                  c.id === current?.id ? "border-prep-primary bg-prep-primary-soft text-prep-ink" : "border-prep-line bg-prep-surface text-prep-muted hover:text-prep-ink",
                )}
              >
                {c.name} <span className="ml-1.5 font-normal">({c.students})</span>
              </Link>
            ))}
          </nav>
          {report ? (
            <>
              {report.subjectNames ? <p className="text-sm text-prep-muted">Your subjects for {report.schoolClass.name}: {report.subjectNames.join(", ")}.</p> : null}
              {report.rows.length ? (
                <DataTable
                  caption={`Progress in ${report.schoolClass.name}`}
                  headers={["Student", "BECE Prep", "Quizzes", "Assignments", "Missed", "Last active"]}
                  rows={report.rows.map(({ student, report: r }) => {
                    const missed = r.quizzes.missed + r.assignments.missed;
                    return [
                      <Link key="n" href={`/prep/teacher/students/${student.id}`} className="font-semibold text-prep-primary hover:underline">
                        {student.name}
                        <span className="block text-xs font-normal text-prep-muted">{student.loginId}</span>
                      </Link>,
                      r.bece.done ? `${r.bece.done} done · ${pct(r.bece.average)}` : "None yet",
                      work(r.quizzes),
                      work(r.assignments),
                      <span key="m" className={missed ? "font-semibold text-prep-incorrect" : undefined}>
                        {missed}
                      </span>,
                      r.lastActive ? formatDayTime(r.lastActive) : "Never",
                    ];
                  })}
                />
              ) : (
                <PrepCard className="text-prep-muted">No students in {report.schoolClass.name} yet.</PrepCard>
              )}
            </>
          ) : null}
        </div>
      )}
    </>
  );
}
