import { beforeAll, describe, expect, it } from "vitest";
import { importPaper } from "@/lib/prep/admin/question-bank";
import {
  AssignmentError,
  assignmentInputSchema,
  deleteAssignment,
  getAssignmentFormOptions,
  getAssignmentTracker,
  listAssignments,
  listStudentAssignments,
  parseSchoolDateTime,
  releaseSolutions,
  saveAssignment,
  startAssignmentAttempt,
  type AssignmentInput,
} from "@/lib/prep/assignments";
import { AttemptError, listStudentAttempts, loadAttemptResults, startAttempt, submitAttempt } from "@/lib/prep/practice/attempts";
import { listReviewQueue, returnMark, ReviewError } from "@/lib/prep/review";
import { update, type Store, type User } from "@/lib/prep/store";
import { seedDatabase } from "@/lib/prep/seed/seed";
import { createTestStore } from "../helpers/store";

let store: Store;
let users: Map<string, User>;
let ids: { math: string; sci: string; fre: string; class3A: string; class3B: string; mathPaper: string; frePaper: string; sciPaper: string };

const u = (loginId: string) => users.get(loginId)!;
const actor = (loginId: string) => ({ id: u(loginId).id, role: u(loginId).role });
const student = (loginId: string) => ({ id: u(loginId).id, classId: u(loginId).classId });

const t0 = new Date("2026-11-10T08:00:00Z");
const at = (minutes: number) => new Date(t0.getTime() + minutes * 60_000);

const input = (over: Partial<AssignmentInput> = {}): AssignmentInput => ({
  subjectId: ids.math,
  paperId: ids.mathPaper,
  title: "Number practice",
  classIds: [ids.class3A],
  timeLimitMinutes: 30,
  opensAt: t0,
  closesAt: at(60 * 24),
  attemptPolicy: "single",
  solutions: "after_close",
  status: "published",
  ...over,
});

beforeAll(async () => {
  store = await createTestStore();
  await seedDatabase(store, { password: "password-123" });
  const fre = await importPaper(store, {
    subjectCode: "FRE",
    year: 2022,
    paperNo: 2,
    questions: [
      {
        code: "FRE-2022-P2-1",
        numberLabel: "1",
        type: "essay",
        text: "Écris une lettre à ton ami.",
        marks: 10,
        markingPoints: [
          { description: "Content", marks: 4, strictness: "rubric" },
          { description: "Organisation", marks: 2, strictness: "rubric" },
          { description: "Expression", marks: 3, strictness: "rubric" },
          { description: "Mechanics", marks: 1, strictness: "rubric" },
        ],
      },
    ],
  });
  const data = await store.read("users", "subjects", "classes", "papers", "questions");
  await store.write(data.questions.filter((q) => q.status === "draft").map((q) => update("questions", q.id, { status: "approved" })));
  users = new Map(data.users.map((x) => [x.loginId, x]));
  const subject = (code: string) => data.subjects.find((s) => s.code === code)!.id;
  ids = {
    math: subject("MATH"),
    sci: subject("SCI"),
    fre: subject("FRE"),
    class3A: data.classes.find((c) => c.name === "JHS 3A")!.id,
    class3B: data.classes.find((c) => c.name === "JHS 3B")!.id,
    mathPaper: data.papers.find((p) => p.subjectId === subject("MATH"))!.id,
    sciPaper: data.papers.find((p) => p.subjectId === subject("SCI"))!.id,
    frePaper: fre.ok ? fre.paperId : "",
  };
});

