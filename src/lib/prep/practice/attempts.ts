import { z } from "zod";
import { markTheory, type TheoryResult } from "@/lib/prep/grading/theory";
import { insert, newId, update, type Attempt, type RowOf, type Store } from "@/lib/prep/store";

/**
 * Students practising past papers: start (or resume) an attempt, autosave answers, submit, and mark.
 *
 * Timing is kept on the server: `deadlineAt` is fixed when the attempt starts, so leaving the page
 * doesn't stop the clock. An attempt past its deadline is submitted automatically the next time it is
 * opened or saved, with whatever answers were last saved.
 */

/** Saves and submits arriving this long after the deadline are still accepted (slow connections). */
export const DEADLINE_GRACE_MS = 30_000;
export const TIME_LIMITS = [20, 30, 40, 45, 60, 90, 120] as const;

export const answerEntrySchema = z.object({
  choice: z.string().max(1).optional(),
  text: z.string().max(10_000).optional(),
  flagged: z.boolean().optional(),
});
export const answersSchema = z.record(z.string().uuid(), answerEntrySchema);
export type Answers = z.infer<typeof answersSchema>;

export type QuestionResult =
  | { kind: "mcq"; choice: string | null; correct: string; awarded: number; marks: number }
  | { kind: "theory"; status: "marked"; awarded: number; marks: number; theory: TheoryResult }
  | { kind: "theory"; status: "teacher"; awarded: 0; marks: number };
export type Results = Record<string, QuestionResult>;

export class AttemptError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AttemptError";
  }
}

const PAPER_TABLES = ["papers", "subjects", "questions", "mcqOptions", "markingPoints", "modelAnswers"] as const;
type PaperData = { [K in (typeof PAPER_TABLES)[number]]: RowOf<K>[] };

/** The approved questions of a paper, in order, with their options, marking points and model answers. */
function paperQuestions(data: PaperData, paperId: string) {
  return data.questions
    .filter((q) => q.paperId === paperId && q.status === "approved")
    .sort((a, b) => a.position - b.position)
    .map((q) => ({
      ...q,
      options: data.mcqOptions.filter((o) => o.questionId === q.id).sort((a, b) => a.label.localeCompare(b.label)),
      markingPoints: data.markingPoints.filter((m) => m.questionId === q.id).sort((a, b) => a.order - b.order),
      modelAnswer: data.modelAnswers.find((m) => m.questionId === q.id)?.text ?? null,
    }));
}
type FullQuestion = ReturnType<typeof paperQuestions>[number];

// ---------------------------------------------------------------------------
// Choosing a paper
// ---------------------------------------------------------------------------

/** A subject's practice papers (only those with approved questions), newest year first. */
export async function getSubjectPapers(store: Store, subjectCode: string) {
  const data = await store.read("subjects", "papers", "questions");
  const subject = data.subjects.find((s) => s.code.toUpperCase() === subjectCode.toUpperCase());
  if (!subject) return null;
  const counts = new Map<string, { questions: number; marks: number }>();
  for (const q of data.questions) {
    if (q.status !== "approved" || !q.paperId) continue;
    const c = counts.get(q.paperId) ?? { questions: 0, marks: 0 };
    counts.set(q.paperId, { questions: c.questions + 1, marks: c.marks + q.marks });
  }
  const papers = data.papers
    .filter((p) => p.subjectId === subject.id && counts.has(p.id))
    .sort((a, b) => b.year - a.year || a.paperNo - b.paperNo)
    .map((p) => ({ id: p.id, year: p.year, paperNo: p.paperNo, durationMinutes: p.durationMinutes, ...counts.get(p.id)! }));
  return { subject, papers };
}

// ---------------------------------------------------------------------------
// Attempts
// ---------------------------------------------------------------------------

const isExpired = (a: Attempt, now: Date) => !!a.deadlineAt && now.getTime() > a.deadlineAt.getTime() + DEADLINE_GRACE_MS;

/**
 * Starts an attempt, or returns the student's unfinished attempt at the same paper.
 * Theory papers are always "full" mode: answers are marked when the paper is submitted.
 */
