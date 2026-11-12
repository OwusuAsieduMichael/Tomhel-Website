import { z } from "zod";
import { formatDayTime, formatTime } from "./format";
import { noticeOps } from "./notices";
import { attemptQuestions, AttemptError, finishAttempt, isExpired, newAttemptRow, PAPER_TABLES, type PaperData } from "./practice/attempts";
import {
  ASSIGNMENT_SOURCES,
  WORK_CATEGORIES,
  ASSIGNMENT_STATUSES,
  ATTEMPT_POLICIES,
  QUESTION_KINDS,
  insert,
  newId,
  remove,
  SOLUTION_POLICIES,
  update,
  type Assignment,
  type Attempt,
  type Question,
  type Role,
  type SchoolClass,
  type Store,
} from "./store";

/**
 * Work teachers set for their classes, open between two dates, with an optional time limit: a whole past paper,
 * a quiz drawn from chosen topics, or questions the teacher picks from the question bank.
 *
 * - A teacher can set work only for subjects (and classes) the admin assigned them. Admins can set anything.
 * - Each student's attempt ends at their own time limit or at the close date, whichever comes first.
 *   Attempts still running at the close are submitted automatically, with the answers last saved.
 * - Once any student has started, the questions can't be changed and the assignment can't go back to draft.
 * - Students get an in-app notice when work is published, when reminded, and when solutions are released.
 */

type QuestionKind = (typeof QUESTION_KINDS)[number];
export type WorkCategory = (typeof WORK_CATEGORIES)[number];

/** Where students find this kind of work, and what to call it. */
export const workHref = (c: WorkCategory) => (c === "quiz" ? "/prep/student/academic/quiz" : "/prep/student/academic/assignments");
export const workWord = (c: WorkCategory) => (c === "quiz" ? "quiz" : "assignment");

/** The questions of an assignment, in order. */
export const assignmentQuestions = (data: PaperData, a: Pick<Assignment, "paperId" | "questionIds">) => attemptQuestions(data, a);

/** "BECE 2023 Paper 1", or "12 objective questions on Plants, Cells". */
export function describeAssignment(data: Pick<PaperData, "papers"> & { topics: { id: string; strand: string }[] }, a: Assignment) {
  if (a.source === "paper") {
    const p = data.papers.find((x) => x.id === a.paperId);
    return p ? `BECE ${p.year} Paper ${p.paperNo}` : "Past paper";
  }
  const n = a.questionIds.length;
  const what = `${n} ${a.kind === "objective" ? "objective" : "written"} ${n === 1 ? "question" : "questions"}`;
  if (a.source === "bank") return what;
  const names = a.topicIds.map((t) => data.topics.find((x) => x.id === t)?.strand).filter(Boolean);
  return names.length ? `${what} on ${[...new Set(names)].join(", ")}` : what;
}

export class AssignmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssignmentError";
  }
}

type Actor = { id: string; role: Role };

/** Ghana keeps UTC+0 all year (no daylight saving), so a school-local date-time is the same as UTC. */
export const SCHOOL_TIME_ZONE = "Africa/Accra";