describe("the assignment form", () => {
  it("offers only the teacher's subjects and classes", async () => {
    const t2 = await getAssignmentFormOptions(store, actor("T002"));
    expect(t2.map((s) => s.name)).toEqual(["Mathematics", "Integrated Science"]);
    expect(t2[0].classes.map((c) => c.name)).toEqual(["JHS 3A", "JHS 3B"]);
    expect(t2[1].classes.map((c) => c.name)).toEqual(["JHS 3B"]);
    expect(t2[0].papers).toEqual([expect.objectContaining({ year: 2023, paperNo: 1, questions: 5, mcq: true })]);
    expect(t2[0].classes[0].students).toBe(5);
  });

  it("reads dates as school time and rejects a close before the open", () => {
    expect(parseSchoolDateTime("2026-11-10T08:00")?.toISOString()).toBe("2026-11-10T08:00:00.000Z");
    expect(parseSchoolDateTime("10/11/2026")).toBeNull();
    const bad = assignmentInputSchema.safeParse({
      ...input(),
      opensAt: "2026-11-12T08:00",
      closesAt: "2026-11-10T08:00",
    });
    expect(bad.success).toBe(false);
    expect(bad.error?.issues[0].message).toMatch(/after the open/);
  });
});

describe("setting work", () => {
  it("refuses subjects and classes the teacher doesn't take", async () => {
    await expect(saveAssignment(store, actor("T003"), input(), undefined, t0)).rejects.toThrow(AssignmentError);
    // T002 takes Science for 3B only.
    await expect(saveAssignment(store, actor("T002"), input({ subjectId: ids.sci, paperId: ids.sciPaper, classIds: [ids.class3A] }), undefined, t0)).rejects.toThrow(
      /your own subjects and classes/,
    );
    // A paper from another subject.
    await expect(saveAssignment(store, actor("T002"), input({ paperId: ids.sciPaper }), undefined, t0)).rejects.toThrow(/no approved questions/);
    await expect(saveAssignment(store, { id: u("S0001").id, role: "student" }, input(), undefined, t0)).rejects.toThrow(AssignmentError);
  });

  it("keeps drafts from students and shows published work to the right classes", async () => {
    const draft = await saveAssignment(store, actor("T002"), input({ title: "Draft work", status: "draft" }), undefined, t0);
    const live = await saveAssignment(store, actor("T002"), input({ title: "Live work" }), undefined, t0);
    const seen = await listStudentAssignments(store, student("S0001"), at(1));
    expect(seen.map((a) => a.title)).toContain("Live work");
    expect(seen.map((a) => a.title)).not.toContain("Draft work");
    expect((await listStudentAssignments(store, student("S0006"), at(1))).map((a) => a.title)).not.toContain("Live work");
    // Another teacher can't see it.
    expect((await listAssignments(store, actor("T003"))).map((a) => a.id)).not.toContain(live);
    expect((await listAssignments(store, actor("T002"), at(1))).find((a) => a.id === live)).toMatchObject({ state: "open", students: 5, submitted: 0 });
    await deleteAssignment(store, actor("T002"), draft);
    await deleteAssignment(store, actor("T002"), live);
  });
});

