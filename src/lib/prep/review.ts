import { z } from "zod";
import { scopeOf, type Scope } from "./assignments";
import type { Highlight } from "./grading/theory";
import { noticeOps } from "./notices";
import { attemptContext, attemptQuestions, PAPER_TABLES, readAnswers, solutionsHiddenUntil, totals, type QuestionResult, type Results, type TeacherMark } from "./practice/attempts";
import { insert, newId, update, type Attempt, type Role, type Store, type User, type WriteOp } from "./store";

/**
 * Teacher marking.
 *
 * - The review queue: written answers the website can't mark by itself (every French and Twi theory answer, and any
 *   answer whose marking scheme needs judgement), plus mark queries students have raised.
 * - A teacher can change any mark on an attempt from their classes, e.g. after a query or on a second look.
 *
 * A teacher works with students in the classes they take the subject for. Admins can work with everyone.
 * Every change updates the attempt's score straight away; the student sees it on their results page.
 */

export class ReviewError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReviewError";
  }
}

type Actor = { id: string; role: Role };

const REVIEW_TABLES = ["attempts", "users", "classes", "assignments", "markQueries", ...PAPER_TABLES] as const;
type ReviewData = Awaited<ReturnType<typeof readReview>>;
const readReview = (store: Store) => store.read(...REVIEW_TABLES);

/** The attempt's subject, student and labels, if the actor may mark it; otherwise null. */
function markable(data: ReviewData, scope: Scope, attempt: Attempt) {
  const student = data.users.find((u) => u.id === attempt.studentId);
  const assignment = attempt.assignmentId ? data.assignments.find((a) => a.id === attempt.assignmentId) : undefined;
  const ctx = attemptContext(data, attempt, assignment);
  if (!student?.classId || !ctx.subject || !scope.get(ctx.subject.id)?.has(student.classId)) return null;
  const questions = attemptQuestions(data, attempt);
  const label = (questionId: string) => {
    const i = questions.findIndex((q) => q.id === questionId);
    return attempt.questionIds.length ? String(i + 1) : (questions[i]?.numberLabel ?? "?");
  };
  return {
    student,
    className: data.classes.find((c) => c.id === student.classId)?.name ?? "",
    subject: ctx.subject,
    source: assignment ? assignment.title : (ctx.paperTitle ?? ctx.title),
    assignment,
    questions,
    label,
  };
}

function loadQueue(data: ReviewData, scope: Scope) {
  const marking = data.attempts
    .filter((t) => t.status === "submitted" && (t.pendingMarks ?? 0) > 0)
    .flatMap((t) => {
      const m = markable(data, scope, t);
      if (!m) return [];
      const results = (t.results ?? {}) as Results;
      const answers = readAnswers(t);
      return m.questions
        .filter((q) => {
          const r = results[q.id];
          return r?.kind === "theory" && r.status === "teacher";
        })
        .map((q) => ({
          kind: "mark" as const,
          key: `${t.id}:${q.id}`,
          attemptId: t.id,
          questionId: q.id,
          queryId: null,
          message: null,
          studentName: m.student.name,
          className: m.className,
          subjectName: m.subject.name,
          source: m.source,
          questionLabel: m.label(q.id),
          questionText: q.text,
          marks: results[q.id].marks,
          awarded: null as number | null,
          answer: answers[q.id]?.text ?? "",
          markingPoints: q.markingPoints.map((p) => ({ description: p.description, marks: p.marks })),
          waitingSince: t.submittedAt!,
          position: q.position,
        }));
    });

  const queries = data.markQueries
    .filter((mq) => mq.status === "open")
    .flatMap((mq) => {
      const t = data.attempts.find((x) => x.id === mq.attemptId);
      const m = t && markable(data, scope, t);
      const q = m?.questions.find((x) => x.id === mq.questionId);
      if (!t || !m || !q) return [];
      const r = ((t.results ?? {}) as Results)[q.id];
      const option = (label: string | null | undefined) => {
        const o = q.options.find((x) => x.label === label);
        return o ? `${o.label}. ${o.text}` : "nothing";
      };
      // For an objective question, show the choice and the key: there is no written answer.
      const answer =
        q.type === "mcq" ? `Chose ${option(readAnswers(t)[q.id]?.choice)}\nAnswer key: ${option(q.options.find((o) => o.isCorrect)?.label)}` : (readAnswers(t)[q.id]?.text ?? "");
      return [
        {
          kind: "query" as const,
          key: `q:${mq.id}`,
          attemptId: t.id,
          questionId: q.id,
          queryId: mq.id,
          message: mq.message,
          studentName: m.student.name,
          className: m.className,
          subjectName: m.subject.name,
          source: m.source,
          questionLabel: m.label(q.id),
          questionText: q.text,
          marks: r?.marks ?? q.marks,
          awarded: r?.awarded ?? 0,
          answer,
          markingPoints: [],
          waitingSince: mq.createdAt,
          position: q.position,
        },
      ];
    });

  // Oldest first; within one paper, in question order.
  return [...marking, ...queries].sort(
    (a, b) => a.waitingSince.getTime() - b.waitingSince.getTime() || a.attemptId.localeCompare(b.attemptId) || a.position - b.position,
  );
}

