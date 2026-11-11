import type { Metadata } from "next";
import Link from "next/link";
import { Bell, BookOpen, ClipboardList, Timer } from "lucide-react";
import { PageHeading, PrepCard } from "@/components/prep/ui";
import { listStudentAssignments } from "@/lib/prep/assignments";
import { requireRole } from "@/lib/prep/auth/current-user";
import { formatAgo, formatDayTime } from "@/lib/prep/format";
import { listNotices } from "@/lib/prep/notices";
import { getStudentClass } from "@/lib/prep/queries";
import { getStore } from "@/lib/prep/store";
import { cn } from "@/lib/utils";
import { markNoticesReadAction } from "./actions";

export const metadata: Metadata = { title: "Home" };

const shortcuts = [
  { href: "/prep/student/academic/bece", title: "BECE past papers", body: "Practise Paper 1 and Paper 2 by subject and year.", Icon: BookOpen },
  { href: "/prep/student/academic/quiz", title: "Topic quizzes", body: "Short quizzes on one topic at a time.", Icon: Timer },
  { href: "/prep/student/academic/exams", title: "Exams from teachers", body: "Work your teachers have set for you.", Icon: ClipboardList },
];

const DUE_SOON_MS = 48 * 3_600_000;

export default async function StudentHome() {
  const user = await requireRole("student");
  const store = getStore();
  const now = new Date();
  const [schoolClass, notices, work] = await Promise.all([getStudentClass(store, user.classId), listNotices(store, user.id, 8), listStudentAssignments(store, user, now)]);
  const firstName = user.name.split(" ")[0];
  const unread = notices.filter((n) => !n.readAt).length;
  const dueSoon = work.filter((a) => a.state === "open" && a.status !== "submitted" && a.closesAt.getTime() - now.getTime() < DUE_SOON_MS);

  return (
    <>
      <PageHeading title={`Hello, ${firstName}`} description={schoolClass ? `${schoolClass.name} · ${schoolClass.academicYear}` : undefined} />

      {dueSoon.length ? (
        <section aria-labelledby="due" className="mb-5 flex flex-col gap-2.5">
          <h2 id="due" className="text-sm font-bold tracking-wide text-prep-muted">
            DUE SOON
          </h2>
          {dueSoon.map((a) => (
            <Link
              key={a.id}
              href={a.runningAttemptId ? `/prep/practice/${a.runningAttemptId}` : "/prep/student/academic/exams"}
              className="flex items-center gap-3 rounded-2xl bg-prep-primary p-4 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-prep-primary"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[15px] font-bold">
                  {a.subject} · {a.title}
                </span>
                <span className="text-[13px] opacity-90">Closes {formatDayTime(a.closesAt)}</span>
              </div>
              <span className="rounded-[10px] bg-white px-4 py-2.5 text-sm font-bold text-prep-primary">{a.runningAttemptId ? "Continue" : "Open"}</span>
            </Link>
          ))}
        </section>
      ) : null}

      {notices.length ? (
        <section aria-labelledby="notices" className="mb-5 rounded-2xl border border-prep-line bg-prep-surface">
          <div className="flex items-center justify-between gap-3 border-b border-prep-line px-4 py-2">
            <h2 id="notices" className="flex items-center gap-2 font-bold">
              <Bell className="size-4 text-prep-primary" aria-hidden /> Messages
              {unread ? <span className="rounded-full bg-prep-primary px-2 text-xs leading-5 text-white">{unread} new</span> : null}
            </h2>
            {unread ? (
              <form action={markNoticesReadAction}>
                <button type="submit" className="min-h-11 rounded-xl px-3 text-sm font-semibold text-prep-primary hover:bg-prep-primary-soft">
                  Mark all as read
                </button>
              </form>
            ) : null}
          </div>
          <ul>
            {notices.map((n) => {
              const body = (
                <>
                  <span className="flex items-baseline justify-between gap-3">
                    <span className={cn("text-sm", n.readAt ? "font-semibold" : "font-bold")}>
                      {!n.readAt ? <span className="mr-2 inline-block size-2 rounded-full bg-prep-primary align-middle" aria-label="New" /> : null}
                      {n.title}
                    </span>
                    <span className="shrink-0 text-xs text-prep-muted">{formatAgo(n.createdAt, now)}</span>
                  </span>
                  {n.body ? <span className="text-[13px] text-prep-muted">{n.body}</span> : null}
                </>
              );
              return (
                <li key={n.id} className="border-b border-prep-line last:border-b-0">
                  {n.href ? (
                    <Link href={n.href} className="flex flex-col gap-0.5 px-4 py-3 hover:bg-prep-ground">
                      {body}
                    </Link>
                  ) : (
                    <div className="flex flex-col gap-0.5 px-4 py-3">{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shortcuts.map(({ href, title, body, Icon }) => (
          <li key={href}>
            <Link href={href} className="block h-full rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-prep-primary">
              <PrepCard className="h-full transition-colors hover:border-prep-primary">
                <Icon className="size-6 text-prep-primary" aria-hidden />
                <h2 className="mt-3 font-bold">{title}</h2>
                <p className="mt-1 text-sm text-prep-muted">{body}</p>
              </PrepCard>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
