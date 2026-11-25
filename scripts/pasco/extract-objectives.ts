/**
 * Convert the objective (Paper 1) sections of a PASCO / WordPub "BECE Past Questions & Answers" book into
 * draft paper files in the BECE Prep import format, plus a review list of anything that needs a human eye.
 *
 * Usage:
 *   npm run pasco:objectives -- <book.pdf | book.htm> --subject SCI [--password 1234] [--out private/papers]
 *
 * A .pdf is read directly (password-protected copies too). A Word .doc book is first saved from Word as
 * HTML (see docs/PAST_PAPERS.md) and the .htm is passed here.
 * Output goes to a git-ignored folder: licensed content must never be committed (the repo is public).
 * Then: check the review list, run scripts/pasco/select-papers.ts, and import. Papers arrive as drafts,
 * so students see nothing until an admin approves them.
 *
 * How it works:
 *   1. The book becomes lines of text (pdf-pages.ts for PDFs, word-html.ts for Word HTML), keeping
 *      superscripts and subscripts (m s⁻², H₂O), underlined words (<u>...</u>) and table cells (tabs).
 *   2. Sections are found by their headings ("2021: INTEGRATED SCIENCE 1", or "June 2025" then "COMPUTING 1")
 *      and the matching "ANSWERS" / "SOLUTIONS" pages.
 *   3. Section instructions ("SECTION B: choose the word nearest in meaning to the underlined word") and
 *      cloze passages are attached to every question they apply to.
 *   4. Questions ("12. ..."), options ("A. ..." to "E. ...", or a row of a table) and the answer key
 *      ("12. B. ...") are parsed. When the key's letter and text disagree, the text wins and it is flagged.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { isHeadingLine, readPdfPages, splitSections } from "./pdf-pages";
import { readHtmlPages } from "./word-html";

type Option = { label: string; text: string; isCorrect: boolean };
type Question = { code: string; numberLabel: string; type: "mcq"; text: string; marks: number; options: Option[]; modelAnswer?: string };

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    subject: { type: "string" },
    password: { type: "string" },
    /** Force the page layout instead of detecting it: 1 or 2 columns. */
    columns: { type: "string" },
    out: { type: "string", default: "private/papers" },
    /** Print the reconstructed lines of one page (for checking a new book layout). */
    dump: { type: "string" },
  },
});

const pdfPath = positionals[0];
if (!pdfPath || !values.subject) {
  console.error("Usage: npm run pasco:objectives -- <pdf> --subject SCI [--password 1234] [--out private/papers]");
  process.exit(1);
}
const subject = values.subject.toUpperCase();

// ---------------------------------------------------------------------------
// 2. Parse
// ---------------------------------------------------------------------------

const SKIP = /^(OBJECTIVE TEST|Paper 1 - OBJECTIVE TEST|ANSWERS|Answer all the questions|Think carefully|Erase completely|Do all rough work|Now answer the following|END OF|\d+ minutes)/i;
const keep = (l: string) => !SKIP.test(l) && !isHeadingLine(l);

/** Lines that open a section instruction ("SECTION B", "Choose from the alternatives ..."), not a question. */
const INSTRUCTION = /^(PART [A-F]\b|SECTION [A-H]\b|\[?UNIT [IVX\d]+\]?$|LEXIS AND STRUCTURE|ORAL LANGUAGE|From the (options|alternatives|list)|Choose from|In each of the following|In the following passage|Use the (information|diagram|table|figure|map|passage)|Study the (information|diagram|table|figure|map)|The passage below|Read the (following|passage)|Below (are|is)|For each (question|of the following))/i;
/** Lines that only name a part or section; dropped from the instruction text. */
const SECTION_NAME = /^(PART [A-F]|SECTION [A-H]|\[?UNIT [IVX\d]+\]?|LEXIS AND STRUCTURE|ORAL LANGUAGE)$/i;
const QUESTION_LINE = /^\d{1,2}\.\s/;
/** An options table row: "31. seek	request	search	look" (cells are tab-separated; a cell can be missing). */
const CLOZE_ROW = /^(\d{1,2})\.\s*([^\t]+(?:\t[^\t]+){2,4})$/;

