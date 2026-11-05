import { z } from "zod";
import {
  insert,
  newId,
  QUESTION_TYPES,
  remove,
  StoreConflictError,
  STRICTNESS,
  update,
  type RowOf,
  type Store,
  type WriteOp,
} from "@/lib/prep/store";

/**
 * Question bank import / export / editing.
 *
 * The import format is one JSON file per paper (see `paperSchema`). It is the same shape the
 * export produces, so a paper can be exported, corrected and re-imported.
 * New and changed questions arrive as drafts; students only see approved questions.
 */

const trimmed = (msg: string) => z.string({ required_error: msg }).trim().min(1, msg);
const lines = z.array(z.string().trim().min(1)).default([]);

export const markingPointSchema = z
  .object({
    description: trimmed("Each marking point needs a description."),
    marks: z.number().positive("Marking point marks must be more than 0."),
    strictness: z.enum(STRICTNESS),
    acceptedAlternatives: lines,
    keyTerms: lines,
  })
  .refine((mp) => mp.strictness !== "key_term" || mp.keyTerms.length > 0, {
    message: 'Marking points with strictness "key_term" need at least one key term.',
    path: ["keyTerms"],
  });

export const optionSchema = z.object({
  label: z.string().trim().toUpperCase().regex(/^[A-E]$/, "Option labels are A to E."),
  text: trimmed("Each option needs text."),
  isCorrect: z.boolean().default(false),
});

export const questionSchema = z
  .object({
    code: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9][A-Za-z0-9-]{0,63}$/, "Question codes use letters, numbers and dashes, e.g. SCI-2024-P2-3b."),
    numberLabel: trimmed("Each question needs its number as printed, e.g. 3(b)."),
    type: z.enum(QUESTION_TYPES),
    text: trimmed("Each question needs text."),
    marks: z.number().positive("Question marks must be more than 0."),
    imageUrls: z.array(z.string().trim().url("Image links must be full URLs.")).default([]),
    topic: z
      .object({ strand: trimmed("A topic needs a strand."), subStrand: z.string().trim().min(1).nullish() })
      .nullish(),
    options: z.array(optionSchema).default([]),
    markingPoints: z.array(markingPointSchema).default([]),
    modelAnswer: z.string().trim().min(1).nullish(),
  })
  .superRefine((q, ctx) => {
    const issue = (message: string, path: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, message, path: [path] });
    if (q.type === "mcq") {
      if (q.options.length < 2) issue("Multiple-choice questions need at least 2 options.", "options");
      const labels = q.options.map((o) => o.label);
      if (new Set(labels).size !== labels.length) issue("Option labels must not repeat.", "options");
      const correct = q.options.filter((o) => o.isCorrect).length;
      if (correct !== 1) issue(`Multiple-choice questions need exactly one correct option (found ${correct}).`, "options");
      if (q.markingPoints.length) issue("Multiple-choice questions don't use marking points.", "markingPoints");
    } else {
      if (q.options.length) issue(`Only multiple-choice questions have options (this one is "${q.type}").`, "options");
      if (!q.markingPoints.length) issue("Written questions need at least one marking point.", "markingPoints");
      const total = q.markingPoints.reduce((s, mp) => s + mp.marks, 0);
      if (q.markingPoints.length && Math.abs(total - q.marks) > 1e-9) {
        issue(`Marking points add up to ${total} but the question is worth ${q.marks}.`, "markingPoints");
      }
    }
  });

export const paperSchema = z
  .object({
    subjectCode: z.string().trim().toUpperCase().min(1),
    year: z.number().int().min(1990).max(2100),
    paperNo: z.union([z.literal(1), z.literal(2)], { errorMap: () => ({ message: "paperNo must be 1 or 2." }) }),
    durationMinutes: z.number().int().positive().nullish(),
    instructions: z.string().trim().min(1).nullish(),
    questions: z.array(questionSchema).min(1, "The paper has no questions."),
  })
  .superRefine((p, ctx) => {
    const dupes = (values: string[]) => [...new Set(values.filter((v, i) => values.indexOf(v) !== i))];
    for (const code of dupes(p.questions.map((q) => q.code.toUpperCase()))) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Question code ${code} appears more than once.`, path: ["questions"] });
    }
    for (const n of dupes(p.questions.map((q) => q.numberLabel))) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Question number ${n} appears more than once.`, path: ["questions"] });
    }
  });

