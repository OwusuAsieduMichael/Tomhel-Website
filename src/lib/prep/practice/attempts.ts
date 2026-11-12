import { z } from "zod";
import { markTheory, type Highlight, type TheoryResult } from "@/lib/prep/grading/theory";
import { insert, newId, update, type Assignment, type Attempt, type RowOf, type Store } from "@/lib/prep/store";

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

/** A teacher's marking of one written answer (French and Twi theory, or answers the rules couldn't decide). */
export type TeacherMark = {
  /** One entry per marking point, in order. Empty when the question has no marking points. */
  points: { description: string; marks: number; awarded: number }[];
  highlights: Highlight[];
  note: string | null;
  markedBy: string;
  markedAt: string;
};

export type QuestionResult =
  | {
      kind: "mcq";
      choice: string | null;
      correct: string;
      awarded: number;
      marks: number;
      /** Set when a teacher changed the mark (e.g. after a query about a wrong answer key). */
      changed?: { note: string | null; by: string; at: string };
    }
  | { kind: "theory"; status: "marked"; awarded: number; marks: number; theory: TheoryResult }
  | { kind: "theory"; status: "teacher"; awarded: 0; marks: number }
  | { kind: "theory"; status: "returned"; awarded: number; marks: number; teacher: TeacherMark };
export type Results = Record<string, QuestionResult>;

/** Score, maximum and marks still waiting for a teacher, from an attempt's results. */
export function totals(results: Results) {
  const values = Object.values(results);
  return {
    score: values.reduce((s, r) => s + r.awarded, 0),
    maxScore: values.reduce((s, r) => s + r.marks, 0),
    pendingMarks: values.filter((r) => r.kind === "theory" && r.status === "teacher").reduce((s, r) => s + r.marks, 0),
  };
}

export class AttemptError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AttemptError";
  }
}

export const PAPER_TABLES = ["papers", "subjects", "questions", "mcqOptions", "markingPoints", "modelAnswers"] as const;
export type PaperData = { [K in (typeof PAPER_TABLES)[number]]: RowOf<K>[] };

function withAnswers(data: PaperData, q: RowOf<"questions">) {
  return {
    ...q,
    options: data.mcqOptions.filter((o) => o.questionId === q.id).sort((a, b) => a.label.localeCompare(b.label)),
    markingPoints: data.markingPoints.filter((m) => m.questionId === q.id).sort((a, b) => a.order - b.order),
    modelAnswer: data.modelAnswers.find((m) => m.questionId === q.id)?.text ?? null,
  };
}

/** The approved questions of a paper, in order, with their options, marking points and model answers. */
export function paperQuestions(data: PaperData, paperId: string) {
  return data.questions
    .filter((q) => q.paperId === paperId && q.status === "approved")
    .sort((a, b) => a.position - b.position)
    .map((q) => withAnswers(data, q));
}
type FullQuestion = ReturnType<typeof paperQuestions>[number];

/** Approved questions by ID, in the order given (a topic quiz or a teacher's pick). Missing or unapproved ones are skipped. */
export function questionsById(data: PaperData, ids: string[]) {
  return ids.flatMap((id) => {
    const q = data.questions.find((x) => x.id === id && x.status === "approved");
    return q ? [withAnswers(data, q)] : [];
  });
}

/** The questions an attempt is made of: its own list, or else its paper. */
export function attemptQuestions(data: PaperData, a: Pick<Attempt, "paperId" | "questionIds">) {
  if (a.questionIds.length) return questionsById(data, a.questionIds);
  return a.paperId ? paperQuestions(data, a.paperId) : [];
}

/** Subject, paper (if any) and a display title for an attempt. */
export function attemptContext(data: PaperData, a: Pick<Attempt, "paperId" | "questionIds">, assignment?: Pick<Assignment, "title"> | null) {
  const paper = a.paperId ? (data.papers.find((p) => p.id === a.paperId) ?? null) : null;
  const subjectId = paper?.subjectId ?? data.questions.find((q) => q.id === a.questionIds[0])?.subjectId;
  const subject = data.subjects.find((s) => s.id === subjectId) ?? null;
  const paperTitle = paper ? `BECE ${paper.year} Paper ${paper.paperNo}` : null;
  const title = assignment
    ? `${subject?.name ?? ""} · ${assignment.title}`
    : paper
      ? `${subject?.name ?? ""} ${paper.year} · Paper ${paper.paperNo}`
      : `${subject?.name ?? ""} quiz`;
  return { paper, subject, paperTitle, title };
}

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