/**
 * Separates section instructions from questions. An instruction that names questions ("... in Question 14
 * below") applies to those only; any other applies to every question until the next instruction.
 */
function liftInstructions(lines: string[]) {
  const out: string[] = [];
  const forQuestion = new Map<number, string>();
  /** Options from a table row whose question was already printed above it (French: sentences first, then a table). */
  const tableOptions = new Map<number, string[]>();
  const seen = new Set<number>();
  let block: string[] | null = null;
  const close = () => {
    if (!block) return;
    const text = block.filter((l) => !SECTION_NAME.test(l)).join(" ").replace(/\s+/g, " ").trim();
    const range = /questions? (\d+)(?:\s*(?:and|to|-|–)\s*(\d+))?/i.exec(text);
    if (text && range && !/^(In the following passage|The passage below|Read the)/i.test(text)) {
      for (let n = Number(range[1]); n <= Number(range[2] ?? range[1]); n++) forQuestion.set(n, text);
    } else out.push(`@@SECTION ${text}`);
    block = null;
  };
  for (const raw of lines) {
    if (/^A\s+B\s+C\s+D(\s+E)?$/.test(raw)) continue;
    const cloze = CLOZE_ROW.exec(raw);
    // A row that starts with an option label ("1. A<tab>text") is an answer, not a table of options.
    const table = cloze && !/^[A-E]\.?$/.test(cloze[2].split("\t")[0].trim()) ? cloze : null;
    if (table || QUESTION_LINE.test(raw)) close();
    if (table) {
      const n = Number(table[1]);
      const options = table[2].split("\t").map((cell, i) => `${"ABCDE"[i]}. ${cell.trim()}`);
      if (seen.has(n)) tableOptions.set(n, options);
      else out.push(`${n}. Choose the most suitable word for gap –${n}–.`, ...options);
      seen.add(n);
      continue;
    }
    const q = /^(\d{1,2})\.\s/.exec(raw);
    if (q) seen.add(Number(q[1]));
    if (!block && INSTRUCTION.test(raw) && !q) block = [];
    if (block) block.push(raw.replace(/\t/g, " "));
    else out.push(raw);
  }
  close();
  return { lines: out, forQuestion, tableOptions };
}

function parseQuestions(allLines: string[]) {
  const { lines, forQuestion, tableOptions } = liftInstructions(allLines.filter(keep));
  const body = lines.join("\n");
  const starts: { n: number; at: number; textAt: number }[] = [];
  for (const m of body.matchAll(/(?:^|\n)(\d{1,2})\.\s/g)) starts.push({ n: Number(m[1]), at: m.index, textAt: m.index + m[0].length });
  // Keep only the sequence 1, 2, 3, ... (ignores numbers inside text).
  const seq: typeof starts = [];
  for (const s of starts) if (s.n === (seq.at(-1)?.n ?? 0) + 1) seq.push(s);
  // Section instructions sit between questions; each question carries the last one before it.
  const sectionAt = [...body.matchAll(/(?:^|\n)@@SECTION ([^\n]*)/g)].map((m) => ({ at: m.index, text: m[1] }));
  const items = seq.map((s, i) => ({
    n: s.n,
    raw: [body.slice(s.textAt, seq[i + 1]?.at ?? body.length).replace(/\n@@SECTION [^\n]*/g, ""), ...(tableOptions.get(s.n) ?? [])].join("\n"),
    preamble: "",
    instruction: forQuestion.get(s.n) ?? sectionAt.filter((x) => x.at < s.at).at(-1)?.text ?? "",
  }));
  // A shared stem ("... Use the information to answer questions 27 and 28.") sits after the previous item's options.
  for (const [i, it] of items.entries()) {
    const shared = /\n(?![A-D]\.\s)((?:(?!\n[A-D]\.\s)[\s\S])*?questions? \d+(?:\s*(?:and|to|-|–)\s*\d+)?\.?)\s*$/i.exec(it.raw);
    if (shared && items[i + 1] && /use the|study the|answer|information|diagram/i.test(shared[1])) {
      it.raw = it.raw.slice(0, shared.index);
      const preamble = shared[1].replace(/\s+/g, " ").trim();
      // Every question in the range gets the shared stem, since students may open any of them on its own.
      const range = /questions? (\d+)(?:\s*(?:and|to|-|–)\s*(\d+))?/i.exec(preamble);
      const first = range ? Number(range[1]) : items[i + 1].n;
      const last = range?.[2] ? Number(range[2]) : first;
      for (const target of items) if (target.n >= first && target.n <= last) target.preamble = preamble;
    }
  }
  // The information for "Use the information to answer questions 4 and 5" is often printed just before that
  // line, after the previous question's last option ("D. Length" then "In the diagram, P and Q are two sets").
  // Lines after the last option that start a new sentence move to the questions the instruction names.
  for (const [i, it] of items.entries()) {
    const next = items[i + 1];
    const instruction = next && forQuestion.get(next.n);
    if (!instruction || forQuestion.get(it.n) === instruction) continue;
    const lines = it.raw.split("\n");
    const lastOption = lines.findLastIndex((l) => /^[A-E](?:\.\s|\)\s|\t)/.test(l));
    const tail = lastOption >= 0 ? lines.slice(lastOption + 1).filter((l) => l.trim()) : [];
    if (!tail.length || !/^[A-Z(]/.test(tail[0])) continue;
    it.raw = lines.slice(0, lastOption + 1).join("\n");
    const info = tail.join(" ").replace(/\s+/g, " ").trim();
    for (const target of items) if (forQuestion.get(target.n) === instruction) target.preamble = [info, target.preamble].filter(Boolean).join(" ");
  }
  return items;
}