export type QuestionInput = z.infer<typeof questionSchema>;
export type PaperInput = z.infer<typeof paperSchema>;
export type LoadedQuestion = QuestionInput & { id: string; status: "draft" | "approved"; position: number };

/** Turns zod issues into plain sentences that point at the question by number and code. */
export function describeIssues(error: z.ZodError, input: unknown): string[] {
  const qs = (input as { questions?: { code?: unknown; numberLabel?: unknown }[] } | null)?.questions;
  return error.issues.map((i) => {
    const [first, index, ...rest] = i.path;
    if (first === "questions" && typeof index === "number") {
      const q = Array.isArray(qs) ? qs[index] : undefined;
      const who = q?.numberLabel ? `Question ${String(q.numberLabel)}` : `Question #${index + 1}`;
      const code = q?.code ? ` (${String(q.code)})` : "";
      const where = rest.length ? ` ${rest.join(".")}:` : ":";
      return `${who}${code}${where} ${i.message}`;
    }
    return i.path.length ? `${i.path.join(".")}: ${i.message}` : i.message;
  });
}

// ---------------------------------------------------------------------------
// Reading questions back in import shape
// ---------------------------------------------------------------------------

const BANK_TABLES = ["questions", "topics", "mcqOptions", "markingPoints", "modelAnswers"] as const;
type Bank = { [K in (typeof BANK_TABLES)[number]]: RowOf<K>[] };

/** Questions (in position order) in the same shape the importer accepts. */
function assemble(bank: Bank, questionRows: RowOf<"questions">[]): LoadedQuestion[] {
  return [...questionRows]
    .sort((a, b) => a.position - b.position)
    .map((q) => {
      const topic = q.topicId ? bank.topics.find((t) => t.id === q.topicId) : undefined;
      return {
        id: q.id,
        status: q.status,
        position: q.position,
        code: q.code,
        numberLabel: q.numberLabel,
        type: q.type,
        text: q.text,
        marks: q.marks,
        imageUrls: q.imageUrls,
        topic: topic ? { strand: topic.strand, subStrand: topic.subStrand } : null,
        options: bank.mcqOptions
          .filter((o) => o.questionId === q.id)
          .sort((a, b) => a.label.localeCompare(b.label))
          .map(({ label, text, isCorrect }) => ({ label, text, isCorrect })),
        markingPoints: bank.markingPoints
          .filter((mp) => mp.questionId === q.id)
          .sort((a, b) => a.order - b.order)
          .map(({ description, marks, strictness, acceptedAlternatives, keyTerms }) => ({
            description,
            marks,
            strictness,
            acceptedAlternatives,
            keyTerms,
          })),
        modelAnswer: bank.modelAnswers.find((m) => m.questionId === q.id)?.text ?? null,
      };
    });
}

/** Content that matters for marking. Two questions with the same fingerprint need no re-review. */
function fingerprint(q: QuestionInput): string {
  return JSON.stringify([
    q.numberLabel,
    q.type,
    q.text,
    q.marks,
    q.imageUrls,
    q.topic ? [q.topic.strand, q.topic.subStrand ?? null] : null,
    [...q.options].sort((a, b) => a.label.localeCompare(b.label)).map((o) => [o.label, o.text, o.isCorrect]),
    q.markingPoints.map((mp) => [mp.description, mp.marks, mp.strictness, mp.acceptedAlternatives, mp.keyTerms]),
    q.modelAnswer ?? null,
  ]);
}

export async function exportPaper(store: Store, paperId: string): Promise<PaperInput | null> {
  const { papers, subjects, ...bank } = await store.read("papers", "subjects", ...BANK_TABLES);
  const paper = papers.find((p) => p.id === paperId);
  if (!paper) return null;
  const subject = subjects.find((s) => s.id === paper.subjectId);
  const qs = assemble(bank, bank.questions.filter((q) => q.paperId === paperId));
  return {
    subjectCode: subject?.code ?? "",
    year: paper.year,
    paperNo: paper.paperNo as 1 | 2,
    durationMinutes: paper.durationMinutes,
    instructions: paper.instructions,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    questions: qs.map(({ id, status, position, ...q }) => q),
  };
}

