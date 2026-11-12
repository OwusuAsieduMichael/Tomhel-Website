import { Check, ChevronLeft, CircleAlert, Lock, MessageSquareText, Minus, UserRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/prep/auth/current-user";
import { fmtMarks, formatDayTime } from "@/lib/prep/format";
import type { Highlight, PointResult } from "@/lib/prep/grading/theory";
import { AttemptError, loadAttemptResults } from "@/lib/prep/practice/attempts";
import { getStore } from "@/lib/prep/store";
import { cn } from "@/lib/utils";
import { MarkQuery } from "./mark-query";

export const metadata: Metadata = { title: "Results" };
export const dynamic = "force-dynamic";

type Loaded = NonNullable<Awaited<ReturnType<typeof loadAttemptResults>>>;
type Q = Loaded["questions"][number];

export default async function ResultsPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const user = await requireRole("student");
  const { attemptId } = await params;
  if (!z.string().uuid().safeParse(attemptId).success) notFound();

  let data: Awaited<ReturnType<typeof loadAttemptResults>>;
  try {
    data = await loadAttemptResults(getStore(), user.id, attemptId);
  } catch (e) {
    if (e instanceof AttemptError) notFound();
    throw e;
  }
  if (!data) redirect(`/prep/practice/${attemptId}`);

  const { attempt, paper, questions, assignment, solutionsHidden } = data;
  const backHref = assignment ? "/prep/student/academic/exams" : `/prep/student/subjects/${paper.subjectCode.toLowerCase()}`;
  const score = attempt.score ?? 0;
  const max = attempt.maxScore ?? 0;
  const pending = attempt.pendingMarks ?? 0;
  const objectives = questions.every((q) => q.type === "mcq");
  const minutes =
    attempt.submittedAt && attempt.startedAt ? Math.max(1, Math.round((attempt.submittedAt.getTime() - attempt.startedAt.getTime()) / 60000)) : null;

  const review = questions.filter((q) => q.result?.kind === "mcq" && q.result.awarded === 0);
  const right = questions.filter((q) => q.result?.kind === "mcq" && q.result.awarded > 0);
  const unanswered = questions.filter((q) => q.result?.kind === "mcq" && !q.result.choice).length;
  const ratio = max - pending > 0 ? score / (max - pending) : 0;

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col">
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-prep-line bg-prep-surface px-5 py-3">
        <Link
          href={backHref}
          aria-label={assignment ? "Back to work from teachers" : "Back to past papers"}
          className="-ml-3 flex size-11 items-center justify-center rounded-xl hover:bg-prep-primary-soft"
        >
          <ChevronLeft className="size-[22px]" aria-hidden />
        </Link>
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[15px] font-bold">
            {paper.title} results
          </h1>
          <span className="text-[13px] text-prep-muted">
            {assignment ? `Set by your teacher${paper.paperTitle ? ` · ${paper.paperTitle}` : ""}` : attempt.mode === "practice" ? "Practice" : "Full paper"}
            {minutes ? ` · ${minutes} min` : ""}
            {attempt.autoSubmitted ? " · submitted when time ran out" : ""}
          </span>
        </div>
      </header>

      <main className="flex flex-col gap-4 p-5">
        <div className="flex items-center gap-4 rounded-2xl border border-prep-line bg-prep-surface p-4">
          <div
            className={cn(
              "flex size-[72px] shrink-0 items-center justify-center rounded-full border-[6px] text-[22px] font-bold",
              ratio >= 0.7 ? "border-prep-primary-soft text-prep-awarded" : ratio >= 0.4 ? "border-prep-flag text-prep-flag-ink" : "border-prep-incorrect-bg text-prep-incorrect",
            )}
          >
            {Math.round(ratio * 100)}%
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-base font-bold">
              {fmtMarks(score)} of {fmtMarks(max - pending)} marks
            </span>
            {solutionsHidden ? null : (
              <span className="text-[13px] leading-normal text-prep-muted">
                {objectives
                  ? `${right.length} right · ${review.length - unanswered} wrong · ${unanswered} not answered`
                  : summariseTheory(questions)}
              </span>
            )}
            {pending ? (
              <span className="text-[13px] font-semibold text-prep-flag-ink">
                {fmtMarks(pending)} more {pending === 1 ? "mark is" : "marks are"} with your teacher.
              </span>
            ) : null}
          </div>
        </div>

        {solutionsHidden ? (
          <p className="flex items-start gap-2.5 rounded-xl border border-prep-line bg-prep-surface px-4 py-3.5 text-sm text-prep-muted">
            <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
            {solutionsHidden.until
              ? `Your teacher will show the answers and solutions after the work closes, ${formatDayTime(solutionsHidden.until)}.`
              : "Your teacher will show the answers and solutions when everyone has finished."}
          </p>
        ) : objectives ? (
          <>
            {review.length ? (
              <section aria-labelledby="review-heading" className="flex flex-col gap-2.5">
                <h2 id="review-heading" className="text-sm font-bold tracking-wide text-prep-muted">
                  TO REVIEW ({review.length})
                </h2>
                {review.map((q) => (
                  <McqReview key={q.id} q={q} attemptId={attempt.id} />
                ))}
              </section>
            ) : (
              <p className="rounded-xl bg-prep-primary-soft px-4 py-3 font-semibold text-prep-awarded">Every answer is right. Excellent work.</p>
            )}
            {right.length ? (
              <details className="rounded-xl border border-prep-line bg-prep-surface px-3.5">
                <summary className="flex min-h-12 cursor-pointer items-center text-sm font-bold">Questions you got right ({right.length})</summary>
                <div className="flex flex-col gap-2.5 pb-3.5">
                  {right.map((q) => (
                    <McqReview key={q.id} q={q} attemptId={attempt.id} />
                  ))}
                </div>
              </details>
            ) : null}
          </>
        ) : (
          questions.map((q) => <TheoryReview key={q.id} q={q} attemptId={attempt.id} />)
        )}

        <div className="flex gap-2.5 pt-2">
          <Link href={backHref} className="flex h-[52px] flex-1 items-center justify-center rounded-xl border border-prep-input bg-prep-surface text-[15px] font-bold">
            {assignment ? "Work from teachers" : "Another paper"}
          </Link>
          <Link href="/prep/student/progress" className="flex h-[52px] flex-1 items-center justify-center rounded-xl bg-prep-primary text-[15px] font-bold text-white">
            My progress
          </Link>
        </div>
      </main>
    </div>
  );
}

