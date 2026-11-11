import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, Inbox } from "lucide-react";
import { PageHeading, PrepCard } from "@/components/prep/ui";
import { listAssignments } from "@/lib/prep/assignments";
import { requireRole } from "@/lib/prep/auth/current-user";
import { getTeacherSubjectsWithClasses } from "@/lib/prep/queries";
import { listReviewQueue } from "@/lib/prep/review";
import { getStore } from "@/lib/prep/store";

export const metadata: Metadata = { title: "Dashboard" };

export default async function TeacherDashboard() {
  const user = await requireRole("teacher");
  const store = getStore();
  const [rows, queue, assignments] = await Promise.all([getTeacherSubjectsWithClasses(store, user.id), listReviewQueue(store, user), listAssignments(store, user)]);
  const open = assignments.filter((a) => a.state === "open");

  // Group class assignments under each subject.
  const bySubject = new Map<string, { name: string; manual: boolean; classes: string[] }>();
  for (const r of rows) {
    const entry = bySubject.get(r.subjectId) ?? { name: r.subjectName, manual: !r.autoMarkTheory, classes: [] };
    entry.classes.push(r.className ?? "All classes");
    bySubject.set(r.subjectId, entry);
  }

  const tiles = [
    {
      href: "/prep/teacher/review",
      Icon: Inbox,
      value: queue.length,
      label: queue.length === 1 ? "answer to mark" : "answers to mark",
      sub: queue.length ? "Oldest first in the review queue" : "Nothing waiting",
    },
    {
      href: "/prep/teacher/assignments",
      Icon: ClipboardList,
      value: open.length,
      label: open.length === 1 ? "assignment open" : "assignments open",
      sub: open.length ? open.map((a) => `${a.title}: ${a.submitted}/${a.students}`).slice(0, 2).join(" · ") : "Set a past paper for your classes",
    },
  ];

  return (
    <>
      <PageHeading title={`Welcome, ${user.name}`} description="Your subjects and classes." />
      <ul className="mb-6 grid gap-3 sm:grid-cols-2">
        {tiles.map(({ href, Icon, value, label, sub }) => (
          <li key={href}>
            <Link href={href} className="block h-full rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-prep-primary">
              <PrepCard className="flex h-full items-start gap-4 transition-colors hover:border-prep-primary">
                <Icon className="mt-1 size-6 shrink-0 text-prep-primary" aria-hidden />
                <div className="min-w-0">
                  <p>
                    <span className="text-2xl font-bold tabular-nums">{value}</span> <span className="font-semibold">{label}</span>
                  </p>
                  <p className="mt-0.5 truncate text-sm text-prep-muted">{sub}</p>
                </div>
              </PrepCard>
            </Link>
          </li>
        ))}
      </ul>

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