export type ReviewItem = ReturnType<typeof loadQueue>[number];

export async function listReviewQueue(store: Store, actor: Actor) {
  const [scope, data] = await Promise.all([scopeOf(store, actor), readReview(store)]);
  return loadQueue(data, scope);
}

/** "Your teacher has marked X" once nothing on the attempt is waiting any more. */
function markedNotice(data: ReviewData, attempt: Attempt, before: number, after: number, now: Date): WriteOp[] {
  if (before === 0 || after > 0) return [];
  const assignment = attempt.assignmentId ? data.assignments.find((a) => a.id === attempt.assignmentId) : undefined;
  const { title } = attemptContext(data, attempt, assignment);
  return noticeOps([attempt.studentId], { title: `Marked: ${title}`, body: "Your teacher has marked your written answers.", href: `/prep/practice/${attempt.id}/results` }, now);
}

// ---------------------------------------------------------------------------
// Marking an answer from the queue
// ---------------------------------------------------------------------------

export const markInputSchema = z.object({
  attemptId: z.string().uuid(),
  questionId: z.string().uuid(),
  /** Marks per marking point, in order. Used when the question has marking points. */
  points: z.array(z.number().min(0)).max(50),
  /** The total, for a question without marking points. */
  total: z.number().min(0).nullable(),
  highlights: z
    .array(z.object({ start: z.number().int().min(0), end: z.number().int().min(1), kind: z.enum(["awarded", "misspelt", "incorrect"]) }))
    .max(200),
  note: z.string().trim().max(2000),
});
export type MarkInput = z.infer<typeof markInputSchema>;

/** Keeps highlights inside the text, in order, without overlaps (a later one loses to an earlier one). */
export function cleanHighlights(highlights: Highlight[], length: number): Highlight[] {
  const out: Highlight[] = [];
  for (const h of [...highlights].sort((a, b) => a.start - b.start || b.end - a.end)) {
    const start = Math.max(0, h.start);
    const end = Math.min(length, h.end);
    if (end <= start) continue;
    if (out.length && start < out[out.length - 1].end) continue;
    out.push({ start, end, kind: h.kind });
  }
  return out;
}

const halves = (n: number) => Math.round(n * 2) / 2;

/** Saves the teacher's mark for one answer waiting in the queue, and updates the attempt's score. */
export async function returnMark(store: Store, actor: Actor, input: MarkInput, now = new Date()) {
  const [scope, data] = await Promise.all([scopeOf(store, actor), readReview(store)]);
  const item = loadQueue(data, scope).find((i) => i.kind === "mark" && i.attemptId === input.attemptId && i.questionId === input.questionId);
  if (!item) {
    const attempt = data.attempts.find((t) => t.id === input.attemptId);
    const r = (attempt?.results as Results | null)?.[input.questionId];
    if (r?.kind === "theory" && r.status === "returned") throw new ReviewError("This answer has already been marked.");
    throw new ReviewError("That answer isn't in your review queue.");
  }

  let points: TeacherMark["points"] = [];
  let awarded: number;
  if (item.markingPoints.length) {
    if (input.points.length !== item.markingPoints.length) throw new ReviewError("Give a mark for every part of the rubric.");
    points = item.markingPoints.map((p, i) => {
      const value = halves(input.points[i]);
      if (value > p.marks) throw new ReviewError(`${p.description} is out of ${p.marks}.`);
      return { ...p, awarded: value };
    });
    awarded = points.reduce((s, p) => s + p.awarded, 0);
  } else {
    if (input.total === null) throw new ReviewError("Enter a mark.");
    awarded = halves(input.total);
  }
  if (awarded > item.marks) throw new ReviewError(`This answer is out of ${item.marks}.`);

  const attempt = data.attempts.find((t) => t.id === input.attemptId)!;
  const results: Results = {
    ...(attempt.results as Results),
    [input.questionId]: {
      kind: "theory",
      status: "returned",
      awarded,
      marks: item.marks,
      teacher: {
        points,
        highlights: cleanHighlights(input.highlights, item.answer.length),
        note: input.note || null,
        markedBy: actor.id,
        markedAt: now.toISOString(),
      },
    },
  };
  const t = totals(results);
  await store.write([update("attempts", attempt.id, { results, ...t, updatedAt: now }), ...markedNotice(data, attempt, attempt.pendingMarks ?? 0, t.pendingMarks, now)]);
}

