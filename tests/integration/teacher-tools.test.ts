import { beforeAll, describe, expect, it } from "vitest";
import { importPaper } from "@/lib/prep/admin/question-bank";
import { AssignmentError, getAssignmentFormOptions, getAssignmentTracker, saveAssignment, sendReminder, startAssignmentAttempt, type AssignmentInput } from "@/lib/prep/assignments";
import { listNotices, markNoticesRead, unreadNoticeCount } from "@/lib/prep/notices";
import { loadAttemptForRunner, loadAttemptResults, submitAttempt } from "@/lib/prep/practice/attempts";
import { answerQuery, changeMark, getAttemptForTeacher, listReviewQueue, raiseQuery, returnMark, ReviewError } from "@/lib/prep/review";
import { update, type Store, type User } from "@/lib/prep/store";
import { seedDatabase } from "@/lib/prep/seed/seed";
import { createTestStore } from "../helpers/store";

let store: Store;
let users: Map<string, User>;
let sci: string;
let fre: string;
let classes: string[];

const u = (id: string) => users.get(id)!;
const actor = (id: string) => ({ id: u(id).id, role: u(id).role });
const student = (id: string) => ({ id: u(id).id, classId: u(id).classId });
const t0 = new Date("2026-11-10T08:00:00Z");
const at = (m: number) => new Date(t0.getTime() + m * 60_000);

const base = (over: Partial<AssignmentInput>): AssignmentInput => ({
  subjectId: sci,
  title: "Quiz",
  classIds: classes,
  timeLimitMinutes: 20,
  opensAt: t0,
  closesAt: at(600),
  attemptPolicy: "single",
  solutions: "after_submit",
  status: "published",
  ...over,
});

const mcq = (code: string, topic: string, n: number) => ({
  code,
  numberLabel: String(n),
  type: "mcq" as const,
  text: `Question ${code}`,
  marks: 1,
  topic: { strand: topic },
  options: [
    { label: "A", text: "Right", isCorrect: true },
    { label: "B", text: "Wrong" },
  ],
});

beforeAll(async () => {
  store = await createTestStore();
  await seedDatabase(store, { password: "password-123" });
  const r = await importPaper(store, {
    subjectCode: "SCI",
    year: 2024,
    paperNo: 1,
    questions: [mcq("SCI-2024-P1-1", "Plants", 1), mcq("SCI-2024-P1-2", "Plants", 2), mcq("SCI-2024-P1-3", "Plants", 3), mcq("SCI-2024-P1-4", "Energy", 4)],
  });
  if (!r.ok) throw new Error(r.problems.join(" "));
  const f = await importPaper(store, {
    subjectCode: "FRE",
    year: 2023,
    paperNo: 2,
    questions: [{ code: "FRE-2023-P2-1", numberLabel: "1", type: "essay", text: "Écris une lettre.", marks: 10, markingPoints: [{ description: "Content", marks: 10, strictness: "rubric" }] }],
  });
  if (!f.ok) throw new Error(f.problems.join(" "));
  const data = await store.read("users", "subjects", "classes", "questions");
  await store.write(data.questions.filter((q) => q.status === "draft").map((q) => update("questions", q.id, { status: "approved" })));
  users = new Map(data.users.map((x) => [x.loginId, x]));
  sci = data.subjects.find((s) => s.code === "SCI")!.id;
  fre = data.subjects.find((s) => s.code === "FRE")!.id;
  // T003 takes Science for 3A only.
  classes = [data.classes.find((c) => c.name === "JHS 3A")!.id];
});