export async function startAttempt(
  store: Store,
  studentId: string,
  input: { paperId: string; mode: "practice" | "full"; timeLimitMinutes: number | null },
  now = new Date(),
): Promise<{ id: string; resumed: boolean }> {
  const data = await store.read("attempts", ...PAPER_TABLES);
  const paper = data.papers.find((p) => p.id === input.paperId);
  const questions = paper ? paperQuestions(data, paper.id) : [];
  if (!paper || !questions.length) throw new AttemptError("That paper isn't available.");
  if (input.timeLimitMinutes !== null && !(input.timeLimitMinutes >= 5 && input.timeLimitMinutes <= 240)) {
    throw new AttemptError("Choose a time limit between 5 minutes and 4 hours.");
  }

  const open = data.attempts.find((a) => a.studentId === studentId && a.paperId === paper.id && a.status === "in_progress");
  if (open && !isExpired(open, now)) return { id: open.id, resumed: true };
  if (open) await finish(store, data, open, true, now);

  const allMcq = questions.every((q) => q.type === "mcq");
  const attempt: Attempt = {
    id: newId(),
    studentId,
    paperId: paper.id,
    mode: allMcq ? input.mode : "full",
    timeLimitMinutes: input.timeLimitMinutes,
    startedAt: now,
    deadlineAt: input.timeLimitMinutes ? new Date(now.getTime() + input.timeLimitMinutes * 60_000) : null,
    submittedAt: null,
    autoSubmitted: false,
    status: "in_progress",
    answers: {},
    results: null,
    score: null,
    maxScore: questions.reduce((s, q) => s + q.marks, 0),
    pendingMarks: null,
    updatedAt: now,
  };
  await store.write([insert("attempts", [attempt])]);
  return { id: attempt.id, resumed: false };
}

function readAnswers(a: Attempt): Answers {
  const parsed = answersSchema.safeParse(a.answers ?? {});
  return parsed.success ? parsed.data : {};
}

/** Marks every question. French and Twi theory answers go to a teacher. */
export function markAnswers(questions: FullQuestion[], autoMarkTheory: boolean, answers: Answers): Results {
  const results: Results = {};
  for (const q of questions) {
    const a = answers[q.id] ?? {};
    if (q.type === "mcq") {
      const correct = q.options.find((o) => o.isCorrect)?.label ?? "";
      const choice = a.choice ?? null;
      results[q.id] = { kind: "mcq", choice, correct, awarded: choice === correct ? q.marks : 0, marks: q.marks };
    } else if (!autoMarkTheory) {
      results[q.id] = { kind: "theory", status: "teacher", awarded: 0, marks: q.marks };
    } else {
      const theory = markTheory(a.text ?? "", q.markingPoints);
      results[q.id] = theory.needsReview
        ? { kind: "theory", status: "teacher", awarded: 0, marks: q.marks }
        : { kind: "theory", status: "marked", awarded: Math.min(theory.awarded, q.marks), marks: q.marks, theory };
    }
  }
  return results;
}

async function finish(store: Store, data: PaperData, attempt: Attempt, auto: boolean, now: Date) {
  const subject = data.subjects.find((s) => s.id === data.papers.find((p) => p.id === attempt.paperId)?.subjectId);
  const questions = paperQuestions(data, attempt.paperId);
  const results = markAnswers(questions, subject?.autoMarkTheory ?? true, readAnswers(attempt));
  const values = Object.values(results);
  const fields = {
    status: "submitted" as const,
    submittedAt: auto && attempt.deadlineAt ? attempt.deadlineAt : now,
    autoSubmitted: auto,
    results,
    score: values.reduce((s, r) => s + r.awarded, 0),
    maxScore: values.reduce((s, r) => s + r.marks, 0),
    pendingMarks: values.filter((r) => r.kind === "theory" && r.status === "teacher").reduce((s, r) => s + r.marks, 0),
    updatedAt: now,
  };
  await store.write([update("attempts", attempt.id, fields)]);
  return { ...attempt, ...fields };
}

async function ownAttempt(store: Store, studentId: string, attemptId: string) {
  const data = await store.read("attempts", ...PAPER_TABLES);
  const attempt = data.attempts.find((a) => a.id === attemptId && a.studentId === studentId);
  if (!attempt) throw new AttemptError("That attempt doesn't exist.");
  return { data, attempt };
}

/**
 * Saves the student's answers (the whole set, as shown on their screen).
 * In practice mode an objective answer can't be changed once given, since the student has seen the key.
 */
export async function saveAnswers(store: Store, studentId: string, attemptId: string, raw: unknown, now = new Date()) {
  const parsed = answersSchema.safeParse(raw);
  if (!parsed.success) throw new AttemptError("Those answers couldn't be read.");
  const { data, attempt } = await ownAttempt(store, studentId, attemptId);
  if (attempt.status !== "in_progress") return { status: "submitted" as const };
  if (isExpired(attempt, now)) {
    await finish(store, data, attempt, true, now);
    return { status: "submitted" as const };
  }
  const allowed = new Set(paperQuestions(data, attempt.paperId).map((q) => q.id));
  const before = readAnswers(attempt);
  const answers: Answers = {};
  for (const [id, entry] of Object.entries(parsed.data)) {
    if (!allowed.has(id)) continue;
    answers[id] = attempt.mode === "practice" && before[id]?.choice ? { ...entry, choice: before[id].choice } : entry;
  }
  await store.write([update("attempts", attempt.id, { answers, updatedAt: now })]);
  return { status: "saved" as const };
}