export const isExpired = (a: Attempt, now: Date) => !!a.deadlineAt && now.getTime() > a.deadlineAt.getTime() + DEADLINE_GRACE_MS;

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

  // Self-practice only resumes self-practice: assigned work on the same paper is a separate attempt.
  const open = data.attempts.find((a) => a.studentId === studentId && a.paperId === paper.id && !a.assignmentId && a.status === "in_progress");
  if (open && !isExpired(open, now)) return { id: open.id, resumed: true };
  if (open) await finishAttempt(store, data, open, true, now);

  const allMcq = questions.every((q) => q.type === "mcq");
  const attempt = newAttemptRow({
    studentId,
    paperId: paper.id,
    assignmentId: null,
    mode: allMcq ? input.mode : "full",
    timeLimitMinutes: input.timeLimitMinutes,
    deadlineAt: input.timeLimitMinutes ? new Date(now.getTime() + input.timeLimitMinutes * 60_000) : null,
    maxScore: questions.reduce((s, q) => s + q.marks, 0),
    now,
  });
  await store.write([insert("attempts", [attempt])]);
  return { id: attempt.id, resumed: false };
}


export function newAttemptRow(input: {
  studentId: string;
  paperId: string | null;
  questionIds?: string[];
  assignmentId: string | null;
  mode: "practice" | "full";
  timeLimitMinutes: number | null;
  deadlineAt: Date | null;
  maxScore: number;
  now: Date;
}): Attempt {
  return {
    id: newId(),
    studentId: input.studentId,
    paperId: input.paperId,
    questionIds: input.questionIds ?? [],
    assignmentId: input.assignmentId,
    mode: input.mode,
    timeLimitMinutes: input.timeLimitMinutes,
    startedAt: input.now,
    deadlineAt: input.deadlineAt,
    submittedAt: null,
    autoSubmitted: false,
    status: "in_progress",
    answers: {},
    results: null,
    score: null,
    maxScore: input.maxScore,
    pendingMarks: null,
    updatedAt: input.now,
  };
}

export function readAnswers(a: Pick<Attempt, "answers">): Answers {
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

/** Marks and submits an attempt. `auto`: the time ran out (it is recorded as submitted at the deadline). */
export async function finishAttempt(store: Store, data: PaperData, attempt: Attempt, auto: boolean, now: Date) {
  const { subject } = attemptContext(data, attempt);
  const results = markAnswers(attemptQuestions(data, attempt), subject?.autoMarkTheory ?? true, readAnswers(attempt));
  const fields = {
    // Saved with the marks, so a submit with final answers is a single write.
    answers: attempt.answers,
    status: "submitted" as const,
    submittedAt: auto && attempt.deadlineAt ? attempt.deadlineAt : now,
    autoSubmitted: auto,
    results,
    ...totals(results),
    updatedAt: now,
  };
  await store.write([update("attempts", attempt.id, fields)]);
  return { ...attempt, ...fields };
}

async function ownAttempt(store: Store, studentId: string, attemptId: string) {
  // One read for everything the runner, submit and results need (each read is a trip to the Google Sheet).
  const data = await store.read("attempts", "assignments", "markQueries", ...PAPER_TABLES);
  const attempt = data.attempts.find((a) => a.id === attemptId && a.studentId === studentId);
  if (!attempt) throw new AttemptError("That attempt doesn't exist.");
  const assignment = attempt.assignmentId ? (data.assignments.find((x) => x.id === attempt.assignmentId) ?? null) : null;
  return { data, attempt, assignment };
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
    await finishAttempt(store, data, attempt, true, now);
    return { status: "submitted" as const };
  }
  await store.write([update("attempts", attempt.id, { answers: mergeAnswers(data, attempt, parsed.data), updatedAt: now })]);
  return { status: "saved" as const };
}

/** The answers to keep: only this attempt's questions; in practice mode, objective answers already given stay. */
function mergeAnswers(data: PaperData, attempt: Attempt, incoming: Answers): Answers {
  const allowed = new Set(attemptQuestions(data, attempt).map((q) => q.id));
  const before = readAnswers(attempt);
  const answers: Answers = {};
  for (const [id, entry] of Object.entries(incoming)) {
    if (!allowed.has(id)) continue;
    answers[id] = attempt.mode === "practice" && before[id]?.choice ? { ...entry, choice: before[id].choice } : entry;
  }
  return answers;
}

/**
 * Saves the final answers (when given and still in time) and marks the attempt, in one read and one write:
 * each trip to the Google Sheet takes a second or more.
 */
export async function submitAttempt(store: Store, studentId: string, attemptId: string, raw: unknown, now = new Date()) {
  const { data, attempt } = await ownAttempt(store, studentId, attemptId);
  if (attempt.status !== "in_progress") return attempt;
  const expired = isExpired(attempt, now);
  if (raw === undefined || expired) return finishAttempt(store, data, attempt, expired, now);
  const parsed = answersSchema.safeParse(raw);
  if (!parsed.success) throw new AttemptError("Those answers couldn't be read.");
  return finishAttempt(store, data, { ...attempt, answers: mergeAnswers(data, attempt, parsed.data) }, false, now);
}