/** Reads a datetime-local input value ("2026-11-10T08:00") as school time. */
export function parseSchoolDateTime(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const d = new Date(`${value}:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** The value for a datetime-local input, in school time. */
export const toSchoolDateTimeInput = (d: Date) => d.toISOString().slice(0, 16);

export type AssignmentState = "draft" | "scheduled" | "open" | "closed";

export function assignmentState(a: Pick<Assignment, "status" | "opensAt" | "closesAt">, now: Date): AssignmentState {
  if (a.status === "draft") return "draft";
  if (now.getTime() < a.opensAt.getTime()) return "scheduled";
  if (now.getTime() < a.closesAt.getTime()) return "open";
  return "closed";
}

// ---------------------------------------------------------------------------
// What a teacher may set work for
// ---------------------------------------------------------------------------

export type Scope = Map<string, Set<string>>;

/** Subject ID -> class IDs the actor may set work for (and mark work from) in that subject. */
export async function scopeOf(store: Store, actor: Actor): Promise<Scope> {
  const { teacherSubjects, subjects, classes } = await store.read("teacherSubjects", "subjects", "classes");
  const all = classes.map((c) => c.id);
  const scope: Scope = new Map();
  if (actor.role === "admin") {
    for (const s of subjects) scope.set(s.id, new Set(all));
    return scope;
  }
  if (actor.role !== "teacher") return scope;
  for (const ts of teacherSubjects.filter((t) => t.teacherId === actor.id)) {
    const set = scope.get(ts.subjectId) ?? new Set<string>();
    for (const c of ts.classId ? [ts.classId] : all) set.add(c);
    scope.set(ts.subjectId, set);
  }
  return scope;
}

const inScope = (scope: Scope, a: Pick<Assignment, "subjectId" | "classIds">) => {
  const allowed = scope.get(a.subjectId);
  return !!allowed && a.classIds.length > 0 && a.classIds.every((c) => allowed.has(c));
};

const kindOf = (q: Pick<Question, "type">): QuestionKind => (q.type === "mcq" ? "objective" : "theory");

/** Subjects, papers, topics, bank questions and classes the actor can choose from on the assignment form. */
export async function getAssignmentFormOptions(store: Store, actor: Actor) {
  const scope = await scopeOf(store, actor);
  const { subjects, papers, questions, classes, users, topics } = await store.read("subjects", "papers", "questions", "classes", "users", "topics");
  const live = questions.filter((q) => q.status === "approved");
  const approved = new Map<string, { questions: number; marks: number; mcq: boolean }>();
  for (const q of live) {
    if (!q.paperId) continue;
    const c = approved.get(q.paperId) ?? { questions: 0, marks: 0, mcq: true };
    approved.set(q.paperId, { questions: c.questions + 1, marks: c.marks + q.marks, mcq: c.mcq && q.type === "mcq" });
  }
  const students = (classId: string) => users.filter((u) => u.role === "student" && u.active && u.classId === classId).length;
  return subjects
    .filter((s) => scope.has(s.id))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((s) => {
      const subjectQuestions = live.filter((q) => q.subjectId === s.id);
      return {
        id: s.id,
        name: s.name,
        autoMarkTheory: s.autoMarkTheory,
        papers: papers
          .filter((p) => p.subjectId === s.id && approved.has(p.id))
          .sort((a, b) => b.year - a.year || a.paperNo - b.paperNo)
          .map((p) => ({ id: p.id, year: p.year, paperNo: p.paperNo, durationMinutes: p.durationMinutes, ...approved.get(p.id)! })),
        topics: topics
          .filter((t) => t.subjectId === s.id)
          .map((t) => ({
            id: t.id,
            name: t.subStrand ? `${t.strand}: ${t.subStrand}` : t.strand,
            objective: subjectQuestions.filter((q) => q.topicId === t.id && kindOf(q) === "objective").length,
            theory: subjectQuestions.filter((q) => q.topicId === t.id && kindOf(q) === "theory").length,
          }))
          .filter((t) => t.objective + t.theory > 0)
          .sort((a, b) => a.name.localeCompare(b.name)),
        bank: subjectQuestions
          .map((q) => {
            const p = papers.find((x) => x.id === q.paperId);
            return {
              id: q.id,
              kind: kindOf(q),
              text: q.text.length > 160 ? `${q.text.slice(0, 157)}…` : q.text,
              marks: q.marks,
              source: p ? `${p.year} P${p.paperNo} Q${q.numberLabel}` : `Q${q.numberLabel}`,
              topicId: q.topicId,
              sort: [p?.year ?? 0, p?.paperNo ?? 0, q.position] as const,
            };
          })
          .sort((a, b) => b.sort[0] - a.sort[0] || a.sort[1] - b.sort[1] || a.sort[2] - b.sort[2])
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          .map(({ sort, ...q }) => q),
        classes: sortClasses(classes.filter((c) => scope.get(s.id)!.has(c.id))).map((c) => ({ id: c.id, name: c.name, students: students(c.id) })),
      };
    });
}
export type AssignmentFormOptions = Awaited<ReturnType<typeof getAssignmentFormOptions>>;

const sortClasses = (cs: SchoolClass[]) => [...cs].sort((a, b) => a.yearGroup - b.yearGroup || a.name.localeCompare(b.name));

// ---------------------------------------------------------------------------
// Creating and changing assignments
// ---------------------------------------------------------------------------

const dateTime = (label: string) =>
  z.string().transform((v, ctx) => {
    const d = parseSchoolDateTime(v);
    if (!d) ctx.addIssue({ code: "custom", message: `Choose when it ${label}.` });
    return d ?? new Date(0);
  });

export const assignmentInputSchema = z
  .object({
    category: z.enum(WORK_CATEGORIES).default("assignment"),
    subjectId: z.string().uuid("Choose a subject."),
    source: z.enum(ASSIGNMENT_SOURCES).default("paper"),
    kind: z.enum(QUESTION_KINDS).default("objective"),
    paperId: z.string().uuid("Choose a paper.").nullable().default(null),
    topicIds: z.array(z.string().uuid()).max(100).default([]),
    questionIds: z.array(z.string().uuid()).max(200, "Pick at most 200 questions.").default([]),
    /** source = topic: how many questions to draw from the topics (null = all of them). */
    questionLimit: z.number().int().min(1, "Ask for at least 1 question.").max(200, "At most 200 questions.").nullable().default(null),
    title: z.string().trim().min(1, "Give the assignment a title.").max(120, "Keep the title under 120 characters."),
    classIds: z.array(z.string().uuid()).min(1, "Choose at least one class."),
    timeLimitMinutes: z.number().int().min(5, "A time limit must be at least 5 minutes.").max(240, "A time limit can be at most 4 hours.").nullable(),
    opensAt: dateTime("opens"),
    closesAt: dateTime("closes"),
    attemptPolicy: z.enum(ATTEMPT_POLICIES),
    solutions: z.enum(SOLUTION_POLICIES),
    status: z.enum(ASSIGNMENT_STATUSES),
  })
  .refine((v) => v.closesAt.getTime() > v.opensAt.getTime(), { message: "The close date must be after the open date.", path: ["closesAt"] })
  .refine((v) => v.source !== "paper" || v.paperId, { message: "Choose a paper.", path: ["paperId"] })
  .refine((v) => v.source !== "topic" || v.topicIds.length > 0, { message: "Choose at least one topic.", path: ["topicIds"] })
  .refine((v) => v.source !== "bank" || v.questionIds.length > 0, { message: "Pick at least one question.", path: ["questionIds"] });
/** Reads the form: time is a preset number of minutes, "custom" (then customMinutes) or "none". */
function readForm(formData: FormData) {
  const time = String(formData.get("time") ?? "none");
  const minutes = time === "none" ? null : Number(time === "custom" ? formData.get("customMinutes") : time);
  const source = String(formData.get("source") ?? "paper");
  const limit = String(formData.get("questionLimit") ?? "").trim();
  return {
    category: formData.get("category") ?? "assignment",
    subjectId: formData.get("subjectId"),
    source,
    kind: formData.get("kind") ?? "objective",
    paperId: source === "paper" ? formData.get("paperId") || null : null,
    topicIds: source === "topic" ? formData.getAll("topicIds") : [],
    questionIds: source === "bank" ? formData.getAll("questionIds") : [],
    questionLimit: source === "topic" && limit ? Number(limit) : null,
    title: formData.get("title"),
    classIds: formData.getAll("classIds"),
    timeLimitMinutes: minutes === null || Number.isNaN(minutes) ? (time === "none" ? null : 0) : minutes,
    opensAt: formData.get("opensAt"),
    closesAt: formData.get("closesAt"),
    attemptPolicy: formData.get("attemptPolicy"),
    solutions: formData.get("solutions"),
    status: formData.get("status"),
  };
}

/** Parses the assignment form (the fields the form in /prep/teacher/assignments submits). */
export const assignmentFromForm = (formData: FormData) => assignmentInputSchema.safeParse(readForm(formData));

type ParsedInput = z.output<typeof assignmentInputSchema>;
type Defaulted = "category" | "source" | "kind" | "paperId" | "topicIds" | "questionIds" | "questionLimit";
/** A parsed form. The question-source fields default to a whole past paper. */
export type AssignmentInput = Omit<ParsedInput, Defaulted> & Partial<Pick<ParsedInput, Defaulted>>;

async function loadOwnAssignment(store: Store, actor: Actor, id: string) {
  const [scope, { assignments }] = await Promise.all([scopeOf(store, actor), store.read("assignments")]);
  const a = assignments.find((x) => x.id === id);
  if (!a || !inScope(scope, a)) throw new AssignmentError("That assignment doesn't exist.");
  return { scope, assignment: a };
}

/** Fisher-Yates on a copy. */
function shuffled<T>(items: T[], random = Math.random) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

type SaveData = { questions: Question[]; papers: { id: string; subjectId: string; year: number }[]; topics: { id: string; subjectId: string }[] };

/**
 * Works out which questions the assignment is made of. For a topic quiz with a limit the questions are drawn at
 * random once, here, so every student gets the same set.
 */
type Resolved = { paperId: string | null; topicIds: string[]; questionIds: string[]; kind: QuestionKind };
function resolveQuestions(data: SaveData, input: ParsedInput, existing: Assignment | undefined): Resolved {
  const live = data.questions.filter((q) => q.status === "approved" && q.subjectId === input.subjectId);
  if (input.source === "paper") {
    const paper = data.papers.find((p) => p.id === input.paperId && p.subjectId === input.subjectId);
    const qs = live.filter((q) => q.paperId === paper?.id);
    if (!paper || !qs.length) throw new AssignmentError("That paper has no approved questions yet.");
    return { paperId: paper.id, topicIds: [], questionIds: [], kind: qs.every((q) => q.type === "mcq") ? ("objective" as const) : ("theory" as const) };
  }

  if (input.source === "bank") {
    const ids = [...new Set(input.questionIds)];
    const picked = ids.map((id) => live.find((q) => q.id === id));
    if (picked.some((q) => !q)) throw new AssignmentError("Some of those questions aren't approved for this subject.");
    if (picked.some((q) => kindOf(q!) !== input.kind)) {
      throw new AssignmentError(input.kind === "objective" ? "Pick only objective (multiple-choice) questions." : "Pick only written (theory) questions.");
    }
    return { paperId: null, topicIds: [], questionIds: ids, kind: input.kind };
  }

  const topicIds = [...new Set(input.topicIds)];
  if (topicIds.some((t) => !data.topics.some((x) => x.id === t && x.subjectId === input.subjectId))) {
    throw new AssignmentError("Choose topics from this subject.");
  }
  const year = (q: Question) => data.papers.find((p) => p.id === q.paperId)?.year ?? 0;
  const pool = live
    .filter((q) => q.topicId && topicIds.includes(q.topicId) && kindOf(q) === input.kind)
    .sort((a, b) => year(b) - year(a) || a.position - b.position);
  if (!pool.length) throw new AssignmentError(`Those topics have no approved ${input.kind === "objective" ? "objective" : "written"} questions yet.`);

  // Keep the existing draw if nothing about it changed, so editing the title doesn't reshuffle the quiz.
  const want = input.questionLimit ? Math.min(input.questionLimit, pool.length) : pool.length;
  const same =
    existing?.source === "topic" &&
    existing.kind === input.kind &&
    existing.topicIds.length === topicIds.length &&
    existing.topicIds.every((t) => topicIds.includes(t)) &&
    existing.questionIds.length === want &&
    existing.questionIds.every((id) => pool.some((q) => q.id === id));
  if (same) return { paperId: null, topicIds, questionIds: existing.questionIds, kind: input.kind };

  const chosen = new Set(shuffled(pool).slice(0, want).map((q) => q.id));
  return { paperId: null, topicIds, questionIds: pool.filter((q) => chosen.has(q.id)).map((q) => q.id), kind: input.kind };
}

/** Creates an assignment, or updates one when `id` is given. Returns its ID. */
export async function saveAssignment(store: Store, actor: Actor, raw: AssignmentInput, id?: string, now = new Date()): Promise<string> {
  const input: ParsedInput = { category: "assignment", source: "paper", kind: "objective", paperId: null, topicIds: [], questionIds: [], questionLimit: null, ...raw };
  if (input.closesAt.getTime() <= input.opensAt.getTime()) throw new AssignmentError("The close date must be after the open date.");
  const scope = await scopeOf(store, actor);
  const data = await store.read("assignments", "attempts", "papers", "questions", "topics", "users", "subjects");
  const classIds = [...new Set(input.classIds)];
  if (!inScope(scope, { subjectId: input.subjectId, classIds })) {
    throw new AssignmentError("You can only set work for your own subjects and classes.");
  }
  const existing = id ? data.assignments.find((a) => a.id === id) : undefined;
  if (id && (!existing || !inScope(scope, existing))) throw new AssignmentError("That assignment doesn't exist.");
  const started = !!id && data.attempts.some((t) => t.assignmentId === id);

  let questions: Resolved;
  if (started && existing) {
    // Students have the questions already: the set is fixed.
    if (input.source !== existing.source || input.subjectId !== existing.subjectId || (input.source === "paper" && input.paperId !== existing.paperId)) {
      throw new AssignmentError("Students have already started this, so its questions can't be changed.");
    }
    if (input.status === "draft") throw new AssignmentError("Students have already started, so this can't go back to draft.");
    questions = { paperId: existing.paperId, topicIds: existing.topicIds, questionIds: existing.questionIds, kind: existing.kind };
  } else {
    questions = resolveQuestions(data, input, existing);
  }

  if (input.solutions === "instant" && questions.kind !== "objective") {
    throw new AssignmentError("Marking as students answer works for objective questions only. Choose another option for written work.");
  }

  const fields = {
    category: input.category,
    subjectId: input.subjectId,
    source: input.source,
    ...questions,
    title: input.title,
    classIds,
    timeLimitMinutes: input.timeLimitMinutes,
    opensAt: input.opensAt,
    closesAt: input.closesAt,
    attemptPolicy: input.attemptPolicy,
    solutions: input.solutions,
    status: input.status,
    updatedAt: now,
  };

  // Students hear about work when it is published, and when their class is added to published work.
  const wasLive = existing?.status === "published";
  const newClasses = input.status !== "published" ? [] : wasLive ? classIds.filter((c) => !existing!.classIds.includes(c)) : classIds;
  const subject = data.subjects.find((s) => s.id === input.subjectId);
  const notify = noticeOps(
    data.users.filter((u) => u.role === "student" && u.active && !!u.classId && newClasses.includes(u.classId)).map((u) => u.id),
    {
      title: `New ${workWord(input.category)}: ${subject?.name ?? ""} · ${input.title}`,
      body: `${now.getTime() < input.opensAt.getTime() ? `Opens ${formatDayTime(input.opensAt)}. ` : ""}Closes ${formatDayTime(input.closesAt)}.`,
      href: workHref(input.category),
    },
    now,
  );

  if (!existing) {
    if (input.status === "published" && input.closesAt.getTime() <= now.getTime()) {
      throw new AssignmentError("The close date has already passed.");
    }
    const row: Assignment = { id: newId(), createdBy: actor.id, solutionsReleasedAt: null, remindedAt: null, createdAt: now, ...fields };
    await store.write([insert("assignments", [row]), ...notify]);
    return row.id;
  }
  await store.write([update("assignments", existing.id, fields), ...notify]);
  return existing.id;
}

/** Deletes an assignment nobody has started. */
export async function deleteAssignment(store: Store, actor: Actor, id: string) {
  await loadOwnAssignment(store, actor, id);
  const { attempts } = await store.read("attempts");
  if (attempts.some((t) => t.assignmentId === id)) {
    throw new AssignmentError("Students have already started this, so it can't be deleted. Change its close date instead.");
  }
  await store.write([remove("assignments", [id])]);
}

/** For solutions = on_release: lets students see the answer key and solutions. */
export async function releaseSolutions(store: Store, actor: Actor, id: string, now = new Date()) {
  const { assignment } = await loadOwnAssignment(store, actor, id);
  if (assignment.solutionsReleasedAt) return;
  const { attempts } = await store.read("attempts");
  const done = [...new Set(attempts.filter((t) => t.assignmentId === id && t.status === "submitted").map((t) => t.studentId))];
  await store.write([
    update("assignments", id, { solutionsReleasedAt: now, updatedAt: now }),
    ...noticeOps(done, { title: `Solutions are ready: ${assignment.title}`, body: "Your teacher has released the answers and solutions.", href: workHref(assignment.category) }, now),
  ]);
}

/** Students can be reminded once an hour at most. */
export const REMINDER_GAP_MS = 60 * 60_000;

/** Sends a reminder to every student who hasn't submitted yet. Returns how many were reminded. */
export async function sendReminder(store: Store, actor: Actor, id: string, now = new Date()): Promise<number> {
  const { assignment: a } = await loadOwnAssignment(store, actor, id);
  if (assignmentState(a, now) !== "open") throw new AssignmentError("You can only send reminders while the work is open.");
  if (a.remindedAt && now.getTime() - a.remindedAt.getTime() < REMINDER_GAP_MS) {
    throw new AssignmentError(`You sent a reminder at ${formatTime(a.remindedAt)}. You can send another an hour after that.`);
  }
  const { users, attempts, subjects } = await store.read("users", "attempts", "subjects");
  const done = new Set(attempts.filter((t) => t.assignmentId === id && t.status === "submitted").map((t) => t.studentId));
  const waiting = users.filter((u) => u.role === "student" && u.active && !!u.classId && a.classIds.includes(u.classId) && !done.has(u.id)).map((u) => u.id);
  if (!waiting.length) throw new AssignmentError("Everyone has already submitted.");
  const subject = subjects.find((s) => s.id === a.subjectId)?.name ?? "";
  await store.write([
    update("assignments", id, { remindedAt: now }),
    ...noticeOps(waiting, { title: `Reminder: ${subject} · ${a.title}`, body: `Closes ${formatDayTime(a.closesAt)}.`, href: workHref(a.category) }, now),
  ]);
  return waiting.length;
}


// ---------------------------------------------------------------------------
// Teacher views
// ---------------------------------------------------------------------------

/** One student's standing on an assignment, from all their attempts at it. */
function standing(attempts: Attempt[], policy: Assignment["attemptPolicy"]) {
  const submitted = attempts.filter((t) => t.status === "submitted");
  const running = attempts.find((t) => t.status === "in_progress");
  const pick = policy === "best"
    ? [...submitted].sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || a.submittedAt!.getTime() - b.submittedAt!.getTime())[0]
    : submitted[0];
  const status: "submitted" | "in_progress" | "not_started" = pick ? "submitted" : running ? "in_progress" : "not_started";
  return { status, counted: pick ?? running ?? null, attemptCount: attempts.length };
}

export async function getAssignmentForEdit(store: Store, actor: Actor, id: string) {
  const { assignment } = await loadOwnAssignment(store, actor, id);
  const { attempts } = await store.read("attempts");
  return { assignment, started: attempts.some((t) => t.assignmentId === id) };
}

/** The actor's assignments, newest first, with how many students have submitted. */
export async function listAssignments(store: Store, actor: Actor, now = new Date()) {
  const scope = await scopeOf(store, actor);
  const { assignments, attempts, subjects, classes, users } = await store.read("assignments", "attempts", "subjects", "classes", "users");
  return assignments
    .filter((a) => inScope(scope, a))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((a) => {
      const students = users.filter((u) => u.role === "student" && u.active && !!u.classId && a.classIds.includes(u.classId));
      const done = new Set(attempts.filter((t) => t.assignmentId === a.id && t.status === "submitted").map((t) => t.studentId));
      return {
        id: a.id,
        category: a.category,
        title: a.title,
        subject: subjects.find((s) => s.id === a.subjectId)?.name ?? "Unknown subject",
        classes: sortClasses(classes.filter((c) => a.classIds.includes(c.id))).map((c) => c.name),
        state: assignmentState(a, now),
        opensAt: a.opensAt,
        closesAt: a.closesAt,
        students: students.length,
        submitted: students.filter((s) => done.has(s.id)).length,
      };
    });
}

/**
 * The submission tracker. Attempts whose time has run out are submitted first, so the numbers are current
 * even if those students never came back.
 */
export async function getAssignmentTracker(store: Store, actor: Actor, id: string, now = new Date()) {
  const { assignment } = await loadOwnAssignment(store, actor, id);
  let data = await store.read("attempts", "users", "classes", "topics", ...PAPER_TABLES);
  const expired = data.attempts.filter((t) => t.assignmentId === id && t.status === "in_progress" && isExpired(t, now));
  if (expired.length) {
    for (const t of expired) await finishAttempt(store, data, t, true, now);
    data = await store.read("attempts", "users", "classes", "topics", ...PAPER_TABLES);
  }

  const subject = data.subjects.find((s) => s.id === assignment.subjectId);
  const questions = assignmentQuestions(data, assignment);
  const classes = sortClasses(data.classes.filter((c) => assignment.classIds.includes(c.id)));
  const mine = data.attempts.filter((t) => t.assignmentId === id);

  const rows = data.users
    .filter((u) => u.role === "student" && u.active && !!u.classId && assignment.classIds.includes(u.classId))
    .map((u) => {
      const s = standing(
        mine.filter((t) => t.studentId === u.id),
        assignment.attemptPolicy,
      );
      const t = s.counted;
      return {
        studentId: u.id,
        attemptId: t?.id ?? null,
        name: u.name,
        loginId: u.loginId,
        classId: u.classId!,
        className: classes.find((c) => c.id === u.classId)?.name ?? "",
        status: s.status,
        attemptCount: s.attemptCount,
        startedAt: t?.startedAt ?? null,
        submittedAt: s.status === "submitted" ? t!.submittedAt : null,
        autoSubmitted: s.status === "submitted" && t!.autoSubmitted,
        minutes: t ? Math.max(0, Math.round(((t.submittedAt ?? now).getTime() - t.startedAt.getTime()) / 60_000)) : null,
        score: s.status === "submitted" ? (t!.score ?? 0) : null,
        maxScore: t?.maxScore ?? null,
        pendingMarks: s.status === "submitted" ? (t!.pendingMarks ?? 0) : null,
      };
    })
    .sort((a, b) => a.className.localeCompare(b.className) || a.name.localeCompare(b.name));

  const submitted = rows.filter((r) => r.status === "submitted");
  const count = (st: (typeof rows)[number]["status"], classId?: string) => rows.filter((r) => r.status === st && (!classId || r.classId === classId)).length;
  const fullyMarked = submitted.filter((r) => !r.pendingMarks);

  return {
    assignment,
    state: assignmentState(assignment, now),
    subject: { name: subject?.name ?? "Unknown subject", autoMarkTheory: subject?.autoMarkTheory ?? true },
    description: describeAssignment(data, assignment),
    paper: { questions: questions.length, marks: questions.reduce((s, q) => s + q.marks, 0), objective: questions.every((q) => q.type === "mcq") },
    canRemind: assignmentState(assignment, now) === "open" && (!assignment.remindedAt || now.getTime() - assignment.remindedAt.getTime() >= REMINDER_GAP_MS),
    classes: classes.map((c) => ({
      id: c.id,
      name: c.name,
      total: rows.filter((r) => r.classId === c.id).length,
      submitted: count("submitted", c.id),
      inProgress: count("in_progress", c.id),
      notStarted: count("not_started", c.id),
    })),
    summary: {
      total: rows.length,
      submitted: submitted.length,
      inProgress: count("in_progress"),
      notStarted: count("not_started"),
      autoSubmitted: submitted.filter((r) => r.autoSubmitted).length,
      waitingForMarking: submitted.filter((r) => r.pendingMarks).length,
      /** Average over fully marked submissions only. */
      averageScore: fullyMarked.length ? fullyMarked.reduce((s, r) => s + (r.score ?? 0), 0) / fullyMarked.length : null,
    },
    rows,
  };
}
export type AssignmentTracker = Awaited<ReturnType<typeof getAssignmentTracker>>;

// ---------------------------------------------------------------------------
// Students
// ---------------------------------------------------------------------------

type StudentRef = { id: string; classId: string | null };

/** Published work for the student's class, with what they have done on each. Drafts are never shown. */
export async function listStudentAssignments(store: Store, student: StudentRef, now = new Date()) {
  if (!student.classId) return [];
  let data = await store.read("assignments", "attempts", ...PAPER_TABLES);
  // Attempts whose time ran out are submitted now, so the student sees their score rather than "not done".
  const expired = data.attempts.filter((t) => t.studentId === student.id && t.assignmentId && t.status === "in_progress" && isExpired(t, now));
  if (expired.length) {
    for (const t of expired) await finishAttempt(store, data, t, true, now);
    data = await store.read("assignments", "attempts", ...PAPER_TABLES);
  }
  const { assignments, attempts, subjects } = data;
  const { topics } = await store.read("topics");
  return assignments
    .filter((a) => a.status === "published" && a.classIds.includes(student.classId!))
    .map((a) => {
      const mine = attempts.filter((t) => t.assignmentId === a.id && t.studentId === student.id);
      const s = standing(mine, a.attemptPolicy);
      const running = mine.find((t) => t.status === "in_progress" && !isExpired(t, now)) ?? null;
      const state = assignmentState(a, now);
      return {
        id: a.id,
        category: a.category,
        title: a.title,
        subject: subjects.find((x) => x.id === a.subjectId)?.name ?? "",
        paper: describeAssignment({ papers: data.papers, topics }, a),
        timeLimitMinutes: a.timeLimitMinutes,
        opensAt: a.opensAt,
        closesAt: a.closesAt,
        state,
        status: s.status,
        runningAttemptId: running?.id ?? null,
        resultAttemptId: s.status === "submitted" ? s.counted!.id : null,
        score: s.status === "submitted" ? s.counted!.score : null,
        maxScore: s.counted?.maxScore ?? null,
        pendingMarks: s.status === "submitted" ? s.counted!.pendingMarks : null,
        canStart: state === "open" && !running && (s.status !== "submitted" || a.attemptPolicy === "best"),
      };
    })
    .sort((a, b) => a.closesAt.getTime() - b.closesAt.getTime());
}

/** Starts (or resumes) the student's attempt at assigned work. */
export async function startAssignmentAttempt(store: Store, student: StudentRef, assignmentId: string, now = new Date()): Promise<{ id: string; resumed: boolean }> {
  const data = await store.read("assignments", "attempts", ...PAPER_TABLES);
  const a = data.assignments.find((x) => x.id === assignmentId);
  if (!a || a.status !== "published" || !student.classId || !a.classIds.includes(student.classId)) {
    throw new AttemptError("That work isn't set for you.");
  }
  const state = assignmentState(a, now);
  if (state === "scheduled") throw new AttemptError("This work hasn't opened yet.");

  const mine = data.attempts.filter((t) => t.assignmentId === a.id && t.studentId === student.id);
  const open = mine.find((t) => t.status === "in_progress");
  if (open && !isExpired(open, now)) return { id: open.id, resumed: true };
  if (open) await finishAttempt(store, data, open, true, now);

  if (state === "closed") throw new AttemptError("This work has closed.");
  if (a.attemptPolicy === "single" && mine.length > 0) throw new AttemptError("You've already done this work.");

  const questions = assignmentQuestions(data, a);
  if (!questions.length) throw new AttemptError("Those questions aren't available any more. Ask your teacher.");
  const byLimit = a.timeLimitMinutes ? now.getTime() + a.timeLimitMinutes * 60_000 : Infinity;
  const attempt = newAttemptRow({
    studentId: student.id,
    paperId: a.paperId,
    questionIds: a.source === "paper" ? [] : questions.map((q) => q.id),
    assignmentId: a.id,
    // Instant marking shows the key after each question, so it only applies to objective questions.
    mode: a.solutions === "instant" && questions.every((q) => q.type === "mcq") ? "practice" : "full",
    timeLimitMinutes: a.timeLimitMinutes,
    deadlineAt: new Date(Math.min(byLimit, a.closesAt.getTime())),
    maxScore: questions.reduce((s, q) => s + q.marks, 0),
    now,
  });
  await store.write([insert("attempts", [attempt])]);
  return { id: attempt.id, resumed: false };
}