/** An option label: "A. ", "A) " or "A" followed by a tab. */
const optionLabel = (label: string) => new RegExp(`(^|\\s)${label}(?:\\.\\s|\\)\\s|\\t)`, "g");

/** Splits "stem A. ... B. ... C. ... D. ..." (older papers add "E. ..."). */
function splitOptions(raw: string) {
  const txt = raw.replace(/[^\S\t]+/g, " ");
  // Search backwards from D: options come last, and a stem can contain "2.5 A." (amperes) or "Vitamin C.".
  const at: { start: number; text: number }[] = [];
  let before = txt.length;
  for (const label of ["D", "C", "B", "A"]) {
    let found: (typeof at)[number] | null = null;
    for (const m of txt.slice(0, before).matchAll(optionLabel(label))) found = { start: m.index + m[1].length, text: m.index + m[0].length };
    if (!found) return null;
    at.unshift(found);
    before = found.start;
  }
  const e = [...txt.slice(at[3].text).matchAll(optionLabel("E"))].at(-1);
  if (e) at.push({ start: at[3].text + e.index + e[1].length, text: at[3].text + e.index + e[0].length });
  const clean = (s: string) => s.replace(/\s+/g, " ").trim();
  return {
    stem: clean(txt.slice(0, at[0].start)),
    options: at.map((a, i) => ({ label: "ABCDE"[i], text: clean(txt.slice(a.text, at[i + 1]?.start ?? txt.length)) })),
  };
}

function parseKey(lines: string[]) {
  const text = lines.filter(keep).join(" ");
  const key = new Map<number, { label?: string; text: string; note?: string }>();
  // "12. B. text", "12. **B. text", "12. B – text", "12. B<tab>text", and sometimes just "12. text" with no letter.
  // The space after the letter is not consumed, so an entry with only a letter ("11. B. 12. D. 285°")
  // still ends at "12." instead of swallowing it.
  for (const m of text.matchAll(/(?:^|\s)(\d{1,2})\.\s+(?:\**([A-E])(?:\s*(?:\.+|[–-])(?=\s|$)|(?=\t)))?(.*?)(?=\s\d{1,2}\.\s|$)/g)) {
    const n = Number(m[1]);
    // Numbering starting again means the key has ended (a theory paper with no heading of its own follows).
    if (key.size && n <= Math.max(...key.keys())) break;
    const note = /\((Note:[^)]*)\)/i.exec(m[3])?.[1];
    key.set(n, { label: m[2], text: m[3].replace(/\(Note:[^)]*\)/i, "").trim(), note });
  }
  return key;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9⁰-⁹₀-₉]+/g, "");

// ---------------------------------------------------------------------------
// 3. Write draft papers and review lists
// ---------------------------------------------------------------------------

