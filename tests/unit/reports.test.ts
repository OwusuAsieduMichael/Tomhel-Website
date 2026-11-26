import { describe, expect, it } from "vitest";
import { buildReport, subjectsFor, type ReportData } from "@/lib/prep/reports";

const now = new Date("2026-11-20T12:00:00Z");
const day = (d: number) => new Date(now.getTime() - d * 86_400_000);

const SOC = "sub-soc";
const MATH = "sub-math";
const CLASS = "class-jhs3";

function attempt(id: string, o: { paperId?: string; assignmentId?: string; score: number; max: number; pending?: number; daysAgo: number; status?: "submitted" | "in_progress" }) {
  return {
    id,
    studentId: "stu",
    paperId: o.paperId ?? null,
    questionIds: [],
    assignmentId: o.assignmentId ?? null,
    status: o.status ?? "submitted",
    score: o.score,
    maxScore: o.max,
    pendingMarks: o.pending ?? 0,
    startedAt: day(o.daysAgo),
    submittedAt: o.status === "in_progress" ? null : day(o.daysAgo),
  };
}

function assignment(id: string, o: { subjectId: string; category: "quiz" | "assignment"; closesInDays: number; policy?: "single" | "best"; paperId: string }) {
  return {
    id,
    title: `Work ${id}`,
    subjectId: o.subjectId,
    category: o.category,
    status: "published",
    classIds: [CLASS],
    opensAt: day(10),
    closesAt: day(-o.closesInDays),
    attemptPolicy: o.policy ?? "single",
    paperId: o.paperId,
  };
}

const data = {
  subjects: [
    { id: SOC, name: "Social Studies", code: "SOC" },
    { id: MATH, name: "Mathematics", code: "MATH" },
  ],
  papers: [
    { id: "p-soc-2021", subjectId: SOC, year: 2021, paperNo: 1 },
    { id: "p-math-2020", subjectId: MATH, year: 2020, paperNo: 1 },
  ],
  questions: [],
  mcqOptions: [],
  markingPoints: [],
  modelAnswers: [],
  practiceItems: [],
  classes: [{ id: CLASS, name: "JHS 3" }],
  assignments: [
    assignment("q1", { subjectId: SOC, category: "quiz", closesInDays: -1, paperId: "p-soc-2021" }), // closed, done
    assignment("q2", { subjectId: SOC, category: "quiz", closesInDays: -2, paperId: "p-soc-2021" }), // closed, not done -> missed
    assignment("q3", { subjectId: MATH, category: "quiz", closesInDays: 3, paperId: "p-math-2020" }), // open, not done
    assignment("a1", { subjectId: MATH, category: "assignment", closesInDays: 2, policy: "best", paperId: "p-math-2020" }),
  ],
  attempts: [
    attempt("bece-1", { paperId: "p-soc-2021", score: 30, max: 40, daysAgo: 5 }), // 75%
    attempt("bece-2", { paperId: "p-math-2020", score: 10, max: 40, pending: 20, daysAgo: 4 }), // 10/20 marked = 50%
    attempt("bece-3", { paperId: "p-math-2020", score: 0, max: 30, pending: 30, daysAgo: 3 }), // all with a teacher: no %
    attempt("bece-4", { paperId: "p-soc-2021", score: 5, max: 40, daysAgo: 1, status: "in_progress" }), // not finished: not counted
    attempt("quiz-1", { paperId: "p-soc-2021", assignmentId: "q1", score: 8, max: 10, daysAgo: 2 }), // 80%
    attempt("asg-1", { paperId: "p-math-2020", assignmentId: "a1", score: 4, max: 10, daysAgo: 2 }),
    attempt("asg-2", { paperId: "p-math-2020", assignmentId: "a1", score: 9, max: 10, daysAgo: 1 }), // best counts: 90%
  ],
} as unknown as ReportData;

const student = { id: "stu", classId: CLASS };

describe("progress report", () => {
  it("BECE Prep: own practice only, scores counting only marked work", () => {
    const { bece } = buildReport(data, student, null, now);
    expect(bece.done).toBe(3);
    expect(bece.items.map((i) => [i.attemptId, i.percent])).toEqual([
      ["bece-3", null],
      ["bece-2", 50],
      ["bece-1", 75],
    ]);
    expect(bece.average).toBe(63); // (75 + 50) / 2, the fully pending paper left out
    expect(bece.best).toBe(75);
    expect(bece.bySubject).toEqual([
      { subjectId: MATH, name: "Mathematics", done: 2, average: 50 },
      { subjectId: SOC, name: "Social Studies", done: 1, average: 75 },
    ]);
  });

  it("Quizzes: set, done, still open and missed", () => {
    const { quizzes } = buildReport(data, student, null, now);
    expect(quizzes).toMatchObject({ set: 3, done: 1, open: 1, missed: 1, missedTitles: ["Work q2"], average: 80 });
  });

  it("Assignments: the best attempt counts when several are allowed", () => {
    const { assignments } = buildReport(data, student, null, now);
    expect(assignments).toMatchObject({ set: 1, done: 1, average: 90 });
    expect(assignments.items.map((i) => i.attemptId)).toEqual(["asg-2"]);
  });

  it("a teacher's copy covers only the subjects they teach the student", () => {
    const r = buildReport(data, student, new Set([SOC]), now);
    expect(r.bece.items.map((i) => i.subjectName)).toEqual(["Social Studies"]);
    expect(r.quizzes.set).toBe(2);
    expect(r.assignments.set).toBe(0);
  });

  it("subjectsFor: a teacher's subjects for the student's class; admins see all", () => {
    const scope = new Map([
      [SOC, new Set([CLASS])],
      [MATH, new Set(["other-class"])],
    ]);
    expect([...subjectsFor(scope, CLASS, "teacher")!]).toEqual([SOC]);
    expect(subjectsFor(scope, "elsewhere", "teacher")!.size).toBe(0);
    expect(subjectsFor(scope, CLASS, "admin")).toBeNull();
  });
});
