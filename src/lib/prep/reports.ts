import { assignmentState, scopeOf, standing } from "./assignments";
import type { SessionRole } from "./auth/accounts";
import { attemptContext, PAPER_TABLES, type PaperData } from "./practice/attempts";
import { mixedSummary } from "./practice/mixed";
import type { Assignment, Attempt, PracticeItem, RowOf, Store, User } from "./store";

/**
 * Progress reports. Every report has three parts and nothing else:
 * - BECE Prep: past papers the student did on their own (Test mode), and Practice mode progress per subject;
 * - Quizzes and Assignments: work a teacher set for the student's class.
 * Students, their parents and their teachers see the same report. A teacher's copy covers only the subjects
 * they teach that student (the same rule as marking); admins see every subject.
 *
 * Scores count only what has been marked: a theory answer still with a teacher doesn't count as 0.
 */

export type ReportData = PaperData & { attempts: Attempt[]; assignments: Assignment[]; classes: RowOf<"classes">[]; practiceItems: PracticeItem[] };

export async function loadReportData(store: Store): Promise<ReportData> {
  return store.read("attempts", "assignments", "classes", "practiceItems", ...PAPER_TABLES);
}

export type ReportItem = {
  attemptId: string;
  title: string;
  subjectId: string;
  subjectName: string;
  at: Date;
  score: number;
  /** Marks given so far (the paper's marks minus any still with a teacher). */
  marked: number;
  pendingMarks: number;
  /** Score as a percentage of `marked`, or null while nothing has been marked. */
  percent: number | null;
};

export type SubjectLine = { subjectId: string; name: string; done: number; average: number | null };

type Summary = { done: number; average: number | null; best: number | null; bySubject: SubjectLine[]; items: ReportItem[] };

/** Practice mode (mixed years) per subject: questions mastered out of the subject's questions. */
export type PracticeLine = { subjectId: string; name: string; total: number; mastered: number; toRedo: number };
export type BecePart = Summary & { practice: PracticeLine[] };
/** Set work: how much was set, done, still open, and missed (closed without being done). */
export type WorkPart = Summary & { set: number; open: number; missed: number; missedTitles: string[] };

export type StudentReport = { bece: BecePart; quizzes: WorkPart; assignments: WorkPart; lastActive: Date | null };

const pct = (a: Pick<Attempt, "score" | "maxScore" | "pendingMarks">) => {
  const marked = (a.maxScore ?? 0) - (a.pendingMarks ?? 0);
  return marked > 0 ? Math.round(((a.score ?? 0) / marked) * 100) : null;
};

const mean = (xs: number[]) => (xs.length ? Math.round(xs.reduce((s, x) => s + x, 0) / xs.length) : null);

