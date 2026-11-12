import Link from "next/link";
import { PrepCard } from "@/components/prep/ui";
import { listStudentAssignments, type WorkCategory } from "@/lib/prep/assignments";
import { requireRole } from "@/lib/prep/auth/current-user";
import { fmtMarks, formatDayTime } from "@/lib/prep/format";
import { getStore } from "@/lib/prep/store";
import { StartAssignmentButton } from "./start-button";

type Item = Awaited<ReturnType<typeof listStudentAssignments>>[number];

/** Work set by teachers for the student's class: the Quiz tab shows quizzes, the Assignments tab assignments. */
export async function AssignedWork({ category }: { category: WorkCategory }) {
  const user = await requireRole("student");
  const items = (await listStudentAssignments(getStore(), user)).filter((a) => a.category === category);

  const todo = items.filter((a) => a.state === "open" && (a.status !== "submitted" || a.canStart));
  const upcoming = items.filter((a) => a.state === "scheduled").sort((a, b) => a.opensAt.getTime() - b.opensAt.getTime());
  const done = items
    .filter((a) => !todo.includes(a) && !upcoming.includes(a))
    .sort((a, b) => b.closesAt.getTime() - a.closesAt.getTime());

  if (items.length === 0) {
    return (
      <PrepCard className="text-prep-muted">
        {category === "quiz"
          ? "No quizzes from your teachers yet. When they set one, it appears here."
          : "No assignments from your teachers yet. When they set one, it appears here."}
      </PrepCard>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Group title="TO DO" items={todo} empty="Nothing to do right now." />
      {upcoming.length ? <Group title="COMING UP" items={upcoming} /> : null}
      {done.length ? <Group title="DONE" items={done} /> : null}
    </div>
  );
}

function Group({ title, items, empty }: { title: string; items: Item[]; empty?: string }) {
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="text-sm font-bold tracking-wide text-prep-muted">
        {title} {items.length ? `(${items.length})` : ""}
      </h2>
      {items.length === 0 && empty ? <p className="text-sm text-prep-muted">{empty}</p> : null}
      <ul className="flex flex-col gap-2.5">
        {items.map((a) => (
          <li key={a.id}>
            <Card a={a} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function Card({ a }: { a: Item }) {
  const limit = a.timeLimitMinutes ? `${a.timeLimitMinutes} min` : "No time limit";
  const when = a.state === "scheduled" ? `Opens ${formatDayTime(a.opensAt)}` : a.state === "open" ? `Closes ${formatDayTime(a.closesAt)}` : `Closed ${formatDayTime(a.closesAt)}`;
  const marked = (a.maxScore ?? 0) - (a.pendingMarks ?? 0);

  let action: React.ReactNode = null;
  if (a.runningAttemptId) {
    action = (
      <Link href={`/prep/practice/${a.runningAttemptId}`} className="flex min-h-11 items-center rounded-xl bg-prep-primary px-4 text-sm font-bold text-white hover:bg-prep-primary/90">
        Continue
      </Link>
    );
  } else if (a.canStart) {
    action = (
      <StartAssignmentButton
        assignmentId={a.id}
        label={a.status === "submitted" ? "Try again" : "Start"}
        confirmText={a.timeLimitMinutes ? `You'll have ${a.timeLimitMinutes} minutes once you start, and the timer keeps running if you leave. Start now?` : undefined}
      />
    );
  } else if (a.resultAttemptId) {
    action = (
      <Link
        href={`/prep/practice/${a.resultAttemptId}/results`}
        className="flex min-h-11 items-center rounded-xl border border-prep-input bg-prep-surface px-4 text-sm font-bold hover:bg-prep-ground"
      >
        Results
      </Link>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-prep-line bg-prep-surface p-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-xs font-semibold tracking-wide text-prep-primary">{a.category === "quiz" ? "QUIZ" : "ASSIGNMENT"} FROM YOUR TEACHER</span>
        <span className="text-[15px] font-bold">
          {a.subject} · {a.title}
        </span>
        <span className="text-[13px] text-prep-muted">
          {a.paper} · {limit} · {when}
        </span>
        {a.status === "submitted" ? (
          marked > 0 ? (
            <span className="text-[13px] font-semibold text-prep-awarded">
              Submitted · {fmtMarks(a.score ?? 0)} of {fmtMarks(marked)} marks
              {a.pendingMarks ? <span className="text-prep-flag-ink"> · {fmtMarks(a.pendingMarks)} more with your teacher</span> : null}
            </span>
          ) : (
            <span className="text-[13px] font-semibold text-prep-flag-ink">Submitted · your teacher is marking it</span>
          )
        ) : a.state === "closed" ? (
          <span className="text-[13px] font-semibold text-prep-incorrect">Not done</span>
        ) : null}
      </div>
      {action ? <div className="sm:shrink-0">{action}</div> : null}
    </div>
  );
}