describe("topic quizzes and bank picks", () => {
  it("offers topics and bank questions on the form", async () => {
    const sciOptions = (await getAssignmentFormOptions(store, actor("T003"))).find((s) => s.id === sci)!;
    expect(sciOptions.topics.map((t) => [t.name, t.objective])).toEqual([
      ["Energy", 1],
      ["Plants", 3],
    ]);
    expect(sciOptions.bank.filter((q) => q.kind === "objective").map((q) => q.source)).toEqual(expect.arrayContaining(["2024 P1 Q1", "2024 P1 Q4"]));
  });

  it("draws a fixed set from the chosen topics, and keeps it when only the title changes", async () => {
    const { topics } = await store.read("topics");
    const plants = topics.find((t) => t.strand === "Plants")!.id;
    const id = await saveAssignment(store, actor("T003"), base({ source: "topic", kind: "objective", topicIds: [plants], questionLimit: 2 }), undefined, t0);
    const first = (await store.read("assignments")).assignments.find((a) => a.id === id)!;
    expect(first.questionIds).toHaveLength(2);
    await saveAssignment(store, actor("T003"), base({ title: "Renamed", source: "topic", kind: "objective", topicIds: [plants], questionLimit: 2 }), id, t0);
    expect((await store.read("assignments")).assignments.find((a) => a.id === id)!.questionIds).toEqual(first.questionIds);

    const tracker = await getAssignmentTracker(store, actor("T003"), id, at(1));
    expect(tracker.description).toBe("2 objective questions on Plants");

    const { id: attemptId } = await startAssignmentAttempt(store, student("S0001"), id, at(1));
    const runner = await loadAttemptForRunner(store, u("S0001").id, attemptId, at(2));
    expect(runner.questions.map((q) => q.id)).toEqual(first.questionIds);
    expect(runner.questions.map((q) => q.numberLabel)).toEqual(["1", "2"]);
    expect(runner.paper.title).toBe("Integrated Science · Renamed");

    const answers = Object.fromEntries(first.questionIds.map((qid) => [qid, { choice: "A" }]));
    await submitAttempt(store, u("S0001").id, attemptId, answers, at(3));
    const results = await loadAttemptResults(store, u("S0001").id, attemptId, at(4));
    expect(results!.attempt).toMatchObject({ score: 2, maxScore: 2 });
  });

  it("uses the teacher's own pick, in order, and rejects the wrong kind", async () => {
    const { questions } = await store.read("questions");
    const sciQs = questions.filter((q) => q.code.startsWith("SCI-2024"));
    const ids = [sciQs[3].id, sciQs[0].id];
    const id = await saveAssignment(store, actor("T003"), base({ source: "bank", kind: "objective", questionIds: ids }), undefined, t0);
    expect((await store.read("assignments")).assignments.find((a) => a.id === id)!.questionIds).toEqual(ids);
    await expect(saveAssignment(store, actor("T003"), base({ source: "bank", kind: "theory", questionIds: ids }), undefined, t0)).rejects.toThrow(/only written/);
    await expect(saveAssignment(store, actor("T003"), base({ source: "topic", kind: "objective", topicIds: [] }), undefined, t0)).rejects.toThrow(AssignmentError);
  });
});

describe("notices and reminders", () => {
  it("tells students about new work and lets the teacher remind those who haven't finished", async () => {
    const before = await unreadNoticeCount(store, u("S0003").id);
    const id = await saveAssignment(store, actor("T003"), base({ source: "paper", paperId: (await store.read("papers")).papers.find((p) => p.subjectId === sci && p.year === 2024)!.id, title: "Paper practice" }), undefined, t0);
    expect(await unreadNoticeCount(store, u("S0003").id)).toBe(before + 1);
    expect((await listNotices(store, u("S0003").id)).find((n) => n.title.endsWith("Paper practice"))).toMatchObject({ title: "New work: Integrated Science · Paper practice", href: "/prep/student/academic/exams" });
    // Students in another class hear nothing.
    expect((await listNotices(store, u("S0006").id)).some((n) => n.title.includes("Paper practice"))).toBe(false);

    const { id: attemptId } = await startAssignmentAttempt(store, student("S0001"), id, at(1));
    await submitAttempt(store, u("S0001").id, attemptId, {}, at(2));
    expect(await sendReminder(store, actor("T003"), id, at(10))).toBe(4);
    await expect(sendReminder(store, actor("T003"), id, at(20))).rejects.toThrow(/an hour/);
    expect((await listNotices(store, u("S0002").id))[0].title).toBe("Reminder: Integrated Science · Paper practice");
    expect((await listNotices(store, u("S0001").id)).some((n) => n.title.startsWith("Reminder"))).toBe(false);

    await markNoticesRead(store, u("S0002").id);
    expect(await unreadNoticeCount(store, u("S0002").id)).toBe(0);
  });
});