// ---------------------------------------------------------------------------
// Changing a mark (second look, or answering a query)
// ---------------------------------------------------------------------------

/** The result with the teacher's new mark. Objective answers keep the student's choice; written ones keep any highlights. */
function changed(r: QuestionResult, awarded: number, note: string | null, actor: Actor, now: Date): QuestionResult {
  if (r.kind === "mcq") return { ...r, awarded, changed: { note, by: actor.id, at: now.toISOString() } };
  const previous = r.status === "returned" ? r.teacher : null;
  return {
    kind: "theory",
    status: "returned",
    awarded,
    marks: r.marks,
    teacher: {
      // The rubric breakdown no longer adds up to the new total, so it is dropped.
      points: previous && previous.points.reduce((s, p) => s + p.awarded, 0) === awarded ? previous.points : [],
      highlights: previous?.highlights ?? (r.status === "marked" ? r.theory.highlights : []),
      note: note ?? previous?.note ?? null,
      markedBy: actor.id,
      markedAt: now.toISOString(),
    },
  };
}

export const changeMarkSchema = z.object({
  attemptId: z.string().uuid(),
  questionId: z.string().uuid(),
  awarded: z.number().min(0),
  note: z.string().trim().max(2000),
});

async function applyChange(store: Store, actor: Actor, input: z.infer<typeof changeMarkSchema>, now: Date, extra: (data: ReviewData, attempt: Attempt) => WriteOp[]) {
  const [scope, data] = await Promise.all([scopeOf(store, actor), readReview(store)]);
  const attempt = data.attempts.find((t) => t.id === input.attemptId);
  if (!attempt || attempt.status !== "submitted" || !markable(data, scope, attempt)) throw new ReviewError("That answer isn't one you mark.");
  const r = ((attempt.results ?? {}) as Results)[input.questionId];
  if (!r) throw new ReviewError("That question isn't on this attempt.");
  const awarded = halves(input.awarded);
  if (awarded > r.marks) throw new ReviewError(`This answer is out of ${r.marks}.`);
  const results: Results = { ...(attempt.results as Results), [input.questionId]: changed(r, awarded, input.note || null, actor, now) };
  const t = totals(results);
  await store.write([
    update("attempts", attempt.id, { results, ...t, updatedAt: now }),
    ...markedNotice(data, attempt, attempt.pendingMarks ?? 0, t.pendingMarks, now),
    ...extra(data, attempt),
  ]);
}

/** Sets a new mark for one answer on a submitted attempt. */
export async function changeMark(store: Store, actor: Actor, input: z.infer<typeof changeMarkSchema>, now = new Date()) {
  await applyChange(store, actor, input, now, () => []);
}

// ---------------------------------------------------------------------------
// Mark queries
// ---------------------------------------------------------------------------

export const raiseQuerySchema = z.object({
  attemptId: z.string().uuid(),
  questionId: z.string().uuid(),
  message: z.string().trim().min(5, "Say what you think is wrong with the mark.").max(1000, "Keep it under 1,000 characters."),
});

