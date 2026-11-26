import { createHash } from "node:crypto";
import { markTheory, tokenize, type PointResult } from "@/lib/prep/grading/theory";
import { insert, newId, StoreConflictError, update, type PracticeItem, type Store } from "@/lib/prep/store";
import { AttemptError, PAPER_TABLES, withAnswers, type PaperData } from "./attempts";

/**
 * Mixed practice ("Practice mode"): one subject's questions from every year, shuffled, untimed, with the answer
 * straight after each question.
 *
 * - A question answered wrong comes back: later in the same session (as a copy from another year when there is
 *   one), and first in the next session, until it is answered right.
 * - The same question set in several years counts as one: answering one copy right masters them all.
 * - Theory: the points the rules can mark must all be earned. Answers only a teacher can mark (and French and Twi)
 *   are checked by the student against the model answer: "Got it" or "Not yet".
 *
 * Progress is kept per student and question group in PracticeItems (a database table, see store/schema.ts).
 */

const STOP = new Set("a an the of to in on at by for from with and or is are was were be been it its this that these those as which who what".split(" "));

/** Same wording (ignoring case, punctuation and filler words) and the same options in any order: the same question. */
export function groupKeyOf(q: { text: string; options: { text: string }[] }): string {
  const words = (s: string) =>
    tokenize(s.replace(/\{\{img:([A-Za-z0-9_-]+)[^}]*\}\}/g, " img$1 "))
      .filter((t) => !STOP.has(t.word))
      .map((t) => t.stem)
      .join(" ");
  const options = q.options.map((o) => words(o.text)).sort();
  return createHash("sha1").update(`${words(q.text)}||${options.join("|")}`).digest("hex").slice(0, 16);
}

type FullQuestion = ReturnType<typeof withAnswers>;

/** What the practice screen gets for one question. The key is included: practice shows it straight away anyway. */
export type MixedQuestion = {
  id: string;
  groupKey: string;
  source: string;
  numberLabel: string;
  type: string;
  text: string;
  imageUrls: string[];
  marks: number;
  options: { label: string; text: string }[];
  /** Objective questions: the right option and its explanation. */
  key: { correct: string; explanation: string | null } | null;
  /** Theory a teacher would mark: the student compares with the model answer instead. */
  selfCheck: boolean;
  /** Sent only with self-checked questions, which show it before the student says how they did. */
  modelAnswer: string | null;
};
/** One question and its copies from other years; a copy is shown when it comes back. */
export type MixedItem = { groupKey: string; copies: MixedQuestion[] };
export type MixedStats = { total: number; mastered: number; toRedo: number };

type MixedData = PaperData & { practiceItems: PracticeItem[] };

function autoPoints(q: FullQuestion) {
  return q.markingPoints.filter((p) => p.strictness !== "rubric");
}

/** Pools per data snapshot: a class report asks for the same subject once per student. */
const pools = new WeakMap<object, Map<string, ReturnType<typeof buildPool>>>();

function subjectPool(data: PaperData, subjectId: string) {
  const forData = pools.get(data.questions) ?? new Map<string, ReturnType<typeof buildPool>>();
  pools.set(data.questions, forData);
  if (!forData.has(subjectId)) forData.set(subjectId, buildPool(data, subjectId));
  return forData.get(subjectId)!;
}

function buildPool(data: PaperData, subjectId: string) {
  const papers = new Map(data.papers.map((p) => [p.id, p]));
  const groups = new Map<string, FullQuestion[]>();
  for (const row of data.questions) {
    if (row.subjectId !== subjectId || row.status !== "approved") continue;
    const q = withAnswers(data, row);
    if (q.type === "mcq" && q.options.filter((o) => o.isCorrect).length !== 1) continue;
    if (q.type !== "mcq" && !q.markingPoints.length && !q.modelAnswer) continue;
    const key = groupKeyOf(q);
    groups.set(key, [...(groups.get(key) ?? []), q]);
  }
  // Newest year first within a group.
  const year = (q: FullQuestion) => (q.paperId ? (papers.get(q.paperId)?.year ?? 0) : 0);
  for (const qs of groups.values()) qs.sort((a, b) => year(b) - year(a));
  return { groups, papers };
}