function summariseTheory(questions: Q[]) {
  const points = questions.flatMap((q) => (q.result?.kind === "theory" && q.result.status === "marked" ? q.result.theory.points : []));
  const n = (s: PointResult["status"]) => points.filter((p) => p.status === s).length;
  const returned = questions.filter((q) => q.result?.kind === "theory" && q.result.status === "returned").length;
  const parts = points.length || !returned ? [`${n("awarded")} points awarded`] : [];
  if (n("misspelt")) parts.push(`${n("misspelt")} misspelt`);
  if (n("missing")) parts.push(`${n("missing")} missing`);
  if (returned) parts.push(`${returned} ${returned === 1 ? "answer" : "answers"} marked by your teacher`);
  return parts.join(", ");
}

function McqReview({ q, attemptId }: { q: Q; attemptId: string }) {
  if (q.result?.kind !== "mcq") return null;
  const { choice, correct, awarded } = q.result;
  const chosen = q.options.find((o) => o.label === choice);
  const answer = q.options.find((o) => o.label === correct);
  return (
    <article className="flex flex-col gap-2 rounded-xl border border-prep-line bg-prep-surface p-3.5">
      <p className="text-[15px] font-semibold">
        <span className="text-prep-muted">{q.numberLabel}. </span>
        {q.text}
      </p>
      {awarded ? (
        <p className="flex items-start gap-2 text-sm text-prep-awarded">
          <Check className="mt-0.5 size-4 shrink-0" aria-hidden /> {correct}. {answer?.text}
        </p>
      ) : (
        <>
          <p className="text-sm text-prep-incorrect-ink">{chosen ? `Your answer: ${chosen.label}. ${chosen.text}` : "Not answered"}</p>
          <p className="flex items-start gap-2 text-sm font-semibold text-prep-awarded">
            <Check className="mt-0.5 size-4 shrink-0" aria-hidden /> Answer: {correct}. {answer?.text}
          </p>
        </>
      )}
      {q.modelAnswer ? <p className="text-[13px] leading-normal text-prep-muted">{q.modelAnswer}</p> : null}
      {q.result.changed ? (
        <p className="rounded-lg bg-prep-primary-soft px-3 py-2 text-[13px]">
          Your teacher changed this mark to {fmtMarks(q.result.awarded)}/{fmtMarks(q.result.marks)}.{q.result.changed.note ? ` ${q.result.changed.note}` : ""}
        </p>
      ) : null}
      <MarkQuery attemptId={attemptId} questionId={q.id} query={q.query} />
    </article>
  );
}