/** A student asks their teacher to check the mark for one question. One open query per question. */
export async function raiseQuery(store: Store, student: Pick<User, "id">, input: z.infer<typeof raiseQuerySchema>, now = new Date()) {
  const { attempts, assignments, markQueries } = await store.read("attempts", "assignments", "markQueries");
  const attempt = attempts.find((t) => t.id === input.attemptId && t.studentId === student.id);
  if (!attempt || attempt.status !== "submitted") throw new ReviewError("That attempt doesn't exist.");
  const r = ((attempt.results ?? {}) as Results)[input.questionId];
  if (!r) throw new ReviewError("That question isn't on this attempt.");
  if (r.kind === "theory" && r.status === "teacher") throw new ReviewError("Your teacher hasn't marked this answer yet.");
  const assignment = attempt.assignmentId ? assignments.find((a) => a.id === attempt.assignmentId) : undefined;
  if (solutionsHiddenUntil(assignment, now)) throw new ReviewError("You can query a mark once the solutions are shown.");
  if (markQueries.some((m) => m.attemptId === attempt.id && m.questionId === input.questionId && m.status === "open")) {
    throw new ReviewError("You've already asked about this question. Your teacher will reply.");
  }
  await store.write([
    insert("markQueries", [
      { id: newId(), attemptId: attempt.id, questionId: input.questionId, studentId: student.id, message: input.message, status: "open", reply: null, answeredBy: null, answeredAt: null, createdAt: now },
    ]),
  ]);
}

export const answerQuerySchema = z.object({
  queryId: z.string().uuid(),
  reply: z.string().trim().min(1, "Write a reply to the student.").max(2000),
  /** A new mark, or null to keep the mark as it is. */
  awarded: z.number().min(0).nullable(),
});

/** Replies to a query, optionally with a new mark. The student gets a notice either way. */
export async function answerQuery(store: Store, actor: Actor, input: z.infer<typeof answerQuerySchema>, now = new Date()) {
  const { markQueries } = await store.read("markQueries");
  const mq = markQueries.find((m) => m.id === input.queryId);
  if (!mq) throw new ReviewError("That query doesn't exist.");
  if (mq.status !== "open") throw new ReviewError("This query has already been answered.");

  const answered = (data: ReviewData, attempt: Attempt): WriteOp[] => {
    const assignment = attempt.assignmentId ? data.assignments.find((a) => a.id === attempt.assignmentId) : undefined;
    const { title } = attemptContext(data, attempt, assignment);
    return [
      update("markQueries", mq.id, { status: "answered", reply: input.reply, answeredBy: actor.id, answeredAt: now }),
      ...noticeOps(
        [mq.studentId],
        { title: input.awarded === null ? `Your teacher replied: ${title}` : `Mark changed: ${title}`, body: input.reply, href: `/prep/practice/${attempt.id}/results` },
        now,
      ),
    ];
  };

  if (input.awarded !== null) {
    await applyChange(store, actor, { attemptId: mq.attemptId, questionId: mq.questionId, awarded: input.awarded, note: "" }, now, answered);
    return;
  }
  const [scope, data] = await Promise.all([scopeOf(store, actor), readReview(store)]);
  const attempt = data.attempts.find((t) => t.id === mq.attemptId);
  if (!attempt || !markable(data, scope, attempt)) throw new ReviewError("That query isn't one you answer.");
  await store.write(answered(data, attempt));
}

// ---------------------------------------------------------------------------
// One attempt, as the teacher sees it
// ---------------------------------------------------------------------------

export async function getAttemptForTeacher(store: Store, actor: Actor, attemptId: string) {
  const [scope, data] = await Promise.all([scopeOf(store, actor), readReview(store)]);
  const attempt = data.attempts.find((t) => t.id === attemptId);
  const m = attempt && markable(data, scope, attempt);
  if (!attempt || !m) return null;
  const answers = readAnswers(attempt);
  const results = (attempt.results ?? {}) as Results;
  return {
    attempt,
    student: { name: m.student.name, loginId: m.student.loginId, className: m.className },
    subjectName: m.subject.name,
    source: m.source,
    assignmentId: m.assignment?.id ?? null,
    questions: m.questions.map((q) => ({
      id: q.id,
      label: m.label(q.id),
      type: q.type,
      text: q.text,
      marks: q.marks,
      options: q.options.map(({ label, text, isCorrect }) => ({ label, text, isCorrect })),
      answer: answers[q.id] ?? {},
      result: results[q.id] ?? null,
      queries: data.markQueries.filter((x) => x.attemptId === attempt.id && x.questionId === q.id).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
    })),
  };
}
