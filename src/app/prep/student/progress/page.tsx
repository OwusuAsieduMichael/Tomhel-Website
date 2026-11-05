import type { Metadata } from "next";
import Link from "next/link";
import { PageHeading, PrepCard } from "@/components/prep/ui";
import { requireRole } from "@/lib/prep/auth/current-user";
import { listStudentAttempts } from "@/lib/prep/practice/attempts";
import { getStore } from "@/lib/prep/store";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Progress" };

const dateFmt = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Africa/Accra" });

export default async function ProgressPage() {
  const user = await requireRole("student");
  const attempts = await listStudentAttempts(getStore(), user.id);
  const done = attempts.filter((a) => a.status === "submitted" && a.maxScore);
  const average = done.length
    ? Math.round((done.reduce((s, a) => s + (a.score ?? 0) / Math.max(1, (a.maxScore ?? 0) - (a.pendingMarks ?? 0)), 0) / done.length) * 100)
    : null;

  return (
    <>
      <PageHeading title="Progress" description="Every paper you have practised." />
      {attempts.length === 0 ? (
        <PrepCard className="text-prep-muted">
          Nothing yet.{" "}
          <Link href="/prep/student/academic/bece" className="font-semibold text-prep-primary underline">
            Start a past paper
          </Link>{" "}
          and your scores appear here.
        </PrepCard>
      ) : (
        <div className="space-y-4">
          {average !== null ? (
            <dl className="grid grid-cols-2 gap-3">
              <PrepCard>
                <dt className="text-sm text-prep-muted">Papers finished</dt>
                <dd className="mt-1 text-3xl font-bold tabular-nums">{done.length}</dd>
              </PrepCard>
              <PrepCard>
                <dt className="text-sm text-prep-muted">Average score</dt>
                <dd className="mt-1 text-3xl font-bold tabular-nums">{average}%</dd>
              </PrepCard>
            </dl>
          ) : null}
          <ul className="space-y-2.5">
            {attempts.map((a) => {
              const marked = (a.maxScore ?? 0) - (a.pendingMarks ?? 0);
              const pct = a.status === "submitted" && marked > 0 ? Math.round(((a.score ?? 0) / marked) * 100) : null;
              return (
                <li key={a.id}>
                  <Link
                    href={a.status === "submitted" ? `/prep/practice/${a.id}/results` : `/prep/practice/${a.id}`}
                    className="flex items-center gap-3 rounded-xl border border-prep-line bg-prep-surface p-3.5 hover:border-prep-primary"
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="font-bold">{a.title}</span>
                      <span className="text-[13px] text-prep-muted">
                        {dateFmt.format(a.startedAt)} · {a.mode === "practice" ? "Practice" : "Full paper"}
                        {a.pendingMarks ? " · some marks with your teacher" : ""}
                      </span>
                    </div>
                    {a.status === "in_progress" ? (
                      <span className="rounded-full bg-prep-misspelt-bg px-2.5 py-1 text-xs font-bold text-prep-misspelt">Continue</span>
                    ) : (
                      <span
                        className={cn(
                          "text-sm font-bold tabular-nums",
                          pct === null ? "text-prep-muted" : pct >= 70 ? "text-prep-awarded" : pct >= 40 ? "text-prep-flag-ink" : "text-prep-incorrect",
                        )}
                      >
                        {a.score ?? 0}/{marked}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}