function toClient(q: FullQuestion, groupKey: string, papers: Map<string, PaperData["papers"][number]>, autoMarkTheory: boolean): MixedQuestion {
  const paper = q.paperId ? papers.get(q.paperId) : undefined;
  const selfCheck = q.type !== "mcq" && (!autoMarkTheory || !autoPoints(q).length);
  return {
    id: q.id,
    groupKey,
    source: paper ? `BECE ${paper.year} · Paper ${paper.paperNo}` : "Question bank",
    numberLabel: q.numberLabel,
    type: q.type,
    text: q.text,
    imageUrls: q.imageUrls,
    marks: q.marks,
    options: q.options.map(({ label, text }) => ({ label, text })),
    key: q.type === "mcq" ? { correct: q.options.find((o) => o.isCorrect)!.label, explanation: q.modelAnswer } : null,
    selfCheck,
    modelAnswer: selfCheck ? q.modelAnswer : null,
  };
}

function shuffle<T>(xs: T[], random = Math.random): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const readMixed = (store: Store) => store.read("practiceItems", ...PAPER_TABLES) as Promise<MixedData>;

function findSubject(data: PaperData, code: string) {
  const subject = data.subjects.find((s) => s.code.toUpperCase() === code.toUpperCase());
  if (!subject) throw new AttemptError("That subject doesn't exist.");
  return subject;
}

function statsOf(groups: Map<string, unknown>, items: PracticeItem[]): MixedStats {
  const mine = items.filter((i) => groups.has(i.groupKey));
  return { total: groups.size, mastered: mine.filter((i) => i.mastered).length, toRedo: mine.filter((i) => !i.mastered).length };
}

/**
 * The next questions for a student. Order: questions they got wrong before (longest ago first), then new ones in
 * random order, then (when every question is mastered) a review of the oldest. `exclude`: groups already on screen.
 */
export async function nextMixedBatch(store: Store, studentId: string, subjectCode: string, exclude: string[] = [], size = 10, random = Math.random) {
  const data = await readMixed(store);
  const subject = findSubject(data, subjectCode);
  const { groups, papers } = subjectPool(data, subject.id);
  const items = data.practiceItems.filter((i) => i.studentId === studentId && i.subjectId === subject.id);
  const byGroup = new Map(items.map((i) => [i.groupKey, i]));
  const skip = new Set(exclude);
  const open = [...groups.keys()].filter((k) => !skip.has(k));

  const redo = open.filter((k) => byGroup.has(k) && !byGroup.get(k)!.mastered).sort((a, b) => byGroup.get(a)!.lastAt.getTime() - byGroup.get(b)!.lastAt.getTime());
  const fresh = shuffle(open.filter((k) => !byGroup.has(k)), random);
  const review = open.filter((k) => byGroup.get(k)?.mastered).sort((a, b) => byGroup.get(a)!.lastAt.getTime() - byGroup.get(b)!.lastAt.getTime());
  const picked = [...redo, ...fresh, ...(redo.length + fresh.length < size ? review : [])].slice(0, size);

  return {
    subject: { id: subject.id, name: subject.name, code: subject.code },
    items: picked.map(
      (k): MixedItem => ({
        groupKey: k,
        // Start from a random copy, so the same year doesn't always come up.
        copies: shuffle(groups.get(k)!, random).map((q) => toClient(q, k, papers, subject.autoMarkTheory)),
      }),
    ),
    stats: statsOf(groups, items),
  };
}

export type MixedAnswer = { choice?: string; text?: string; selfCheck?: "got" | "not" };

