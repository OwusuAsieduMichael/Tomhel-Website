import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PrepCard, prepButton } from "@/components/prep/ui";
import { listAssignments } from "@/lib/prep/assignments";
import { requireRole } from "@/lib/prep/auth/current-user";
import { formatDayTime } from "@/lib/prep/format";
import { getStore } from "@/lib/prep/store";
import { StateBadge } from "./state-badge";

export const metadata: Metadata = { title: "Assignments" };

export default async function AssignmentsPage() {
  const user = await requireRole("teacher");
  const now = new Date();
  const assignments = await listAssignments(getStore(), user, now);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Assignments</h1>
          <p className="mt-1 text-prep-muted">Past papers you set for your classes, with who has done them.</p>
        </div>
        <Link href="/prep/teacher/assignments/new" className={prepButton()}>
          <Plus aria-hidden /> New assignment
        </Link>
      </div>

      {assignments.length === 0 ? (
        <PrepCard className="text-prep-muted">
          Nothing set yet.{" "}
          <Link href="/prep/teacher/assignments/new" className="font-semibold text-prep-primary underline">
            Set a past paper
          </Link>{" "}
          for one or more of your classes.
        </PrepCard>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {assignments.map((a) => {
            const pct = a.students ? Math.round((a.submitted / a.students) * 100) : 0;
            return (
              <li key={a.id}>
                <Link
                  href={`/prep/teacher/assignments/${a.id}`}
                  className="flex flex-col gap-3 rounded-2xl border border-prep-line bg-prep-surface p-4 hover:border-prep-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-prep-primary sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold">{a.title}</span>
                      <StateBadge state={a.state} />
                    </div>
                    <span className="text-[13px] text-prep-muted">
                      {a.subject} · {a.classes.join(", ")} ·{" "}
                      {a.state === "scheduled" ? `opens ${formatDayTime(a.opensAt)}` : a.state === "closed" ? `closed ${formatDayTime(a.closesAt)}` : `closes ${formatDayTime(a.closesAt)}`}
                    </span>
                  </div>
                  {a.state !== "draft" ? (
                    <div className="flex min-w-[160px] flex-col gap-1.5">
                      <span className="text-sm font-semibold tabular-nums">
                        {a.submitted} of {a.students} submitted
                      </span>
                      <div className="h-2 overflow-hidden rounded-full bg-prep-track" aria-hidden>
                        <div className="h-full rounded-full bg-prep-primary" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