export async function getQuestionForEdit(store: Store, questionId: string) {
  const bank = await store.read(...BANK_TABLES);
  const q = bank.questions.find((x) => x.id === questionId);
  return q ? { ...assemble(bank, [q])[0], paperId: q.paperId } : null;
}

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

/**
 * Builds the ops that set a question's content: its own fields, and its options, marking points
 * and model answer (replaced wholesale). New topics are added to `bank.topics` so a batch reuses them.
 */
function contentOps(bank: Bank, questionId: string, subjectId: string, q: QuestionInput, now: Date): { ops: WriteOp[]; fields: Partial<RowOf<"questions">> } {
  const ops: WriteOp[] = [];
  let topicId: string | null = null;
  if (q.topic) {
    const subStrand = q.topic.subStrand ?? null;
    const existing = bank.topics.find((t) => t.subjectId === subjectId && t.strand === q.topic!.strand && t.subStrand === subStrand);
    if (existing) topicId = existing.id;
    else {
      const topic = { id: newId(), subjectId, strand: q.topic.strand, subStrand, naccaIndicatorCode: null };
      bank.topics.push(topic);
      ops.push(insert("topics", [topic]));
      topicId = topic.id;
    }
  }

  const childIds = <T extends { id: string; questionId: string }>(rows: T[]) => rows.filter((r) => r.questionId === questionId).map((r) => r.id);
  ops.push(remove("mcqOptions", childIds(bank.mcqOptions)));
  ops.push(remove("markingPoints", childIds(bank.markingPoints)));
  ops.push(remove("modelAnswers", childIds(bank.modelAnswers)));
  if (q.options.length) {
    ops.push(insert("mcqOptions", q.options.map((o) => ({ id: newId(), questionId, label: o.label, text: o.text, isCorrect: o.isCorrect }))));
  }
  if (q.markingPoints.length) {
    ops.push(insert("markingPoints", q.markingPoints.map((mp, i) => ({ id: newId(), questionId, order: i + 1, ...mp }))));
  }
  if (q.modelAnswer) ops.push(insert("modelAnswers", [{ id: newId(), questionId, text: q.modelAnswer }]));

  return {
    ops,
    fields: { numberLabel: q.numberLabel, type: q.type, text: q.text, marks: q.marks, imageUrls: q.imageUrls, topicId, updatedAt: now },
  };
}

export type PaperImportResult =
  | { ok: false; problems: string[] }
  | {
      ok: true;
      paperId: string;
      created: number;
      changed: number;
      unchanged: number;
      /** Codes of questions already on this paper that the file didn't mention. They are kept. */
      notInFile: string[];
    };

/**
 * Imports one paper. All-or-nothing: any problem means nothing is saved.
 * New questions and questions whose content changed become drafts; unchanged ones keep their status.
 */