const underline: Record<Highlight["kind"], string> = {
  awarded: "underline decoration-prep-awarded decoration-2 underline-offset-4",
  misspelt: "underline decoration-prep-misspelt decoration-dotted decoration-[3px] underline-offset-4 bg-prep-misspelt-bg",
  incorrect: "underline decoration-prep-incorrect decoration-wavy decoration-2 underline-offset-4 bg-prep-incorrect-bg",
};
const srLabel: Record<Highlight["kind"], string> = { awarded: "mark awarded", misspelt: "misspelt or incomplete", incorrect: "incorrect" };

function MarkedAnswer({ text, highlights }: { text: string; highlights: Highlight[] }) {
  const parts: React.ReactNode[] = [];
  let at = 0;
  for (const [i, h] of highlights.entries()) {
    if (h.start > at) parts.push(text.slice(at, h.start));
    parts.push(
      <span key={i} className={underline[h.kind]}>
        {text.slice(h.start, h.end)}
        <span className="sr-only"> ({srLabel[h.kind]})</span>
      </span>,
    );
    at = h.end;
  }
  parts.push(text.slice(at));
  return <p className="rounded-xl border border-prep-line bg-prep-surface p-3.5 text-base leading-[1.9] whitespace-pre-line">{parts}</p>;
}

const pointStyle: Record<PointResult["status"], { Icon: typeof Check; color: string; label: string }> = {
  awarded: { Icon: Check, color: "text-prep-awarded", label: "Awarded" },
  misspelt: { Icon: CircleAlert, color: "text-prep-flag-ink", label: "Misspelt" },
  missing: { Icon: Minus, color: "text-prep-incorrect", label: "Missing" },
  review: { Icon: UserRound, color: "text-prep-muted", label: "Teacher to mark" },
};

