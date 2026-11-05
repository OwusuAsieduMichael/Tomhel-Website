import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/prep/auth/current-user";
import { listStudentAttempts } from "@/lib/prep/practice/attempts";
import { getPracticePapersBySubject } from "@/lib/prep/queries";
import { getStore } from "@/lib/prep/store";
import { shortSubjectName } from "@/lib/prep/subjects";

export const metadata: Metadata = { title: "BECE past papers" };

export default async function BecePage() {
  const user = await requireRole("student");
  const store = getStore();
  const [subjects, attempts] = await Promise.all([getPracticePapersBySubject(store), listStudentAttempts(store, user.id)]);
  const unfinished = attempts.filter((a) => a.status === "in_progress");

  return (
    <div className="space-y-5">
      {unfinished.map((a) => (
        <div key={a.id} className="flex items-center gap-3 rounded-2xl bg-prep-primary p-4 text-white">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-xs font-semibold tracking-wide opacity-85">YOU STARTED THIS PAPER</span>
            <span className="text-[15px] font-bold">{a.title}</span>
            <span className="text-[13px] opacity-90">{a.mode === "practice" ? "Practice mode" : "Full paper"}</span>
          </div>
          <Link
            href={`/prep/practice/${a.id}`}
            className="flex min-h-11 items-center rounded-[10px] bg-white px-4 text-sm font-bold text-prep-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Continue
          </Link>
        </div>
      ))}

      <div className="flex items-baseline justify-between">
        <h2 className="text-[17px] font-bold">Past papers by subject</h2>
        <span className="text-[13px] text-prep-muted">{subjects.length} subjects</span>
      </div>

      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        {subjects.map((s) => {
          const years = [...new Set(s.papers.map((p) => p.year))];
          const kinds = [s.papers.some((p) => p.paperNo === 1) && "Objectives", s.papers.some((p) => p.paperNo === 2) && (s.autoMarkTheory ? "Theory" : "Theory to teacher")].filter(Boolean);
          return (
            <li key={s.id}>
              <Link
                href={`/prep/student/subjects/${s.code.toLowerCase()}`}
                className="flex h-full flex-col gap-1 rounded-xl border border-prep-line bg-prep-surface p-3 hover:border-prep-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-prep-primary"
              >
                <span className="text-sm font-bold">{shortSubjectName(s)}</span>
                <span className="text-xs text-prep-muted">{kinds.length ? kinds.join(" · ") : "No papers yet"}</span>
                {years.length ? (
                  <span className="text-xs text-prep-muted">
                    {years.length === 1 ? years[0] : `${Math.min(...years)}–${Math.max(...years)}`}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
