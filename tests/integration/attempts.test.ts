import { beforeAll, describe, expect, it } from "vitest";
import { importPaper } from "@/lib/prep/admin/question-bank";
import {
  AttemptError,
  getSubjectPapers,
  listStudentAttempts,
  loadAttemptForRunner,
  loadAttemptResults,
  saveAnswers,
  startAttempt,
  submitAttempt,
} from "@/lib/prep/practice/attempts";
import { update, type Store } from "@/lib/prep/store";
import { seedDatabase } from "@/lib/prep/seed/seed";
import { createTestStore } from "../helpers/store";

let store: Store;
let s1: string;
let s2: string;
let mathPaper: string;
let sciPaper: string;
let frePaper: string;

const ids = async (code: string) => (await store.read("questions")).questions.filter((q) => q.code.startsWith(code));

beforeAll(async () => {
  store = await createTestStore();
  await seedDatabase(store, { password: "password-123" });
  const { users, papers } = await store.read("users", "papers");
  s1 = users.find((u) => u.loginId === "S0001")!.id;
  s2 = users.find((u) => u.loginId === "S0002")!.id;
  mathPaper = papers.find((p) => p.paperNo === 1)!.id;
  sciPaper = papers.find((p) => p.paperNo === 2)!.id;

  const fre = await importPaper(store, {
    subjectCode: "FRE",
    year: 2022,
    paperNo: 2,
    questions: [{ code: "FRE-2022-P2-1", numberLabel: "1", type: "essay", text: "Écris une lettre.", marks: 10, markingPoints: [{ description: "Content", marks: 10, strictness: "rubric" }] }],
  });
  frePaper = fre.ok ? fre.paperId : "";
  const { questions } = await store.read("questions");
  await store.write(questions.filter((q) => q.status === "draft").map((q) => update("questions", q.id, { status: "approved" })));
});

describe("choosing a paper", () => {
  it("lists only papers with approved questions", async () => {
    const r = await getSubjectPapers(store, "math");
    expect(r!.papers).toEqual([expect.objectContaining({ year: 2023, paperNo: 1, questions: 5, marks: 5 })]);
    expect((await getSubjectPapers(store, "ENG"))!.papers).toEqual([]);
    expect(await getSubjectPapers(store, "NOPE")).toBeNull();
  });
});

describe("an objective paper", () => {
  it("marks a full paper at the end and hides the key while it runs", async () => {
    const { id } = await startAttempt(store, s1, { paperId: mathPaper, mode: "full", timeLimitMinutes: 30 });
    const runner = await loadAttemptForRunner(store, s1, id);
    expect(runner.questions).toHaveLength(5);
    expect(runner.questions[0]).not.toHaveProperty("key");
    expect(JSON.stringify(runner)).not.toContain("isCorrect");

    const [q1, q2] = await ids("MATH-2023-P1-");
    await saveAnswers(store, s1, id, { [q1.id]: { choice: "B" }, [q2.id]: { choice: "A", flagged: true } });
    // Resuming returns the same attempt with the saved answers.
    expect(await startAttempt(store, s1, { paperId: mathPaper, mode: "full", timeLimitMinutes: 30 })).toEqual({ id, resumed: true });
    expect((await loadAttemptForRunner(store, s1, id)).attempt.answers[q2.id]).toEqual({ choice: "A", flagged: true });

    const done = await submitAttempt(store, s1, id, undefined);
    expect(done).toMatchObject({ status: "submitted", score: 1, maxScore: 5, autoSubmitted: false });
    const results = (await loadAttemptResults(store, s1, id))!;
    expect(results.questions[0].result).toMatchObject({ kind: "mcq", choice: "B", correct: "B", awarded: 1 });
    expect(results.questions[1].result).toMatchObject({ choice: "A", correct: "C", awarded: 0 });
  });

  it("practice mode sends the key, and an answer can't be changed after seeing it", async () => {
    const { id } = await startAttempt(store, s2, { paperId: mathPaper, mode: "practice", timeLimitMinutes: null });
    const runner = await loadAttemptForRunner(store, s2, id);
    expect(runner.questions[0].key).toEqual({ correct: "B", explanation: null });
    const [q1] = await ids("MATH-2023-P1-1");
    await saveAnswers(store, s2, id, { [q1.id]: { choice: "A" } });
    await saveAnswers(store, s2, id, { [q1.id]: { choice: "B" } });
    expect((await loadAttemptForRunner(store, s2, id)).attempt.answers[q1.id].choice).toBe("A");
  });

  it("submits automatically once the time is up, with the last saved answers", async () => {
    const start = new Date("2026-11-05T09:00:00Z");
    const { id } = await startAttempt(store, s1, { paperId: mathPaper, mode: "full", timeLimitMinutes: 20 }, start);
    const [q1] = await ids("MATH-2023-P1-1");
    await saveAnswers(store, s1, id, { [q1.id]: { choice: "B" } }, new Date(start.getTime() + 60_000));

    const late = new Date(start.getTime() + 25 * 60_000);
    expect(await saveAnswers(store, s1, id, {}, late)).toEqual({ status: "submitted" });
    const results = (await loadAttemptResults(store, s1, id))!;
    expect(results.attempt).toMatchObject({ autoSubmitted: true, score: 1, submittedAt: new Date(start.getTime() + 20 * 60_000) });
  });

  it("keeps attempts private to their student and refuses odd input", async () => {
    const { id } = await startAttempt(store, s1, { paperId: mathPaper, mode: "full", timeLimitMinutes: null });
    await expect(loadAttemptForRunner(store, s2, id)).rejects.toBeInstanceOf(AttemptError);
    await expect(saveAnswers(store, s1, id, { "not-a-question": {} })).rejects.toBeInstanceOf(AttemptError);
    await expect(startAttempt(store, s1, { paperId: mathPaper, mode: "full", timeLimitMinutes: 1 })).rejects.toThrow("time limit");
    expect(await loadAttemptResults(store, s1, id)).toBeNull(); // not submitted yet
  });
});