describe("mark queries and changing marks", () => {
  let attemptId: string;
  let questionId: string;

  beforeAll(async () => {
    const { papers, questions } = await store.read("papers", "questions");
    const paper = papers.find((p) => p.subjectId === fre)!;
    questionId = questions.find((q) => q.paperId === paper.id)!.id;
    const id = await saveAssignment(store, actor("T001"), base({ subjectId: fre, source: "paper", paperId: paper.id, title: "Lettre", timeLimitMinutes: null }), undefined, t0);
    ({ id: attemptId } = await startAssignmentAttempt(store, student("S0002"), id, at(1)));
    await submitAttempt(store, u("S0002").id, attemptId, { [questionId]: { text: "Cher ami, viens à ma fête." } }, at(5));
  });

  it("tells the student once everything is marked", async () => {
    await expect(raiseQuery(store, { id: u("S0002").id }, { attemptId, questionId, message: "Please check my mark" })).rejects.toThrow(/hasn't marked/);
    await returnMark(store, actor("T001"), { attemptId, questionId, points: [5], total: null, highlights: [], note: "" }, at(15));
    expect((await listNotices(store, u("S0002").id))[0]).toMatchObject({ title: "Marked: French · Lettre", href: `/prep/practice/${attemptId}/results` });
  });

  it("puts a student's query in the teacher's queue, and the reply changes the mark", async () => {
    await raiseQuery(store, { id: u("S0002").id }, { attemptId, questionId, message: "I used the right greeting and closing." }, at(20));
    await expect(raiseQuery(store, { id: u("S0002").id }, { attemptId, questionId, message: "Again please" })).rejects.toThrow(/already asked/);
    await expect(raiseQuery(store, { id: u("S0001").id }, { attemptId, questionId, message: "Not my attempt" })).rejects.toThrow(ReviewError);

    const queue = await listReviewQueue(store, actor("T001"));
    const item = queue.find((i) => i.kind === "query")!;
    expect(item).toMatchObject({ attemptId, questionId, awarded: 5, marks: 10, message: "I used the right greeting and closing." });
    expect(await listReviewQueue(store, actor("T003"))).toEqual([]);

    await expect(answerQuery(store, actor("T003"), { queryId: item.queryId!, reply: "No", awarded: null })).rejects.toThrow(ReviewError);
    await answerQuery(store, actor("T001"), { queryId: item.queryId!, reply: "You're right, well done.", awarded: 7 }, at(30));
    expect(await listReviewQueue(store, actor("T001"))).toEqual([]);

    const results = await loadAttemptResults(store, u("S0002").id, attemptId, at(31));
    expect(results!.attempt.score).toBe(7);
    expect(results!.questions[0].query).toMatchObject({ status: "answered", reply: "You're right, well done." });
    expect((await listNotices(store, u("S0002").id))[0]).toMatchObject({ title: "Mark changed: French · Lettre", body: "You're right, well done." });
    await expect(answerQuery(store, actor("T001"), { queryId: item.queryId!, reply: "again", awarded: null })).rejects.toThrow(/already been answered/);
  });

  it("lets the teacher change any mark from the attempt view", async () => {
    const view = await getAttemptForTeacher(store, actor("T001"), attemptId);
    expect(view!.student.name).toBe("Kofi Adjei");
    expect(view!.questions[0].queries).toHaveLength(1);
    expect(await getAttemptForTeacher(store, actor("T002"), attemptId)).toBeNull();

    await expect(changeMark(store, actor("T001"), { attemptId, questionId, awarded: 11, note: "" })).rejects.toThrow(/out of 10/);
    await changeMark(store, actor("T001"), { attemptId, questionId, awarded: 6.5, note: "Second look." }, at(40));
    const r = (await loadAttemptResults(store, u("S0002").id, attemptId, at(41)))!;
    expect(r.attempt.score).toBe(6.5);
    expect(r.questions[0].result).toMatchObject({ status: "returned", awarded: 6.5, teacher: { note: "Second look." } });
  });

  it("changes an objective mark too, keeping the student's choice", async () => {
    const { attempts } = await store.read("attempts");
    const sciAttempt = attempts.find((t) => t.studentId === u("S0001").id && t.questionIds.length === 2)!;
    const qid = sciAttempt.questionIds[0];
    await changeMark(store, actor("T003"), { attemptId: sciAttempt.id, questionId: qid, awarded: 0, note: "Key was wrong." }, at(50));
    const r = (await loadAttemptResults(store, u("S0001").id, sciAttempt.id, at(51)))!;
    expect(r.attempt.score).toBe(1);
    expect(r.questions.find((q) => q.id === qid)!.result).toMatchObject({ kind: "mcq", choice: "A", awarded: 0, changed: { note: "Key was wrong." } });
  });
});

describe("instant marking on set work", () => {
  it("runs objective work in practice mode, with the key on the page and solutions shown", async () => {
    const { questions } = await store.read("questions");
    const ids = questions.filter((q) => q.code.startsWith("SCI-2024")).map((q) => q.id);
    const id = await saveAssignment(store, actor("T003"), base({ title: "Instant quiz", source: "bank", kind: "objective", questionIds: ids, solutions: "instant" }), undefined, t0);
    const { id: attemptId } = await startAssignmentAttempt(store, student("S0004"), id, at(1));
    const runner = await loadAttemptForRunner(store, u("S0004").id, attemptId, at(2));
    expect(runner.attempt.mode).toBe("practice");
    expect(runner.questions[0].key).toEqual({ correct: "A", explanation: null });
    await submitAttempt(store, u("S0004").id, attemptId, {}, at(3));
    expect((await loadAttemptResults(store, u("S0004").id, attemptId, at(4)))!.solutionsHidden).toBeNull();
  });

  it("isn't offered for written work", async () => {
    const { papers } = await store.read("papers");
    const frePaper = papers.find((p) => p.subjectId === fre)!.id;
    await expect(saveAssignment(store, actor("T001"), base({ subjectId: fre, source: "paper", paperId: frePaper, solutions: "instant" }), undefined, t0)).rejects.toThrow(/objective questions only/);
  });
});
