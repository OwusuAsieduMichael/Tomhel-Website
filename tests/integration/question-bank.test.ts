import { beforeAll, describe, expect, it } from "vitest";
import {
  approveAllOnPaper,
  exportPaper,
  getPaperOverview,
  getQuestionForEdit,
  importPaper,
  saveQuestion,
  type PaperInput,
} from "@/lib/prep/admin/question-bank";
import { getPracticePapersBySubject } from "@/lib/prep/queries";
import type { Store } from "@/lib/prep/store";
import { seedDatabase } from "@/lib/prep/seed/seed";
import { createTestStore } from "../helpers/store";

let db: Store;

beforeAll(async () => {
  db = await createTestStore();
  await seedDatabase(db, { password: "password-123" });
});

const questionBy = async (code: string) => (await db.read("questions")).questions.find((q) => q.code === code);
const paperBy = async (year: number, paperNo?: number) =>
  (await db.read("papers")).papers.find((p) => p.year === year && (paperNo === undefined || p.paperNo === paperNo));

const paper = (): PaperInput => ({
  subjectCode: "soc",
  year: 2022,
  paperNo: 2,
  durationMinutes: 75,
  instructions: "Answer all questions.",
  questions: [
    {
      code: "SOC-2022-P2-1a",
      numberLabel: "1(a)",
      type: "theory",
      text: "State two causes of soil erosion.",
      marks: 2,
      imageUrls: [],
      topic: { strand: "Environment", subStrand: "Land degradation" },
      options: [],
      markingPoints: [
        { description: "Deforestation", marks: 1, strictness: "meaning", acceptedAlternatives: ["cutting down trees"], keyTerms: [] },
        { description: "Overgrazing", marks: 1, strictness: "key_term", acceptedAlternatives: [], keyTerms: ["overgrazing"] },
      ],
      modelAnswer: "Deforestation and overgrazing.",
    },
    {
      code: "SOC-2022-P2-1b",
      numberLabel: "1(b)",
      type: "short",
      text: "Name the capital of Ghana.",
      marks: 1,
      imageUrls: [],
      options: [],
      markingPoints: [{ description: "Accra", marks: 1, strictness: "exact", acceptedAlternatives: [], keyTerms: [] }],
    },
  ],
});

const statusOf = async (code: string) => (await questionBy(code))?.status;

describe("importPaper", () => {
  it("creates a paper with draft questions that students can't see yet", async () => {
    const r = await importPaper(db, paper());
    expect(r).toMatchObject({ ok: true, created: 2, changed: 0, unchanged: 0, notInFile: [] });
    expect(await statusOf("SOC-2022-P2-1a")).toBe("draft");
    const soc = (await getPracticePapersBySubject(db)).find((s) => s.code === "SOC")!;
    expect(soc.papers).toEqual([]);
  });

  it("round-trips through export", async () => {
    const row = (await paperBy(2022))!;
    const exported = await exportPaper(db, row.id);
    expect(exported).toEqual({ ...paper(), subjectCode: "SOC", questions: paper().questions.map((q) => ({ topic: null, modelAnswer: null, ...q })) });
  });

  it("re-import keeps unchanged questions approved and sends changed ones back to draft", async () => {
    const row = (await paperBy(2022))!;
    expect(await approveAllOnPaper(db, row.id)).toBe(2);

    const edited = paper();
    edited.questions[1].text = "Name the capital city of Ghana.";
    edited.questions.splice(0, 1); // 1(a) left out of the file
    const r = await importPaper(db, edited);
    expect(r).toMatchObject({ ok: true, created: 0, changed: 1, unchanged: 0, notInFile: ["SOC-2022-P2-1a"] });
    expect(await statusOf("SOC-2022-P2-1a")).toBe("approved");
    expect(await statusOf("SOC-2022-P2-1b")).toBe("draft");

    expect(await importPaper(db, paper())).toMatchObject({ ok: true, unchanged: 1, changed: 1 });
  });

  it("explains every problem and saves nothing", async () => {
    const bad = {
      subjectCode: "SOC",
      year: 2021,
      paperNo: 1,
      questions: [
        {
          code: "SOC-2021-P1-1",
          numberLabel: "1",
          type: "mcq",
          text: "Pick one",
          marks: 1,
          options: [
            { label: "A", text: "x", isCorrect: true },
            { label: "B", text: "y", isCorrect: true },
          ],
        },
        { code: "SOC-2021-P1-2", numberLabel: "2", type: "theory", text: "Explain", marks: 3, markingPoints: [{ description: "a", marks: 2, strictness: "meaning" }] },
        { code: "SOC-2021-P1-2", numberLabel: "3", type: "essay", text: "Discuss", marks: 1, markingPoints: [{ description: "b", marks: 1, strictness: "key_term" }] },
      ],
    };
    const r = await importPaper(db, bad);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.problems).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^Question 1 \(SOC-2021-P1-1\) options: .*exactly one correct option \(found 2\)/),
        expect.stringMatching(/^Question 2 .*add up to 2 but the question is worth 3/),
        expect.stringMatching(/^Question 3 .*key term/),
        expect.stringContaining("SOC-2021-P1-2 appears more than once"),
      ]),
    );
    expect(await paperBy(2021)).toBeUndefined();
  });

  it("refuses unknown subjects and codes that belong to another paper", async () => {
    expect(await importPaper(db, { ...paper(), subjectCode: "XYZ" })).toMatchObject({
      ok: false,
      problems: [expect.stringContaining("Unknown subjectCode")],
    });
    const stolen = { ...paper(), year: 2020, questions: [paper().questions[1]] };
    expect(await importPaper(db, stolen)).toMatchObject({ ok: false, problems: [expect.stringContaining("different paper")] });
  });

  it("rejects input that isn't a paper at all", async () => {
    expect((await importPaper(db, null)).ok).toBe(false);
    expect((await importPaper(db, [1, 2])).ok).toBe(false);
  });
});

describe("saveQuestion", () => {
  it("edits content and status but never the code", async () => {
    const q = (await questionBy("MATH-2023-P1-1"))!;
    const before = (await getQuestionForEdit(db, q.id))!;
    const r = await saveQuestion(
      db,
      q.id,
      {
        ...before,
        code: "HACKED-1",
        text: "Simplify 3/4 + 2/3, giving your answer as a fraction.",
        options: before.options.map((o) => ({ ...o, isCorrect: o.label === "B" })),
      },
      false,
    );
    expect(r).toEqual({ ok: true });
    const after = (await getQuestionForEdit(db, q.id))!;
    expect(after).toMatchObject({ code: "MATH-2023-P1-1", status: "draft", text: expect.stringContaining("as a fraction") });
  });

  it("refuses an MCQ with no correct answer", async () => {
    const q = (await questionBy("MATH-2023-P1-2"))!;
    const before = (await getQuestionForEdit(db, q.id))!;
    const r = await saveQuestion(db, q.id, { ...before, options: before.options.map((o) => ({ ...o, isCorrect: false })) }, true);
    expect(r).toEqual({ ok: false, problems: [expect.stringContaining("exactly one correct option")] });
    expect(await statusOf("MATH-2023-P1-2")).toBe("approved");
  });
});

describe("getPaperOverview", () => {
  it("lists questions in paper order", async () => {
    const row = (await paperBy(2023, 1))!;
    const o = (await getPaperOverview(db, row.id))!;
    expect(o.questions.map((q) => q.numberLabel)).toEqual(["1", "2", "3", "4", "5"]);
  });
});