describe("a theory paper", () => {
  it("is always full mode and is marked point by point", async () => {
    const { id } = await startAttempt(store, s2, { paperId: sciPaper, mode: "practice", timeLimitMinutes: null });
    expect((await loadAttemptForRunner(store, s2, id)).attempt.mode).toBe("full");
    const [a, b] = await ids("SCI-2023-P2-");
    const done = await submitAttempt(store, s2, id, {
      [a.id]: { text: "The root absorbs water and mineral salts from the soil. It also holds the plant in the ground." },
      [b.id]: { text: "Green plants make food using sunlight. The green colour called chlorophyl traps the light and the plant releases oxygen." },
    });
    expect(done).toMatchObject({ score: 4, maxScore: 6, pendingMarks: 0 });
    const r = (await loadAttemptResults(store, s2, id))!;
    const second = r.questions[1].result;
    expect(second?.kind === "theory" && second.status === "marked" && second.theory.points.map((p) => p.status)).toEqual([
      "awarded",
      "misspelt",
      "missing",
      "awarded",
    ]);
  });

  it("sends French theory to the teacher instead of marking it", async () => {
    const { id } = await startAttempt(store, s1, { paperId: frePaper, mode: "full", timeLimitMinutes: null });
    const done = await submitAttempt(store, s1, id, {});
    expect(done).toMatchObject({ score: 0, maxScore: 10, pendingMarks: 10 });
    const list = await listStudentAttempts(store, s1);
    expect(list[0]).toMatchObject({ title: "French 2022 · Paper 2", pendingMarks: 10 });
  });
});

describe("submitting is quick", () => {
  it("saves the final answers and marks them in one read and one write", async () => {
    const { id } = await startAttempt(store, s2, { paperId: mathPaper, mode: "full", timeLimitMinutes: null });
    const qs = await ids("MATH-");
    const counts = { read: 0, write: 0 };
    const backend = store.backend;
    const read = backend.read.bind(backend);
    const write = backend.write.bind(backend);
    backend.read = async (s) => (counts.read++, read(s));
    backend.write = async (o) => (counts.write++, write(o));
    try {
      const done = await submitAttempt(store, s2, id, { [qs[0].id]: { choice: "A" } });
      expect(counts).toEqual({ read: 1, write: 1 });
      expect(done.status).toBe("submitted");
      expect((done.answers as Record<string, { choice?: string }>)[qs[0].id]).toEqual({ choice: "A" });
    } finally {
      backend.read = read;
      backend.write = write;
    }
    const saved = (await store.read("attempts")).attempts.find((a) => a.id === id)!;
    expect(saved.answers).toEqual({ [qs[0].id]: { choice: "A" } });
  });
});
