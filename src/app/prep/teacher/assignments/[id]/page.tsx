import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, Pencil } from "lucide-react";
import { z } from "zod";
import { DataTable } from "@/components/prep/data-table";
import { PrepCard, prepButton } from "@/components/prep/ui";
import { AssignmentError, getAssignmentTracker, type AssignmentTracker } from "@/lib/prep/assignments";
import { requireRole } from "@/lib/prep/auth/current-user";
import { fmtMarks, formatDayTime, formatTime, sameSchoolDay } from "@/lib/prep/format";
import { getStore } from "@/lib/prep/store";
import { cn } from "@/lib/utils";
import { StateBadge } from "../state-badge";
import { DeleteAssignmentButton, ReleaseSolutionsButton, RemindButton } from "./tracker-actions";

export const metadata: Metadata = { title: "Submission tracker" };
export const dynamic = "force-dynamic";

const FILTERS = ["all", "submitted", "in_progress", "not_started"] as const;
type Filter = (typeof FILTERS)[number];
type Row = AssignmentTracker["rows"][number];

const statusChip: Record<Row["status"], { label: string; className: string }> = {
  submitted: { label: "Submitted", className: "bg-prep-primary-soft text-prep-awarded" },
  in_progress: { label: "In progress", className: "bg-prep-misspelt-bg text-prep-flag-ink" },
  not_started: { label: "Not started", className: "bg-prep-track text-prep-muted" },
};

const solutionsText = {
  after_submit: "solutions after submitting",
  after_close: "solutions after the close",
  on_release: "solutions when you release them",
  instant: "marked as students answer",
};

