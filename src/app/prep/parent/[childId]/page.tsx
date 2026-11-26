import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { PrepCard } from "@/components/prep/ui";
import { requireRole } from "@/lib/prep/auth/current-user";
import { fmtMarks, formatDayTime } from "@/lib/prep/format";
import { childOverview, percent } from "@/lib/prep/parent-view";
import { childOf, ParentError } from "@/lib/prep/parents";
import { getStudentClass } from "@/lib/prep/queries";
import { getStore } from "@/lib/prep/store";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Child's work" };

const scoreTone = (pct: number | null) =>
  pct === null ? "text-prep-muted" : pct >= 70 ? "text-prep-awarded" : pct >= 40 ? "text-prep-flag-ink" : "text-prep-incorrect";

export default async function ChildPage({ params }: { params: Promise<{ childId: string }> }) {
  const user = await requireRole("parent");
  const { childId } = await params;
  if (!z.string().uuid().safeParse(childId).success) notFound();
  const store = getStore();
  let child;
  try {
    child = await childOf(store, user.id, childId);
  } catch (e) {
    if (e instanceof ParentError) notFound();
    throw e;
  }
  const [schoolClass, { practice, work, summary }] = await Promise.all([getStudentClass(store, child.classId), childOverview(store, child)]);
  const quizzes = work.filter((w) => w.category === "quiz");
  const assignments = work.filter((w) => w.category === "assignment");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/prep/parent" aria-label="Back to my children" className="-ml-3 flex size-11 items-center justify-center rounded-xl hover:bg-prep-primary-soft">
          <ChevronLeft className="size-[22px]" aria-hidden />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{child.name}</h1>
          <p className="text-sm text-prep-muted">
            {child.loginId}
            {schoolClass ? ` · ${schoolClass.name}` : ""}
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3">
        <PrepCard>
          <dt className="text-sm text-prep-muted">Papers finished</dt>
          <dd className="mt-1 text-3xl font-bold tabular-nums">{summary.finished}</dd>
        </PrepCard>
        <PrepCard>
          <dt className="text-sm text-prep-muted">Average score</dt>
          <dd className="mt-1 text-3xl font-bold tabular-nums">{summary.average !== null ? `${summary.average}%` : "—"}</dd>
        </PrepCard>
      </dl>

      <WorkSection title="Quizzes" items={quizzes} empty="No quizzes set yet." />
      <WorkSection title="Assignments" items={assignments} empty="No assignments set yet." />

      <section aria-labelledby="bece-heading" className="space-y-2.5">
        <h2 id="bece-heading" className="text-lg font-bold">
          BECE practice
        </h2>
        {practice.length ? (
          <ul className="space-y-2.5">
            {practice.map((a) => {
              const pct = percent(a);
              const marked = (a.maxScore ?? 0) - (a.pendingMarks ?? 0);
              const row = (
                <>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="font-bold">{a.title}</span>
                    <span className="text-[13px] text-prep-muted">
                      {formatDayTime(a.startedAt)} · {a.mode === "practice" ? "Practice" : "Full paper"}
                      {a.pendingMarks ? " · some marks with the teacher" : ""}
                    </span>
                  </div>
                  <span className={cn("text-sm font-bold tabular-nums", a.status === "in_progress" ? "text-prep-misspelt" : scoreTone(pct))}>
                    {a.status === "in_progress" ? "Not finished" : marked > 0 ? `${fmtMarks(a.score ?? 0)}/${fmtMarks(marked)}` : "Marking"}
                  </span>
                </>
              );
              return (
                <li key={a.id}>
                  {a.status === "submitted" ? (
                    <Link href={`/prep/practice/${a.id}/results`} className="flex items-center gap-3 rounded-xl border border-prep-line bg-prep-surface p-3.5 hover:border-prep-primary">
                      {row}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3 rounded-xl border border-prep-line bg-prep-surface p-3.5">{row}</div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <PrepCard className="text-prep-muted">No BECE past papers practised yet.</PrepCard>
        )}
      </section>
    </div>
  );
}

type Work = Awaited<ReturnType<typeof childOverview>>["work"][number];

function WorkSection({ title, items, empty }: { title: string; items: Work[]; empty: string }) {
  const id = `${title.toLowerCase()}-heading`;
  return (
    <section aria-labelledby={id} className="space-y-2.5">
      <h2 id={id} className="text-lg font-bold">
        {title}
      </h2>
      {items.length ? (
        <ul className="space-y-2.5">
          {items.map((w) => {
            const done = w.status === "submitted";
            const pct = done ? percent({ status: "submitted", score: w.score, maxScore: w.maxScore, pendingMarks: w.pendingMarks }) : null;
            const marked = (w.maxScore ?? 0) - (w.pendingMarks ?? 0);
            const label = done
              ? marked > 0
                ? `${fmtMarks(w.score ?? 0)}/${fmtMarks(marked)}`
                : "Marking"
              : w.state === "closed"
                ? "Not done"
                : w.state === "scheduled"
                  ? `Opens ${formatDayTime(w.opensAt)}`
                  : `Due ${formatDayTime(w.closesAt)}`;
            const row = (
              <>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="font-bold">{w.title}</span>
                  <span className="text-[13px] text-prep-muted">
                    {w.subject}
                    {w.paper ? ` · ${w.paper}` : ""}
                    {done && w.pendingMarks ? " · some marks with the teacher" : ""}
                  </span>
                </div>
                <span className={cn("text-sm font-bold tabular-nums", done ? scoreTone(pct) : w.state === "closed" ? "text-prep-incorrect" : "text-prep-muted")}>{label}</span>
              </>
            );
            return (
              <li key={w.id}>
                {done && w.resultAttemptId ? (
                  <Link href={`/prep/practice/${w.resultAttemptId}/results`} className="flex items-center gap-3 rounded-xl border border-prep-line bg-prep-surface p-3.5 hover:border-prep-primary">
                    {row}
                  </Link>
                ) : (
                  <div className="flex items-center gap-3 rounded-xl border border-prep-line bg-prep-surface p-3.5">{row}</div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <PrepCard className="text-prep-muted">{empty}</PrepCard>
      )}
    </section>
  );
}
