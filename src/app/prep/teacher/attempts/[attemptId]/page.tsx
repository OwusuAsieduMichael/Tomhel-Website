import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, X } from "lucide-react";
import { z } from "zod";
import { requireRole } from "@/lib/prep/auth/current-user";
import { fmtMarks, formatDayTime } from "@/lib/prep/format";
import { getAttemptForTeacher } from "@/lib/prep/review";
import { getStore } from "@/lib/prep/store";
import { cn } from "@/lib/utils";
import { ChangeMark } from "./change-mark";

export const metadata: Metadata = { title: "Student attempt" };
export const dynamic = "force-dynamic";

type Loaded = NonNullable<Awaited<ReturnType<typeof getAttemptForTeacher>>>;
type Q = Loaded["questions"][number];

/** One student's submitted work, with every mark, for a teacher to check or change. */
export default async function TeacherAttemptPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const user = await requireRole("teacher");
  const { attemptId } = await params;
  if (!z.string().uuid().safeParse(attemptId).success) notFound();
  const data = await getAttemptForTeacher(getStore(), user, attemptId);
  if (!data || data.attempt.status !== "submitted") notFound();
  const { attempt, student } = data;
  const max = attempt.maxScore ?? 0;
  const pending = attempt.pendingMarks ?? 0;

  return (
    <>
      <div className="mb-6 flex flex-col gap-1">
        {data.assignmentId ? (
          <Link href={`/prep/teacher/assignments/${data.assignmentId}`} className="text-sm font-semibold text-prep-primary hover:underline">
            {data.source}
          </Link>
        ) : (
          <span className="text-sm font-semibold text-prep-muted">{data.source}</span>
        )}
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{student.name}</h1>
        <span className="text-sm text-prep-muted">
          {student.loginId} · {student.className} · {data.subjectName} · submitted {attempt.submittedAt ? formatDayTime(attempt.submittedAt) : ""}
          {attempt.autoSubmitted ? " (time ran out)" : ""}
        </span>
        <span className="mt-1 text-lg font-bold tabular-nums">
          {fmtMarks(attempt.score ?? 0)} / {fmtMarks(max)}
          {pending ? <span className="ml-2 text-sm font-semibold text-prep-flag-ink">{fmtMarks(pending)} marks waiting for marking</span> : null}
        </span>
      </div>

      <ol className="flex flex-col gap-3">
        {data.questions.map((q) => (
          <li key={q.id}>
            <QuestionCard q={q} attemptId={attempt.id} />
          </li>
        ))}
      </ol>
    </>
  );
}

function QuestionCard({ q, attemptId }: { q: Q; attemptId: string }) {
  const r = q.result;
  const waiting = r?.kind === "theory" && r.status === "teacher";
  const changedNote = r?.kind === "mcq" ? r.changed?.note : r?.kind === "theory" && r.status === "returned" ? r.teacher.note : null;
  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-prep-line bg-prep-surface p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-bold">Question {q.label}</h2>
        <span className={cn("text-sm font-bold tabular-nums", !r ? "text-prep-muted" : waiting ? "text-prep-flag-ink" : r.awarded === r.marks ? "text-prep-awarded" : r.awarded ? "text-prep-flag-ink" : "text-prep-incorrect")}>
          {waiting ? "Waiting for marking" : r ? `${fmtMarks(r.awarded)} / ${fmtMarks(r.marks)}` : `${fmtMarks(q.marks)} marks`}
        </span>
      </div>
      <p className="text-[15px] whitespace-pre-line">{q.text}</p>

      {q.type === "mcq" ? (
        <ul className="flex flex-col gap-1.5 text-sm">
          {q.options.map((o) => {
            const chosen = q.answer.choice === o.label;
            return (
              <li key={o.label} className={cn("flex items-start gap-2 rounded-lg px-2.5 py-1.5", o.isCorrect && "bg-prep-primary-soft", chosen && !o.isCorrect && "bg-prep-incorrect-bg")}>
                {o.isCorrect ? <Check className="mt-0.5 size-4 shrink-0 text-prep-awarded" aria-label="Correct answer" /> : chosen ? <X className="mt-0.5 size-4 shrink-0 text-prep-incorrect" aria-label="Wrong" /> : <span className="size-4 shrink-0" />}
                <span>
                  <b>{o.label}.</b> {o.text}
                  {chosen ? <span className="ml-1.5 text-xs font-semibold text-prep-muted">(student&apos;s answer)</span> : null}
                </span>
              </li>
            );
          })}
          {!q.answer.choice ? <li className="text-prep-muted">Not answered.</li> : null}
        </ul>
      ) : (
        <p className="rounded-xl border border-prep-line bg-prep-ground/50 p-3.5 text-[15px] leading-relaxed whitespace-pre-wrap">{q.answer.text?.trim() ? q.answer.text : "Not answered."}</p>
      )}

      {changedNote ? <p className="rounded-xl bg-prep-primary-soft px-3.5 py-2.5 text-sm">Note to student: {changedNote}</p> : null}

      {q.queries.map((m) => (
        <div key={m.id} className="rounded-xl border border-prep-line px-3.5 py-2.5 text-sm">
          <p>
            <span className="font-semibold">Query ({m.status === "open" ? "open" : "answered"}):</span> {m.message}
          </p>
          {m.reply ? <p className="mt-1 text-prep-muted">Reply: {m.reply}</p> : null}
          {m.status === "open" ? (
            <Link href={`/prep/teacher/review?item=${encodeURIComponent(`q:${m.id}`)}`} className="mt-1 inline-block font-semibold text-prep-primary hover:underline">
              Answer in the review queue
            </Link>
          ) : null}
        </div>
      ))}

      <div className="flex flex-wrap justify-end">
        {waiting ? (
          <Link href={`/prep/teacher/review?item=${encodeURIComponent(`${attemptId}:${q.id}`)}`} className="min-h-11 rounded-xl px-3 py-3 text-sm font-semibold text-prep-primary hover:bg-prep-primary-soft">
            Mark in the review queue
          </Link>
        ) : r ? (
          <ChangeMark attemptId={attemptId} questionId={q.id} awarded={r.awarded} marks={r.marks} />
        ) : null}
      </div>
    </article>
  );
}