export default async function TrackerPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ status?: string }> }) {
  const user = await requireRole("teacher");
  const { id } = await params;
  const { status } = await searchParams;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const filter: Filter = FILTERS.includes(status as Filter) ? (status as Filter) : "all";

  const now = new Date();
  let t: AssignmentTracker;
  try {
    t = await getAssignmentTracker(getStore(), user, id, now);
  } catch (e) {
    if (e instanceof AssignmentError) notFound();
    throw e;
  }
  const { assignment: a, summary } = t;
  const shown = filter === "all" ? t.rows : t.rows.filter((r) => r.status === filter);
  const pct = summary.total ? Math.round((summary.submitted / summary.total) * 100) : 0;
  const counts: Record<Filter, number> = { all: summary.total, submitted: summary.submitted, in_progress: summary.inProgress, not_started: summary.notStarted };
  const filterLabel: Record<Filter, string> = { all: "All", submitted: "Submitted", in_progress: "In progress", not_started: "Not started" };
  const when =
    t.state === "scheduled" ? `opens ${formatDayTime(a.opensAt)}` : t.state === "open" ? `open until ${formatDayTime(a.closesAt)}` : t.state === "closed" ? `closed ${formatDayTime(a.closesAt)}` : "not published";

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <Link href="/prep/teacher/assignments" className="text-sm font-semibold text-prep-primary hover:underline">
            Quizzes & assignments
          </Link>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{a.title}</h1>
            <StateBadge state={t.state} />
          </div>
          <span className="text-sm text-prep-muted">
            {a.category === "quiz" ? "Quiz" : "Assignment"} · {t.subject.name}
            {` · ${t.description}`} · {t.classes.map((c) => c.name).join(", ")} ·{" "}
            {a.timeLimitMinutes ? `${a.timeLimitMinutes} min` : "no time limit"} · {when}
          </span>
          <span className="text-[13px] text-prep-muted">
            {a.attemptPolicy === "best" ? "Several attempts, best score counts" : "One attempt"} · {solutionsText[a.solutions]}
            {a.solutions === "on_release" && a.solutionsReleasedAt ? ` (released ${formatDayTime(a.solutionsReleasedAt)})` : ""}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {t.state === "open" && summary.submitted < summary.total ? (
            <RemindButton id={a.id} waiting={summary.total - summary.submitted} disabled={!t.canRemind} remindedAt={a.remindedAt ? formatTime(a.remindedAt) : null} />
          ) : null}
          {a.solutions === "on_release" && !a.solutionsReleasedAt && a.status === "published" ? <ReleaseSolutionsButton id={a.id} /> : null}
          <Link href={`/prep/teacher/assignments/${a.id}/edit`} className={prepButton({ variant: "secondary" })}>
            <Pencil aria-hidden /> Edit
          </Link>
          {a.status === "published" ? (
            <a href={`/prep/teacher/assignments/${a.id}/export`} className={prepButton({ variant: "secondary" })}>
              <Download aria-hidden /> Export
            </a>
          ) : null}
          {summary.submitted + summary.inProgress === 0 ? <DeleteAssignmentButton id={a.id} /> : null}
        </div>
      </div>

      {a.status === "draft" ? (
        <PrepCard className="mb-5 border-dashed text-prep-muted">
          This is a draft: students can&apos;t see it yet.{" "}
          <Link href={`/prep/teacher/assignments/${a.id}/edit`} className="font-semibold text-prep-primary underline">
            Edit and publish
          </Link>
        </PrepCard>
      ) : null}

      <dl className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Submitted" value={summary.submitted} sub={`of ${summary.total}`} note={`${pct}%`} />
        <Stat label="In progress" value={summary.inProgress} />
        <Stat label="Not started" value={summary.notStarted} />
        <Stat label="Auto-submitted" value={summary.autoSubmitted} />
        <Stat
          label="Average score"
          value={summary.averageScore === null ? "—" : fmtMarks(Math.round(summary.averageScore * 10) / 10)}
          sub={t.paper && summary.averageScore !== null ? `/ ${t.paper.marks}` : undefined}
          note={summary.waitingForMarking ? `${summary.waitingForMarking} waiting for marking` : undefined}
        />
      </dl>

      {t.classes.length ? (
        <section aria-labelledby="by-class" className="mb-5 rounded-2xl border border-prep-line bg-prep-surface p-5">
          <h2 id="by-class" className="mb-4 font-bold">
            By class
          </h2>
          <div className="flex flex-col gap-4">
            {t.classes.map((c) => (
              <div key={c.id} className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                  <span className="font-semibold">{c.name}</span>
                  <span className="text-prep-muted">
                    {c.submitted} submitted · {c.inProgress} in progress · {c.notStarted} not started · of {c.total}
                  </span>
                </div>
                <div className="flex h-2.5 overflow-hidden rounded-full bg-prep-track" aria-hidden>
                  <div className="h-full bg-prep-primary" style={{ width: `${c.total ? (c.submitted / c.total) * 100 : 0}%` }} />
                  <div className="h-full bg-prep-misspelt" style={{ width: `${c.total ? (c.inProgress / c.total) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-prep-muted">
            <Legend className="bg-prep-primary" label="Submitted" />
            <Legend className="bg-prep-misspelt" label="In progress" />
            <Legend className="bg-prep-track" label="Not started" />
          </div>
        </section>
      ) : null}

      <section aria-label="Students">
        <nav aria-label="Filter students" className="mb-3 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Link
              key={f}
              href={f === "all" ? `/prep/teacher/assignments/${a.id}` : `/prep/teacher/assignments/${a.id}?status=${f}`}
              aria-current={filter === f ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold",
                filter === f ? "border-prep-primary bg-prep-primary text-white" : "border-prep-input bg-prep-surface hover:bg-prep-ground",
              )}
            >
              {filterLabel[f]} {counts[f]}
            </Link>
          ))}
        </nav>
        {shown.length === 0 ? (
          <PrepCard className="text-prep-muted">No students here.</PrepCard>
        ) : (
          <DataTable
            caption={`Students: ${filterLabel[filter]}`}
            headers={["Student", "Class", "Status", "Started", "Submitted", "Time taken", "Score"]}
            rows={shown.map((r) => [
              <span key="n" className="font-semibold">
                {r.attemptId && r.status === "submitted" ? (
                  <Link href={`/prep/teacher/attempts/${r.attemptId}`} className="text-prep-primary underline-offset-2 hover:underline">
                    {r.name}
                  </Link>
                ) : (
                  r.name
                )}
                <span className="block text-xs font-normal text-prep-muted">{r.loginId}</span>
              </span>,
              r.className,
              <span key="s" className={cn("inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold", statusChip[r.status].className)}>
                {statusChip[r.status].label}
                {r.autoSubmitted ? " (auto)" : ""}
              </span>,
              r.startedAt ? formatDayTime(r.startedAt) : "—",
              r.submittedAt ? (r.startedAt && sameSchoolDay(r.startedAt, r.submittedAt) ? formatTime(r.submittedAt) : formatDayTime(r.submittedAt)) : "—",
              r.minutes === null ? "—" : r.status === "in_progress" ? `${r.minutes} min so far` : `${r.minutes} min`,
              <span key="sc" className="whitespace-nowrap font-semibold tabular-nums">
                {r.score === null ? "—" : `${fmtMarks(r.score)} / ${fmtMarks(r.maxScore ?? 0)}`}
                {r.pendingMarks ? <span className="block text-xs font-normal text-prep-flag-ink">{fmtMarks(r.pendingMarks)} to mark</span> : null}
                {r.attemptCount > 1 ? <span className="block text-xs font-normal text-prep-muted">best of {r.attemptCount}</span> : null}
              </span>,
            ])}
          />
        )}
      </section>
    </>
  );
}

function Stat({ label, value, sub, note }: { label: string; value: number | string; sub?: string; note?: string }) {
  return (
    <div className="rounded-2xl border border-prep-line bg-prep-surface p-4">
      <dt className="text-sm text-prep-muted">{label}</dt>
      <dd className="mt-1">
        <span className="text-2xl font-bold tabular-nums">{value}</span>
        {sub ? <span className="ml-1 text-sm text-prep-muted">{sub}</span> : null}
        {note ? <span className="block text-xs font-semibold text-prep-muted">{note}</span> : null}
      </dd>
    </div>
  );
}

const Legend = ({ className, label }: { className: string; label: string }) => (
  <span className="flex items-center gap-1.5">
    <span className={cn("size-2.5 rounded-full", className)} aria-hidden />
    {label}
  </span>
);