export type MixedResult = {
  correct: boolean;
  /** Objective: the right option. */
  correctLabel: string | null;
  /** Theory marked by the rules: the points the rules could mark. */
  theory: { awarded: number; outOf: number; points: PointResult[] } | null;
  modelAnswer: string | null;
  stats: MixedStats;
};

/** Marks one answer and records it. Wrong (or "Not yet") keeps the question coming back. */
export async function answerMixed(store: Store, studentId: string, questionId: string, answer: MixedAnswer, now = new Date()): Promise<MixedResult> {
  const data = await readMixed(store);
  const row = data.questions.find((q) => q.id === questionId && q.status === "approved");
  if (!row) throw new AttemptError("That question isn't available any more.");
  const subject = data.subjects.find((s) => s.id === row.subjectId);
  if (!subject) throw new AttemptError("That question isn't available any more.");
  const q = withAnswers(data, row);
  const groupKey = groupKeyOf(q);

  let correct: boolean;
  let correctLabel: string | null = null;
  let theory: MixedResult["theory"] = null;
  if (q.type === "mcq") {
    correctLabel = q.options.find((o) => o.isCorrect)?.label ?? null;
    correct = !!answer.choice && answer.choice === correctLabel;
  } else if (subject.autoMarkTheory && autoPoints(q).length) {
    const points = autoPoints(q);
    const r = markTheory(answer.text ?? "", points);
    const outOf = points.reduce((s, p) => s + p.marks, 0);
    theory = { awarded: r.awarded, outOf, points: r.points };
    correct = r.awarded >= outOf;
  } else {
    correct = answer.selfCheck === "got";
  }

  const itemKey = `${studentId}|${groupKey}`;
  const existing = data.practiceItems.find((i) => i.itemKey === itemKey);
  const changes = (prev?: PracticeItem) => ({
    lastQuestionId: q.id,
    tries: (prev?.tries ?? 0) + 1,
    rightCount: (prev?.rightCount ?? 0) + (correct ? 1 : 0),
    lastRight: correct,
    mastered: (prev?.mastered ?? false) || correct,
    lastAt: now,
  });
  try {
    if (existing) await store.write([update("practiceItems", existing.id, changes(existing))]);
    else await store.write([insert("practiceItems", [{ id: newId(), studentId, subjectId: subject.id, groupKey, itemKey, createdAt: now, ...changes() }], { unique: ["itemKey"] })]);
  } catch (e) {
    // Answered twice at the same moment (two tabs): add to the row the other one made.
    if (!(e instanceof StoreConflictError)) throw e;
    const { practiceItems } = await store.read("practiceItems");
    const other = practiceItems.find((i) => i.itemKey === itemKey)!;
    await store.write([update("practiceItems", other.id, changes(other))]);
  }

  const { groups } = subjectPool(data, subject.id);
  const { practiceItems } = await store.read("practiceItems");
  return {
    correct,
    correctLabel,
    theory,
    modelAnswer: q.modelAnswer,
    stats: statsOf(
      groups,
      practiceItems.filter((i) => i.studentId === studentId && i.subjectId === subject.id),
    ),
  };
}

/** Per subject, for the progress report: questions mastered out of all of the subject's questions. */
export function mixedSummary(data: PaperData & { practiceItems: PracticeItem[] }, studentId: string, subjectIds: Set<string> | null) {
  const out: { subjectId: string; name: string; total: number; mastered: number; toRedo: number }[] = [];
  const mine = data.practiceItems.filter((i) => i.studentId === studentId && (!subjectIds || subjectIds.has(i.subjectId)));
  for (const subjectId of new Set(mine.map((i) => i.subjectId))) {
    const subject = data.subjects.find((s) => s.id === subjectId);
    if (!subject) continue;
    const { groups } = subjectPool(data, subjectId);
    out.push({ subjectId, name: subject.name, ...statsOf(groups, mine.filter((i) => i.subjectId === subjectId)) });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}