async function main() {
  const columns = values.columns === "1" ? 1 : values.columns === "2" ? 2 : undefined;
  const { pages } = /\.html?$/i.test(pdfPath) ? readHtmlPages(pdfPath) : await readPdfPages(pdfPath, { password: values.password, columns });
  if (values.dump) {
    console.log(pages[Number(values.dump) - 1].join("\n"));
    return;
  }
  const objectives = splitSections(pages).filter((s) => s.paperNo === 1);

  mkdirSync(values.out!, { recursive: true });
  const summary: string[] = [];

  for (const { year, ...s } of objectives.sort((a, b) => b.year - a.year)) {
    const review: string[] = [];
    const key = parseKey(s.answers);
    const questions: Question[] = [];

    for (const it of parseQuestions(s.questions)) {
      const flag = (note: string) => review.push(`Q${it.n}: ${note}`);
      const parts = splitOptions(it.raw);
      if (!parts) {
        flag(`could not find options A to D. Raw text: "${it.raw.replace(/\s+/g, " ").trim()}"`);
        continue;
      }
      const stem = [it.preamble, parts.stem].filter(Boolean).join(" ");
      const text = [it.instruction, stem].filter(Boolean).join("\n\n");
      const answer = key.get(it.n);
      // The letter the paper marks correct. When the key's letter and text disagree and the text is exactly
      // another option, the text wins: printing slips in the key are usually in the letter.
      let correct: string | undefined;
      if (!answer) flag("no answer in the answer key");
      else {
        const byText = answer.text ? parts.options.find((o) => norm(o.text) === norm(answer.text)) : undefined;
        if (!answer.label) {
          correct = byText?.label;
          flag(byText ? `answer key gives no letter, only "${answer.text}": marked option ${byText.label}.` : `answer key gives no letter, and "${answer.text}" matches no option.`);
        } else {
          correct = answer.label;
          const chosen = parts.options.find((o) => o.label === answer.label)!;
          if (answer.text && norm(chosen.text) !== norm(answer.text)) {
            if (byText) {
              correct = byText.label;
              flag(`answer key says ${answer.label}. "${answer.text}", but that text is option ${byText.label} (option ${answer.label} reads "${chosen.text}"): marked ${byText.label}. Check.`);
            } else flag(`answer key says ${answer.label}. "${answer.text}" but option ${answer.label} reads "${chosen.text}"`);
          }
        }
        if (answer.note) flag(`the answer key adds "${answer.note}". Check which option is right.`);
      }
      if (/diagram|figure|illustrat|shown below|graph|table below/i.test(text)) flag("mentions a diagram, which is not imported: add an image link or leave it out.");
      if (/�/.test(it.raw)) flag("contains an unreadable character");
      if (/underlined/i.test(text) && !/<u>/.test(stem)) flag("refers to an underlined word, but no underline was found: mark it as <u>word</u>.");

      questions.push({
        code: `${subject}-${year}-P1-${it.n}`,
        numberLabel: String(it.n),
        type: "mcq",
        text,
        marks: 1,
        options: parts.options.map((o) => ({ ...o, isCorrect: o.label === correct })),
        ...(answer?.note ? { modelAnswer: answer.note.replace(/^Note:\s*/i, "") } : {}),
      });
    }

    const expected = Math.max(0, ...key.keys());
    if (questions.length !== expected) review.push(`found ${questions.length} questions but the answer key has ${expected}`);

    const paper = {
      subjectCode: subject,
      year,
      paperNo: 1,
      durationMinutes: s.duration ?? null,
      instructions: questions.some((q) => q.options.length === 5)
        ? "Answer all the questions. Each question is followed by five options lettered A to E. Choose the correct option."
        : "Answer all the questions. Each question is followed by four options lettered A to D. Choose the correct option.",
      questions,
    };
    const base = path.join(values.out!, `${subject}-${year}-P1`);
    writeFileSync(`${base}.json`, JSON.stringify(paper, null, 2) + "\n");
    writeFileSync(`${base}.review.txt`, (review.length ? review : ["Nothing flagged."]).join("\n") + "\n");
    summary.push(`${year} Paper 1: ${questions.length} questions, ${review.length} to review -> ${base}.json`);
  }

  console.log(summary.length ? summary.join("\n") : "No objective sections found. Is the password right, and is this a PASCO Q&A book?");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