function TheoryReview({ q, attemptId }: { q: Q; attemptId: string }) {
  const r = q.result;
  const text = q.answer.text?.trim() ?? "";
  const highlights = r?.kind === "theory" ? (r.status === "marked" ? r.theory.highlights : r.status === "returned" ? r.teacher.highlights : []) : [];
  return (
    <article className="flex flex-col gap-3 border-t border-prep-line pt-4 first:border-t-0 first:pt-0">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-bold">Question {q.numberLabel}</h2>
        {r?.kind === "theory" && (r.status === "marked" || r.status === "returned") ? (
          <span className={cn("text-sm font-bold", r.awarded === r.marks ? "text-prep-awarded" : r.awarded ? "text-prep-flag-ink" : "text-prep-incorrect")}>
            {fmtMarks(r.awarded)}/{fmtMarks(r.marks)}
          </span>
        ) : (
          <span className="text-sm font-semibold text-prep-muted">{fmtMarks(q.marks)} marks</span>
        )}
      </div>
      <p className="text-[15px] font-semibold whitespace-pre-line">{q.text}</p>

      <section className="flex flex-col gap-2.5">
        <h3 className="text-sm font-bold tracking-wide text-prep-muted">YOUR ANSWER</h3>
        {text ? (
          <MarkedAnswer text={q.answer.text!} highlights={highlights} />
        ) : (
          <p className="rounded-xl border border-dashed border-prep-line p-3.5 text-sm text-prep-muted">You didn&apos;t answer this question.</p>
        )}
        {highlights.length ? (
          <div className="flex flex-wrap gap-x-3.5 gap-y-1.5 text-xs text-prep-muted">
            <span className="flex items-center gap-1.5">
              <span className="w-[18px] border-b-2 border-prep-awarded" />
              Mark awarded
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-[18px] border-b-[3px] border-dotted border-prep-misspelt" />
              Misspelt or incomplete
            </span>
            {highlights.some((h) => h.kind === "incorrect") ? (
              <span className="flex items-center gap-1.5">
                <span className="w-[18px] border-b-2 border-prep-incorrect" />
                Incorrect
              </span>
            ) : null}
          </div>
        ) : null}
      </section>

      {r?.kind === "theory" && r.status === "returned" ? (
        <section className="flex flex-col gap-2.5">
          <h3 className="text-sm font-bold tracking-wide text-prep-muted">MARKED BY YOUR TEACHER</h3>
          {r.teacher.note ? (
            <p className="flex items-start gap-2.5 rounded-xl bg-prep-primary-soft px-3.5 py-3 text-sm whitespace-pre-line">
              <MessageSquareText className="mt-0.5 size-4 shrink-0 text-prep-primary" aria-hidden />
              {r.teacher.note}
            </p>
          ) : null}
          {r.teacher.points.length ? (
            <ul className="flex flex-col rounded-xl border border-prep-line bg-prep-surface">
              {r.teacher.points.map((p, i) => (
                <li key={i} className="flex justify-between gap-2.5 border-b border-[#eeece5] px-3.5 py-3 text-sm last:border-b-0">
                  <span className="font-semibold">{p.description}</span>
                  <span className={cn("font-bold tabular-nums", p.awarded === p.marks ? "text-prep-awarded" : p.awarded ? "text-prep-flag-ink" : "text-prep-incorrect")}>
                    {fmtMarks(p.awarded)}/{fmtMarks(p.marks)}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {r?.kind === "theory" && r.status === "teacher" ? (
        <p className="flex items-start gap-2.5 rounded-xl bg-prep-misspelt-bg px-3.5 py-3 text-sm text-prep-flag-ink">
          <UserRound className="mt-0.5 size-4 shrink-0" aria-hidden />
          Your teacher marks this answer. You&apos;ll see the mark here once it&apos;s returned.
        </p>
      ) : null}

      {r?.kind === "theory" && r.status === "marked" ? (
        <section className="flex flex-col gap-2.5">
          <h3 className="text-sm font-bold tracking-wide text-prep-muted">MARKING SCHEME, POINT BY POINT</h3>
          <ul className="flex flex-col rounded-xl border border-prep-line bg-prep-surface">
            {r.theory.points.map((p, i) => {
              const s = pointStyle[p.status];
              return (
                <li key={i} className="flex gap-2.5 border-b border-[#eeece5] px-3.5 py-3 last:border-b-0">
                  <s.Icon className={cn("size-[22px] shrink-0", s.color)} role="img" aria-label={s.label} />
                  <div className="flex flex-1 flex-col gap-0.5">
                    <span className="text-sm font-semibold">{p.description}</span>
                    <span className={cn("text-[13px]", p.status === "awarded" ? "text-prep-muted" : s.color)}>
                      {p.status === "awarded" ? `Found: “${p.found}”` : p.note}
                    </span>
                  </div>
                  <span className={cn("text-sm font-bold", s.color)}>
                    {fmtMarks(p.awarded)}/{fmtMarks(p.marks)}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {q.modelAnswer ? (
        <details className="rounded-xl border border-prep-line bg-prep-surface px-3.5">
          <summary className="flex min-h-12 cursor-pointer items-center text-sm font-bold">Show the official solution</summary>
          <p className="mb-3.5 text-sm leading-relaxed text-prep-muted whitespace-pre-line">{q.modelAnswer}</p>
        </details>
      ) : null}
      {r?.kind === "theory" && r.status !== "teacher" ? <MarkQuery attemptId={attemptId} questionId={q.id} query={q.query} /> : null}
    </article>
  );
}