describe("students doing assigned work", () => {
  let id: string;

  beforeAll(async () => {
    id = await saveAssignment(store, actor("T002"), input({ title: "Timed quiz", opensAt: at(10), closesAt: at(100) }), undefined, t0);
  });

  it("can't start before it opens, and isn't set for other classes", async () => {
    await expect(startAssignmentAttempt(store, student("S0001"), id, at(5))).rejects.toThrow(/hasn't opened/);
    await expect(startAssignmentAttempt(store, student("S0006"), id, at(20))).rejects.toThrow(/isn't set for you/);
  });

  it("keeps assigned attempts apart from self-practice on the same paper", async () => {
    const practice = await startAttempt(store, u("S0002").id, { paperId: ids.mathPaper, mode: "full", timeLimitMinutes: null }, at(15));
    const assigned = await startAssignmentAttempt(store, student("S0002"), id, at(20));
    expect(assigned.id).not.toBe(practice.id);
    expect(assigned.resumed).toBe(false);
    expect((await startAssignmentAttempt(store, student("S0002"), id, at(21))).id).toBe(assigned.id);
    const again = await startAttempt(store, u("S0002").id, { paperId: ids.mathPaper, mode: "full", timeLimitMinutes: null }, at(22));
    expect(again.id).toBe(practice.id);
  });

  it("ends an attempt at the close date when that comes before the time limit", async () => {
    const { id: attemptId } = await startAssignmentAttempt(store, student("S0003"), id, at(90));
    const { attempts } = await store.read("attempts");
    expect(attempts.find((a) => a.id === attemptId)!.deadlineAt).toEqual(at(100));
  });

  it("allows one attempt, hides solutions until the close, and tracks everyone", async () => {
    const { users: all, questions } = await store.read("users", "questions");
    const mcq = questions.filter((q) => q.paperId === ids.mathPaper);
    const { mcqOptions } = await store.read("mcqOptions");
    const answers = Object.fromEntries(mcq.map((q) => [q.id, { choice: mcqOptions.find((o) => o.questionId === q.id && o.isCorrect)!.label }]));

    const { id: attemptId } = await startAssignmentAttempt(store, student("S0001"), id, at(20));
    await submitAttempt(store, u("S0001").id, attemptId, answers, at(30));
    await expect(startAssignmentAttempt(store, student("S0001"), id, at(31))).rejects.toThrow(/already done/);

    const before = await loadAttemptResults(store, u("S0001").id, attemptId, at(40));
    expect(before!.solutionsHidden).toEqual({ until: at(100) });
    expect(before!.questions).toEqual([]);
    expect(before!.attempt.score).toBe(5);
    const after = await loadAttemptResults(store, u("S0001").id, attemptId, at(101));
    expect(after!.solutionsHidden).toBeNull();
    expect(after!.questions).toHaveLength(5);

    const mine = await listStudentAssignments(store, student("S0001"), at(40));
    expect(mine.find((a) => a.id === id)).toMatchObject({ status: "submitted", score: 5, canStart: false, resultAttemptId: attemptId });
    expect((await listStudentAttempts(store, u("S0001").id))[0].title).toBe("Mathematics · Timed quiz");

    // After the close: S0002 and S0003 are auto-submitted, S0004 and S0005 never started.
    const tracker = await getAssignmentTracker(store, actor("T002"), id, at(200));
    expect(tracker.state).toBe("closed");
    expect(tracker.summary).toMatchObject({ total: 5, submitted: 3, inProgress: 0, notStarted: 2, autoSubmitted: 2 });
    expect(tracker.classes).toEqual([expect.objectContaining({ name: "JHS 3A", total: 5, submitted: 3, notStarted: 2 })]);
    expect(tracker.rows.find((r) => r.studentId === u("S0001").id)).toMatchObject({ status: "submitted", score: 5, minutes: 10 });
    expect(all.length).toBeGreaterThan(5);
    await expect(getAssignmentTracker(store, actor("T003"), id)).rejects.toThrow(AssignmentError);
  });

  it("can't be deleted or have its paper swapped once started", async () => {
    await expect(deleteAssignment(store, actor("T002"), id)).rejects.toThrow(/already started/);
    await expect(saveAssignment(store, actor("T002"), input({ paperId: ids.mathPaper, status: "draft" }), id, at(30))).rejects.toThrow(/back to draft/);
  });
});

describe("several attempts and released solutions", () => {
  it("lets students retry while open and counts the best score", async () => {
    const id = await saveAssignment(
      store,
      actor("T002"),
      input({ title: "Retry quiz", attemptPolicy: "best", solutions: "on_release", timeLimitMinutes: null }),
      undefined,
      t0,
    );
    const { questions, mcqOptions } = await store.read("questions", "mcqOptions");
    const mcq = questions.filter((q) => q.paperId === ids.mathPaper);
    const right = Object.fromEntries(mcq.map((q) => [q.id, { choice: mcqOptions.find((o) => o.questionId === q.id && o.isCorrect)!.label }]));

    const first = await startAssignmentAttempt(store, student("S0004"), id, at(1));
    await submitAttempt(store, u("S0004").id, first.id, {}, at(2));
    const second = await startAssignmentAttempt(store, student("S0004"), id, at(3));
    expect(second.id).not.toBe(first.id);
    await submitAttempt(store, u("S0004").id, second.id, right, at(4));

    const row = (await getAssignmentTracker(store, actor("T002"), id, at(5))).rows.find((r) => r.studentId === u("S0004").id);
    expect(row).toMatchObject({ status: "submitted", score: 5, attemptCount: 2 });

    expect((await loadAttemptResults(store, u("S0004").id, second.id, at(60 * 48)))!.solutionsHidden).toEqual({ until: null });
    await releaseSolutions(store, actor("T002"), id, at(10));
    expect((await loadAttemptResults(store, u("S0004").id, second.id, at(11)))!.solutionsHidden).toBeNull();
  });
});

describe("the review queue", () => {
  it("sends French theory to the French teacher, who marks it with the rubric", async () => {
    const id = await saveAssignment(
      store,
      actor("T001"),
      input({ subjectId: ids.fre, paperId: ids.frePaper, title: "Letter of invitation", classIds: [ids.class3A, ids.class3B], solutions: "after_submit" }),
      undefined,
      t0,
    );
    const { questions } = await store.read("questions");
    const q = questions.find((x) => x.paperId === ids.frePaper)!;
    const text = "Cher Kofi,\nJe t'invite a ma fête.";
    const { id: attemptId } = await startAssignmentAttempt(store, student("S0006"), id, at(1));
    await submitAttempt(store, u("S0006").id, attemptId, { [q.id]: { text } }, at(20));

    const queue = await listReviewQueue(store, actor("T001"));
    expect(queue).toEqual([
      expect.objectContaining({ attemptId, questionId: q.id, studentName: "Yaw Frimpong", className: "JHS 3B", source: "Letter of invitation", marks: 10, answer: text }),
    ]);
    expect(queue[0].markingPoints.map((p) => p.marks)).toEqual([4, 2, 3, 1]);
    expect(await listReviewQueue(store, actor("T002"))).toEqual([]);

    const mark = { attemptId, questionId: q.id, total: null, note: "Watch your accents.", highlights: [{ start: 22, end: 23, kind: "misspelt" as const }] };
    await expect(returnMark(store, actor("T002"), { ...mark, points: [4, 2, 2, 0] })).rejects.toThrow(ReviewError);
    await expect(returnMark(store, actor("T001"), { ...mark, points: [5, 2, 2, 0] })).rejects.toThrow(/out of 4/);
    await expect(returnMark(store, actor("T001"), { ...mark, points: [4, 2] })).rejects.toThrow(/every part/);
    await returnMark(store, actor("T001"), { ...mark, points: [4, 2, 2, 0] }, at(30));

    expect(await listReviewQueue(store, actor("T001"))).toEqual([]);
    await expect(returnMark(store, actor("T001"), { ...mark, points: [4, 2, 2, 0] })).rejects.toThrow(/already been marked/);

    const results = await loadAttemptResults(store, u("S0006").id, attemptId, at(31));
    expect(results!.attempt).toMatchObject({ score: 8, maxScore: 10, pendingMarks: 0 });
    expect(results!.questions[0].result).toMatchObject({
      status: "returned",
      awarded: 8,
      teacher: { note: "Watch your accents.", highlights: [{ start: 22, end: 23, kind: "misspelt" }] },
    });
  });
});

describe("closed work", () => {
  it("can't be started after the close", async () => {
    const id = await saveAssignment(store, actor("T002"), input({ title: "Old", closesAt: at(5) }), undefined, t0);
    await expect(startAssignmentAttempt(store, student("S0005"), id, at(10))).rejects.toThrow(AttemptError);
  });
});
