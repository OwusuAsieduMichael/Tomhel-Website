import type { Metadata } from "next";
import Link from "next/link";
import { PrintButton } from "@/components/prep/print-button";
import { ProgressReport } from "@/components/prep/progress-report";
import { PageHeading } from "@/components/prep/ui";
import { requireRole } from "@/lib/prep/auth/current-user";
import { formatDayTime } from "@/lib/prep/format";
import { listStudentAttempts } from "@/lib/prep/practice/attempts";
import { fullReport } from "@/lib/prep/reports";
import { getStore } from "@/lib/prep/store";

export const metadata: Metadata = { title: "Progress" };

export default async function ProgressPage() {
  const user = await requireRole("student");
  const store = getStore();
  const [report, attempts] = await Promise.all([fullReport(store, user), listStudentAttempts(store, user.id)]);
  const unfinished = attempts.filter((a) => a.status === "in_progress" && !a.assigned);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeading title="Progress" description="Your BECE Prep, quizzes and assignments." />
        <PrintButton />
      </div>
      {unfinished.length ? (
        <ul className="mb-6 space-y-2 print:hidden">
          {unfinished.map((a) => (
            <li key={a.id}>
              <Link href={`/prep/practice/${a.id}`} className="flex items-center gap-3 rounded-xl border border-prep-line bg-prep-surface p-3.5 hover:border-prep-primary">
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="font-bold">{a.title}</span>
                  <span className="text-[13px] text-prep-muted">Started {formatDayTime(a.startedAt)}</span>
                </span>
                <span className="rounded-full bg-prep-misspelt-bg px-2.5 py-1 text-xs font-bold text-prep-misspelt">Continue</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      <ProgressReport report={report} who="self" attemptHref={(id) => `/prep/practice/${id}/results`} />
    </>
  );
}