export async function importPaper(store: Store, raw: unknown, now = new Date()): Promise<PaperImportResult> {
  const parsed = paperSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, problems: describeIssues(parsed.error, raw) };
  const p = parsed.data;

  const { subjects, papers, ...bank } = await store.read("subjects", "papers", ...BANK_TABLES);
  const subject = subjects.find((s) => s.code.toUpperCase() === p.subjectCode);
  if (!subject) {
    const codes = [...subjects].sort((a, b) => a.sortOrder - b.sortOrder).map((s) => s.code);
    return { ok: false, problems: [`Unknown subjectCode "${p.subjectCode}". Use one of: ${codes.join(", ")}.`] };
  }

  const existingPaper = papers.find((x) => x.subjectId === subject.id && x.year === p.year && x.paperNo === p.paperNo);

  // A code is globally unique: refuse to silently move a question from another paper.
  const fileCodes = new Set(p.questions.map((q) => q.code.toUpperCase()));
  const problems = bank.questions
    .filter((q) => fileCodes.has(q.code.toUpperCase()) && q.paperId !== existingPaper?.id)
    .map((q) => `Question code ${q.code} is already used on a different paper.`);
  if (problems.length) return { ok: false, problems };

  const ops: WriteOp[] = [];
  const paperId = existingPaper?.id ?? newId();
  const paperFields = { durationMinutes: p.durationMinutes ?? null, instructions: p.instructions ?? null };
  ops.push(
    existingPaper
      ? update("papers", paperId, paperFields)
      : insert("papers", [{ id: paperId, subjectId: subject.id, year: p.year, paperNo: p.paperNo, createdAt: now, ...paperFields }]),
  );

  const currentRows = bank.questions.filter((q) => existingPaper && q.paperId === existingPaper.id);
  const byCode = new Map(assemble(bank, currentRows).map((q) => [q.code.toUpperCase(), q]));

  let created = 0;
  let changed = 0;
  let unchanged = 0;
  const newQuestions: RowOf<"questions">[] = [];
  for (const [position, q] of p.questions.entries()) {
    const before = byCode.get(q.code.toUpperCase());
    if (!before) {
      const id = newId();
      const { ops: childOps, fields } = contentOps(bank, id, subject.id, q, now);
      newQuestions.push({
        id,
        code: q.code,
        paperId,
        subjectId: subject.id,
        topicId: null,
        numberLabel: q.numberLabel,
        position,
        type: q.type,
        text: q.text,
        imageUrls: [],
        marks: q.marks,
        status: "draft",
        createdAt: now,
        updatedAt: now,
        ...fields,
      });
      ops.push(...childOps);
      created++;
    } else if (fingerprint(before) !== fingerprint(q)) {
      const { ops: childOps, fields } = contentOps(bank, before.id, subject.id, q, now);
      ops.push(update("questions", before.id, { ...fields, position, status: "draft" }), ...childOps);
      changed++;
    } else {
      if (before.position !== position) ops.push(update("questions", before.id, { position }));
      unchanged++;
    }
  }
  if (newQuestions.length) ops.push(insert("questions", newQuestions, { unique: ["code"] }));

  try {
    await store.write(ops);
  } catch (e) {
    if (e instanceof StoreConflictError) return { ok: false, problems: [`Question code ${e.value} was added by someone else just now. Import again.`] };
    throw e;
  }

  const inFile = new Set(p.questions.map((q) => q.code.toUpperCase()));
  return {
    ok: true,
    paperId,
    created,
    changed,
    unchanged,
    notInFile: currentRows.filter((r) => !inFile.has(r.code.toUpperCase())).map((r) => r.code),
  };
}

/**
 * Saves an edited question. The code and paper can't change here.
 * `approved` sets the status directly: the admin editing it is the reviewer.
 */
export async function saveQuestion(
  store: Store,
  questionId: string,
  raw: unknown,
  approved: boolean,
  now = new Date(),
): Promise<{ ok: true } | { ok: false; problems: string[] }> {
  const bank = await store.read(...BANK_TABLES);
  const existing = bank.questions.find((q) => q.id === questionId);
  if (!existing) return { ok: false, problems: ["That question no longer exists."] };

  const parsed = questionSchema.safeParse({ ...(raw as object), code: existing.code });
  if (!parsed.success) return { ok: false, problems: parsed.error.issues.map((i) => i.message) };

  const { ops, fields } = contentOps(bank, questionId, existing.subjectId, parsed.data, now);
  await store.write([update("questions", questionId, { ...fields, status: approved ? "approved" : "draft" }), ...ops]);
  return { ok: true };
}

export async function setQuestionStatus(store: Store, questionIds: string[], status: "draft" | "approved") {
  const { questions } = await store.read("questions");
  const ids = new Set(questionIds);
  const targets = questions.filter((q) => ids.has(q.id) && q.status !== status);
  await store.write(targets.map((q) => update("questions", q.id, { status })));
  return targets.length;
}

export async function approveAllOnPaper(store: Store, paperId: string) {
  const { questions } = await store.read("questions");
  const drafts = questions.filter((q) => q.paperId === paperId && q.status === "draft");
  await store.write(drafts.map((q) => update("questions", q.id, { status: "approved" })));
  return drafts.length;
}

/** Paper header plus its questions, for the admin paper page. */
export async function getPaperOverview(store: Store, paperId: string) {
  const { papers, subjects, ...bank } = await store.read("papers", "subjects", ...BANK_TABLES);
  const paper = papers.find((p) => p.id === paperId);
  if (!paper) return null;
  const subject = subjects.find((s) => s.id === paper.subjectId);
  return {
    paper: {
      id: paper.id,
      year: paper.year,
      paperNo: paper.paperNo,
      durationMinutes: paper.durationMinutes,
      instructions: paper.instructions,
      subjectName: subject?.name ?? "Unknown subject",
      subjectCode: subject?.code ?? "",
    },
    questions: assemble(bank, bank.questions.filter((q) => q.paperId === paperId)),
  };
}