/** What the runner needs. The answer key is only included in practice mode. */
export async function loadAttemptForRunner(store: Store, studentId: string, attemptId: string, now = new Date()) {
  const own = await ownAttempt(store, studentId, attemptId);
  const data = own.data;
  let attempt = own.attempt;
  if (attempt.status === "in_progress" && isExpired(attempt, now)) {
    attempt = await finishAttempt(store, data, attempt, true, now);
  }
  const ctx = attemptContext(data, attempt, own.assignment);
  const questions = attemptQuestions(data, attempt);
  return {
    attempt: {
      id: attempt.id,
      mode: attempt.mode,
      status: attempt.status,
      deadlineAt: attempt.deadlineAt?.toISOString() ?? null,
      timeLimitMinutes: attempt.timeLimitMinutes,
      answers: readAnswers(attempt),
    },
    paper: {
      title: ctx.title,
      subjectName: ctx.subject?.name ?? "",
      subjectCode: ctx.subject?.code ?? "",
      autoMarkTheory: ctx.subject?.autoMarkTheory ?? true,
    },
    questions: questions.map((q, i) => ({
      id: q.id,
      // A teacher's pick mixes papers, so number the questions in order instead of the printed labels.
      numberLabel: attempt.questionIds.length ? String(i + 1) : q.numberLabel,
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

/**
 * When students may see the answer key of assigned work. Self-practice always shows it.
 * Returns null if the solutions are visible now, otherwise when they will be (null date = when the teacher releases them).
 */
export function solutionsHiddenUntil(a: Assignment | null | undefined, now: Date): { until: Date | null } | null {
  if (!a || a.solutions === "after_submit" || a.solutions === "instant") return null;
  if (a.solutions === "after_close") return now.getTime() >= a.closesAt.getTime() ? null : { until: a.closesAt };
  return a.solutionsReleasedAt ? null : { until: null };
}

/**
 * Everything the results page shows. Only for submitted attempts.
 * For assigned work whose solutions aren't released yet, only the score comes back: no answer key, no marking.
 */
export async function loadAttemptResults(store: Store, studentId: string, attemptId: string, now = new Date()) {
  const { data, attempt, assignment } = await ownAttempt(store, studentId, attemptId);
  if (attempt.status !== "submitted") return null;
  const ctx = attemptContext(data, attempt, assignment);
  const hidden = solutionsHiddenUntil(assignment, now);
  const answers = readAnswers(attempt);
  const results = (attempt.results ?? {}) as Results;
  const queries = data.markQueries.filter((m) => m.attemptId === attempt.id);
  return {
    attempt,
    paper: {
      title: ctx.title,
      paperTitle: ctx.paperTitle,
      subjectName: ctx.subject?.name ?? "",
      subjectCode: ctx.subject?.code ?? "",
    },
    assignment: assignment ? { id: assignment.id, title: assignment.title } : null,
    solutionsHidden: hidden,
    questions: (hidden ? [] : attemptQuestions(data, attempt)).map((q, i) => {
      const query = queries.filter((m) => m.questionId === q.id).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
      return {
        id: q.id,
        numberLabel: attempt.questionIds.length ? String(i + 1) : q.numberLabel,
        type: q.type,
        text: q.text,
        marks: q.marks,
        options: q.options.map(({ label, text, isCorrect }) => ({ label, text, isCorrect })),
        modelAnswer: q.modelAnswer,
        answer: answers[q.id] ?? {},
        result: results[q.id] ?? null,
        query: query ? { status: query.status, message: query.message, reply: query.reply, createdAt: query.createdAt } : null,
      };
    }),
  };
}

/** A student's attempts, newest first, for the Progress page. */
export async function listStudentAttempts(store: Store, studentId: string) {
  const data = await store.read("attempts", "assignments", ...PAPER_TABLES);
  return data.attempts
    .filter((a) => a.studentId === studentId)
    .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
    .map((a) => {
      const assignment = a.assignmentId ? data.assignments.find((x) => x.id === a.assignmentId) : undefined;
      const ctx = attemptContext(data, a, assignment);
      return {
        assigned: !!assignment,
        id: a.id,
        status: a.status,
        mode: a.mode,
        startedAt: a.startedAt,
        submittedAt: a.submittedAt,
        autoSubmitted: a.autoSubmitted,
        score: a.score,
        maxScore: a.maxScore,
        pendingMarks: a.pendingMarks,
        title: ctx.subject ? ctx.title : "Removed paper",
      };
    });
}