function summarise(items: ReportItem[]): Summary {
  const scored = items.map((i) => i.percent).filter((p): p is number => p !== null);
  const bySubject = new Map<string, SubjectLine & { scores: number[] }>();
  for (const i of items) {
    const line = bySubject.get(i.subjectId) ?? { subjectId: i.subjectId, name: i.subjectName, done: 0, average: null, scores: [] };
    line.done++;
    if (i.percent !== null) line.scores.push(i.percent);
    bySubject.set(i.subjectId, line);
  }
  return {
    done: items.length,
    average: mean(scored),
    best: scored.length ? Math.max(...scored) : null,
    bySubject: [...bySubject.values()]
      .map(({ scores, ...l }) => ({ ...l, average: mean(scores) }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    // Newest first.
    items: [...items].sort((a, b) => b.at.getTime() - a.at.getTime()),
  };
}

function itemOf(data: ReportData, t: Attempt, assignment?: Assignment): ReportItem | null {
  const ctx = attemptContext(data, t, assignment);
  if (!ctx.subject) return null;
  return {
    attemptId: t.id,
    title: assignment ? assignment.title : (ctx.paperTitle ?? ctx.title),
    subjectId: ctx.subject.id,
    subjectName: ctx.subject.name,
    at: t.submittedAt ?? t.startedAt,
    score: t.score ?? 0,
    marked: (t.maxScore ?? 0) - (t.pendingMarks ?? 0),
    pendingMarks: t.pendingMarks ?? 0,
    percent: pct(t),
  };
}

/**
 * One student's report. `subjects`: the subject IDs the viewer may see (null = all).
 */
export function buildReport(data: ReportData, student: Pick<User, "id" | "classId">, subjects: Set<string> | null, now = new Date()): StudentReport {
  const visible = (subjectId: string | undefined) => !!subjectId && (!subjects || subjects.has(subjectId));
  const mine = data.attempts.filter((t) => t.studentId === student.id);

  const practice = mine
    .filter((t) => !t.assignmentId && t.status === "submitted")
    .map((t) => itemOf(data, t))
    .filter((i): i is ReportItem => !!i && visible(i.subjectId));

  const work = (category: Assignment["category"]): WorkPart => {
    const set = data.assignments.filter(
      (a) =>
        a.status === "published" &&
        a.category === category &&
        !!student.classId &&
        a.classIds.includes(student.classId) &&
        visible(a.subjectId) &&
        assignmentState(a, now) !== "scheduled",
    );
    const items: ReportItem[] = [];
    let open = 0;
    const missedTitles: string[] = [];
    for (const a of set) {
      const s = standing(mine.filter((t) => t.assignmentId === a.id), a.attemptPolicy);
      const counted = s.status === "submitted" ? s.counted : null;
      const item = counted ? itemOf(data, counted, a) : null;
      if (item) items.push(item);
      else if (assignmentState(a, now) === "closed") missedTitles.push(a.title);
      else open++;
    }
    return { ...summarise(items), set: set.length, open, missed: missedTitles.length, missedTitles };
  };

  const activity = mine.map((t) => (t.submittedAt ?? t.startedAt).getTime());
  return {
    bece: { ...summarise(practice), practice: mixedSummary(data, student.id, subjects) },
    quizzes: work("quiz"),
    assignments: work("assignment"),
    lastActive: activity.length ? new Date(Math.max(...activity)) : null,
  };
}

/** Subject ID -> class IDs this viewer covers. Admins: everything. Teachers: what they're assigned to. */
export const viewerScope = (store: Store, viewer: { id: string; role: SessionRole }) => scopeOf(store, viewer);

/** The subjects of `scope` this student's class is covered for, or null for an admin (all subjects). */
export function subjectsFor(scope: Awaited<ReturnType<typeof scopeOf>>, classId: string | null, role: SessionRole): Set<string> | null {
  if (role === "admin") return null;
  return new Set([...scope].filter(([, classes]) => !!classId && classes.has(classId)).map(([subjectId]) => subjectId));
}

export type ClassRow = {
  student: Pick<User, "id" | "name" | "loginId" | "active">;
  report: StudentReport;
};

/** A class at a glance for a teacher (their subjects only) or an admin: one row per student. */
export async function classReport(store: Store, viewer: { id: string; role: SessionRole }, classId: string, now = new Date()) {
  const [scope, data, { users }] = await Promise.all([viewerScope(store, viewer), loadReportData(store), store.read("users")]);
  const subjects = subjectsFor(scope, classId, viewer.role);
  if (subjects && !subjects.size) return null;
  const schoolClass = data.classes.find((c) => c.id === classId);
  if (!schoolClass) return null;
  const rows: ClassRow[] = users
    .filter((u) => u.role === "student" && u.classId === classId)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((u) => ({ student: { id: u.id, name: u.name, loginId: u.loginId, active: u.active }, report: buildReport(data, u, subjects, now) }));
  const subjectNames = subjects ? data.subjects.filter((s) => subjects.has(s.id)).map((s) => s.name) : null;
  return { schoolClass, rows, subjectNames };
}

/** The classes a viewer can open reports for, with how many students each has. */
export async function reportClasses(store: Store, viewer: { id: string; role: SessionRole }) {
  const [scope, { classes, users }] = await Promise.all([viewerScope(store, viewer), store.read("classes", "users")]);
  const covered = new Set([...scope.values()].flatMap((s) => [...s]));
  return classes
    .filter((c) => viewer.role === "admin" || covered.has(c.id))
    .sort((a, b) => a.yearGroup - b.yearGroup || a.name.localeCompare(b.name))
    .map((c) => ({ id: c.id, name: c.name, academicYear: c.academicYear, students: users.filter((u) => u.role === "student" && u.classId === c.id).length }));
}

/** One student's report as this viewer may see it, or null if the student isn't theirs to see. */
export async function studentReportFor(store: Store, viewer: { id: string; role: SessionRole }, studentId: string, now = new Date()) {
  const [scope, data, { users }] = await Promise.all([viewerScope(store, viewer), loadReportData(store), store.read("users")]);
  const student = users.find((u) => u.id === studentId && u.role === "student");
  if (!student) return null;
  const subjects = subjectsFor(scope, student.classId, viewer.role);
  if (subjects && !subjects.size) return null;
  const schoolClass = data.classes.find((c) => c.id === student.classId) ?? null;
  return { student, schoolClass, report: buildReport(data, student, subjects, now), subjectNames: subjects ? data.subjects.filter((s) => subjects.has(s.id)).map((s) => s.name) : null };
}

/** The student's own report, or a parent's view of their child: every subject. */
export async function fullReport(store: Store, student: Pick<User, "id" | "classId">, now = new Date()) {
  return buildReport(await loadReportData(store), student, null, now);
}
