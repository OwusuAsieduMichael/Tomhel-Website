import { beforeEach, describe, expect, it, vi } from "vitest";
import { approveAllOnPaper, importPaper } from "@/lib/prep/admin/question-bank";
import { answerMixed, groupKeyOf, mixedSummary, nextMixedBatch } from "@/lib/prep/practice/mixed";
import { seedDatabase } from "@/lib/prep/seed/seed";
import type { Store } from "@/lib/prep/store";
import { createRoutedTestStore } from "../helpers/store";

// The first test starts an in-memory Postgres, which can take a while on a busy machine.
vi.setConfig({ hookTimeout: 120_000, testTimeout: 120_000 });

const mcq = (code: string, n: string, text: string, options: string[], correct: number) => ({
  code,
  numberLabel: n,
  type: "mcq",
  text,
  marks: 1,
  options: options.map((t, i) => ({ label: "ABCD"[i], text: t, isCorrect: i === correct })),
});

let store: Store;
let studentId: string;

async function addPaper(year: number, paperNo: 1 | 2, questions: unknown[]) {
  const r = await importPaper(store, { subjectCode: "SOC", year, paperNo, questions });
  if (!r.ok) throw new Error(r.problems.join("; "));
  await approveAllOnPaper(store, r.paperId);
}

beforeEach(async () => {
  store = await createRoutedTestStore();
  await seedDatabase(store, { password: "seed-password-1" });
  const { users } = await store.read("users");
  studentId = users.find((u) => u.role === "student")!.id;
  await addPaper(2001, 1, [
    mcq("SOC-2001-P1-1", "1", "The capital of Ghana is", ["Kumasi", "Accra", "Tamale", "Ho"], 1),
    mcq("SOC-2001-P1-2", "2", "Which of these is a symbol of national unity?", ["Kente", "The national flag", "A car", "Fufu"], 1),
  ]);
  await addPaper(2005, 1, [
    // The same question again, options in another order: one question to master, not two.
    mcq("SOC-2005-P1-7", "7", "The capital of Ghana is:", ["Accra", "Ho", "Kumasi", "Tamale"], 0),
    mcq("SOC-2005-P1-8", "8", "Lake Volta is in", ["Togo", "Ghana", "Mali", "Benin"], 1),
  ]);
  await addPaper(2021, 2, [
    {
      code: "SOC-2021-P2-2c",
      numberLabel: "2(c)",
      type: "short",
      text: "State two symbols of national unity.",
      marks: 2,
      markingPoints: [1, 2].map(() => ({ description: "A symbol", marks: 1, strictness: "meaning", acceptedAlternatives: ["flag", "coat of arms", "anthem"] })),
      modelAnswer: "Any two of: the national flag, the coat of arms, the national anthem.",
    },
    {
      code: "SOC-2021-P2-4a1",
      numberLabel: "4(a)(i)",
      type: "short",
      text: "What is political stability?",
      marks: 4,
      markingPoints: [{ description: "As in the scheme", marks: 4, strictness: "rubric" }],
      modelAnswer: "Peace and order in a country over a long time.",
    },
  ]);
});

const socKeys = async () => {
  const b = await nextMixedBatch(store, studentId, "SOC", [], 100, () => 0.5);
  return b;
};

describe("mixed practice", () => {
  it("treats a question repeated in another year (any option order) as one", () => {
    const a = groupKeyOf({ text: "The capital of Ghana is", options: [{ text: "Kumasi" }, { text: "Accra" }] });
    const b = groupKeyOf({ text: "The capital of ghana is:", options: [{ text: "Accra" }, { text: "Kumasi" }] });
    const c = groupKeyOf({ text: "The capital of Togo is", options: [{ text: "Accra" }, { text: "Kumasi" }] });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it("mixes objectives and theory from every year, with repeats grouped and copies attached", async () => {
    const b = await socKeys();
    const capital = b.items.find((i) => i.copies.some((q) => q.text.startsWith("The capital")))!;
    expect(capital.copies.map((q) => q.source).sort()).toEqual(["BECE 2001 · Paper 1", "BECE 2005 · Paper 1"]);
    expect(b.items.some((i) => i.copies[0].type === "short")).toBe(true);
    // The rubric-only theory question is checked by the student; the other is marked by the rules.
    const selfCheck = b.items.flatMap((i) => i.copies).filter((q) => q.selfCheck).map((q) => q.text);
    expect(selfCheck).toContain("What is political stability?");
    expect(selfCheck).not.toContain("State two symbols of national unity.");
  });

  it("brings a wrong answer back first next time, until it is answered right; a right copy masters the repeat", async () => {
    const first = await socKeys();
    const capital = first.items.find((i) => i.copies.some((q) => q.text.startsWith("The capital")))!;
    const copy2001 = capital.copies.find((q) => q.source.includes("2001"))!;
    const copy2005 = capital.copies.find((q) => q.source.includes("2005"))!;

    const wrong = await answerMixed(store, studentId, copy2001.id, { choice: "A" });
    expect(wrong).toMatchObject({ correct: false, correctLabel: "B" });
    expect(wrong.stats).toMatchObject({ mastered: 0, toRedo: 1 });

    const next = await nextMixedBatch(store, studentId, "SOC", [], 3, () => 0.5);
    expect(next.items[0].groupKey).toBe(capital.groupKey);

    // Right on the other year's copy: the question (both years) is mastered.
    const right = await answerMixed(store, studentId, copy2005.id, { choice: "A" });
    expect(right.correct).toBe(true);
    expect(right.stats).toMatchObject({ mastered: 1, toRedo: 0 });
    const after = await nextMixedBatch(store, studentId, "SOC", [], 3, () => 0.5);
    expect(after.items.map((i) => i.groupKey)).not.toContain(capital.groupKey);
  });

  it("marks theory by its points, and lets the student check rubric-only answers", async () => {
    const b = await socKeys();
    const qs = b.items.flatMap((i) => i.copies);
    const symbols = qs.find((q) => q.text.startsWith("State two symbols"))!;
    const half = await answerMixed(store, studentId, symbols.id, { text: "The flag." });
    expect(half).toMatchObject({ correct: false, theory: { awarded: 1, outOf: 2 } });
    expect((await answerMixed(store, studentId, symbols.id, { text: "The flag and the national anthem." })).correct).toBe(true);

    const stability = qs.find((q) => q.text.startsWith("What is political"))!;
    expect(await answerMixed(store, studentId, stability.id, { selfCheck: "not" })).toMatchObject({ correct: false, modelAnswer: expect.stringContaining("Peace") });
    expect((await answerMixed(store, studentId, stability.id, { selfCheck: "got" })).correct).toBe(true);
  });

  it("summarises progress per subject for the report", async () => {
    const b = await socKeys();
    const lake = b.items.flatMap((i) => i.copies).find((q) => q.text.startsWith("Lake Volta"))!;
    await answerMixed(store, studentId, lake.id, { choice: "B" });
    const data = await store.read("practiceItems", "papers", "subjects", "questions", "mcqOptions", "markingPoints", "modelAnswers");
    const [soc] = mixedSummary(data, studentId, null);
    expect(soc).toMatchObject({ name: expect.stringContaining("Social"), mastered: 1, toRedo: 0 });
    expect(soc.total).toBe(b.stats.total);
    expect(mixedSummary(data, studentId, new Set())).toEqual([]);
  });
});