export async function submitAttempt(store: Store, studentId: string, attemptId: string, raw: unknown, now = new Date()) {
  const { data, attempt } = await ownAttempt(store, studentId, attemptId);
  if (attempt.status !== "in_progress") return attempt;
  if (raw !== undefined && !isExpired(attempt, now)) {
    await saveAnswers(store, studentId, attemptId, raw, now);
    const fresh = await ownAttempt(store, studentId, attemptId);
    return finish(store, fresh.data, fresh.attempt, false, now);
  }
  return finish(store, data, attempt, isExpired(attempt, now), now);
}

/** What the runner needs. The answer key is only included in practice mode. */
export async function loadAttemptForRunner(store: Store, studentId: string, attemptId: string, now = new Date()) {
  const own = await ownAttempt(store, studentId, attemptId);
  const data = own.data;
  let attempt = own.attempt;
  if (attempt.status === "in_progress" && isExpired(attempt, now)) {
    attempt = await finish(store, data, attempt, true, now);
  }
  const paper = data.papers.find((p) => p.id === attempt.paperId)!;
  const subject = data.subjects.find((s) => s.id === paper.subjectId)!;
  const questions = paperQuestions(data, paper.id);
  return {
    attempt: {
      id: attempt.id,
      mode: attempt.mode,
      status: attempt.status,
      deadlineAt: attempt.deadlineAt?.toISOString() ?? null,
      timeLimitMinutes: attempt.timeLimitMinutes,
      answers: readAnswers(attempt),
    },
    paper: { year: paper.year, paperNo: paper.paperNo, subjectName: subject.name, subjectCode: subject.code, autoMarkTheory: subject.autoMarkTheory },
    questions: questions.map((q) => ({
      id: q.id,
      numberLabel: q.numberLabel,
      type: q.type,
      text: q.text,
      imageUrls: q.imageUrls,
      marks: q.marks,
      options: q.options.map(({ label, text }) => ({ label, text })),
      ...(attempt.mode === "practice" ? { key: { correct: q.options.find((o) => o.isCorrect)?.label ?? "", explanation: q.modelAnswer } } : {}),
    })),
    serverNow: now.toISOString(),
  };
}

export type RunnerData = Awaited<ReturnType<typeof loadAttemptForRunner>>;

/** Everything the results page shows. Only for submitted attempts. */
export async function loadAttemptResults(store: Store, studentId: string, attemptId: string) {
  const { data, attempt } = await ownAttempt(store, studentId, attemptId);
  if (attempt.status !== "submitted") return null;
  const paper = data.papers.find((p) => p.id === attempt.paperId)!;
  const subject = data.subjects.find((s) => s.id === paper.subjectId)!;
  const answers = readAnswers(attempt);
  const results = (attempt.results ?? {}) as Results;
  return {
    attempt,
    paper: { year: paper.year, paperNo: paper.paperNo, subjectName: subject.name, subjectCode: subject.code },
    questions: paperQuestions(data, paper.id).map((q) => ({
      id: q.id,
      numberLabel: q.numberLabel,
      type: q.type,
      text: q.text,
      marks: q.marks,
      options: q.options.map(({ label, text, isCorrect }) => ({ label, text, isCorrect })),
      modelAnswer: q.modelAnswer,
      answer: answers[q.id] ?? {},
      result: results[q.id] ?? null,
    })),
  };
}

/** A student's attempts, newest first, for the Progress page. */
export async function listStudentAttempts(store: Store, studentId: string) {
  const { attempts, papers, subjects } = await store.read("attempts", "papers", "subjects");
  return attempts
    .filter((a) => a.studentId === studentId)
    .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
    .map((a) => {
      const paper = papers.find((p) => p.id === a.paperId);
      const subject = subjects.find((s) => s.id === paper?.subjectId);
      return {
        id: a.id,
        status: a.status,
        mode: a.mode,
        startedAt: a.startedAt,
        submittedAt: a.submittedAt,
        autoSubmitted: a.autoSubmitted,
        score: a.score,
        maxScore: a.maxScore,
        pendingMarks: a.pendingMarks,
        title: paper && subject ? `${subject.name} ${paper.year} · Paper ${paper.paperNo}` : "Removed paper",
      };
    });
}
