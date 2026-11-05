/**
 * Convert the objective (Paper 1) sections of a PASCO "BECE Past Questions & Answers" PDF into
 * draft paper files in the BECE Prep import format, plus a review list of anything that needs a human eye.
 *
 * Usage:
 *   npm run pasco:objectives -- <pdf> --subject SCI [--password 1234] [--out private/papers]
 *
 * Output goes to a git-ignored folder: licensed content must never be committed (the repo is public).
 * Then: check the review list, fix the JSON if needed, and import it on Admin > Questions.
 * Papers arrive as drafts, so students see nothing until an admin approves them.
 *
 * How it works:
 *   1. PDF.js reads every text fragment with its position and size. Fragments are split into the left and
 *      right column by the page's centre line, then rebuilt into lines top to bottom.
 *   2. Small raised/lowered fragments become real superscripts and subscripts (m s⁻², H₂O).
 *   3. Sections are found by their headings: "<year>: <SUBJECT> 1 / OBJECTIVE TEST" and the matching "ANSWERS" page.
 *   4. Questions ("12. ...") and options ("A. ...") are parsed; the answer key ("12. B. ...") marks the correct option.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

type Option = { label: string; text: string; isCorrect: boolean };
type Question = { code: string; numberLabel: string; type: "mcq"; text: string; marks: number; options: Option[]; modelAnswer?: string };

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    subject: { type: "string" },
    password: { type: "string" },
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
// 1. Lines of text per page, left column then right column
// ---------------------------------------------------------------------------

type Frag = { x: number; y: number; w: number; size: number; str: string };

const SUPER: Record<string, string> = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "-": "⁻", "–": "⁻", "−": "⁻", "+": "⁺", n: "ⁿ" };
const SUB: Record<string, string> = { "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉" };
const mapChars = (s: string, table: Record<string, string>) => ([...s].every((c) => table[c]) ? [...s].map((c) => table[c]).join("") : null);

const isNoise = (s: string) => /Dial \*\d+\*\d+#|passco\.com\.gh/i.test(s);

/** Groups fragments into lines (same baseline, small script fragments attach to their line). */
function toLines(frags: Frag[]): string[] {
  const sorted = [...frags].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: Frag[][] = [];
  for (const f of sorted) {
    const line = lines.find((l) => Math.abs(l[0].y - f.y) <= (f.size < l[0].size || l[0].size < f.size ? 6 : 2));
    if (line) line.push(f);
    else lines.push([f]);
  }
  return lines
    .sort((a, b) => b[0].y - a[0].y)
    .map((line) => {
      const body = Math.max(...line.map((f) => f.size));
      const base = line.find((f) => f.size === body)!.y;
      let out = "";
      let end = -Infinity;
      for (const f of line.sort((a, b) => a.x - b.x)) {
        let s = f.str;
        if (f.size < body * 0.85) {
          const script = f.y > base + 1 ? mapChars(s, SUPER) : f.y < base - 0.5 ? mapChars(s, SUB) : null;
          if (script) s = script;
        }
        if (out && f.x - end > 1.5 && !out.endsWith(" ") && !s.startsWith(" ")) out += " ";
        out += s;
        end = f.x + f.w;
      }
      return out.replace(/\s+/g, " ").trim();
    })
    .filter((l) => l && !isNoise(l));
}

async function readPages(): Promise<string[][]> {
  const doc = await getDocument({ data: new Uint8Array(readFileSync(pdfPath)), password: values.password, verbosity: 0 }).promise;
  const pages: string[][] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const mid = page.getViewport({ scale: 1 }).width / 2;
    const frags: Frag[] = [];
    for (const it of (await page.getTextContent()).items) {
      if (!("str" in it) || !it.str) continue;
      frags.push({ x: it.transform[4], y: it.transform[5], w: it.width, size: Math.abs(it.transform[0]) || it.height, str: it.str });
    }
    pages.push([...toLines(frags.filter((f) => f.x < mid)), ...toLines(frags.filter((f) => f.x >= mid))]);
  }
  return pages;
}

// ---------------------------------------------------------------------------
// 2. Parse
// ---------------------------------------------------------------------------

/** "2021: INTEGRATED SCIENCE 1". Some answer pages leave out the paper number. */
const HEADING = /^(\d{4}): [A-Z ]+?(?: ([12]))?$/;
const PAGE_NUMBER = /^\d{1,3}$/;
const SKIP = /^(OBJECTIVE TEST|ANSWERS|Answer all the questions|Do all rough work|END OF PAPER|\d+ minutes)/i;

function parseQuestions(lines: string[]) {
  const body = lines.filter((l) => !SKIP.test(l) && !HEADING.test(l) && !PAGE_NUMBER.test(l)).join("\n");
  const starts: { n: number; at: number; textAt: number }[] = [];
  for (const m of body.matchAll(/(?:^|\n)(\d{1,2})\.\s/g)) starts.push({ n: Number(m[1]), at: m.index, textAt: m.index + m[0].length });
  // Keep only the sequence 1, 2, 3, ... (ignores numbers inside text).
  const seq: typeof starts = [];
  for (const s of starts) if (s.n === (seq.at(-1)?.n ?? 0) + 1) seq.push(s);
  const items = seq.map((s, i) => ({ n: s.n, raw: body.slice(s.textAt, seq[i + 1]?.at ?? body.length), preamble: "" }));
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
  return items;
}

function splitOptions(raw: string) {
  const flat = raw.replace(/\s+/g, " ");
  // Search backwards from D: options come last, and a stem can contain "2.5 A." (amperes) or "Vitamin C.".
  const at: number[] = [];
  let before = flat.length;
  for (const label of ["D", "C", "B", "A"]) {
    let found = -1;
    for (const m of flat.slice(0, before).matchAll(new RegExp(`(^|\\s)${label}\\.\\s`, "g"))) found = m.index + m[1].length;
    if (found === -1) return null;
    at.unshift(found);
    before = found;
  }
  return {
    stem: flat.slice(0, at[0]).trim(),
    options: ["A", "B", "C", "D"].map((label, i) => ({ label, text: flat.slice(at[i] + 2, at[i + 1] ?? flat.length).trim() })),
  };
}

function parseKey(lines: string[]) {
  const text = lines.filter((l) => !SKIP.test(l) && !HEADING.test(l) && !PAGE_NUMBER.test(l)).join(" ");
  const key = new Map<number, { label: string; text: string; note?: string }>();
  for (const m of text.matchAll(/(?:^|\s)(\d{1,2})\.\s+([A-D])\.+\s(.*?)(?=\s\d{1,2}\.\s+[A-D][.\s]|$)/g)) {
    const note = /\((Note:[^)]*)\)/i.exec(m[3])?.[1];
    key.set(Number(m[1]), { label: m[2], text: m[3].replace(/\(Note:[^)]*\)/i, "").trim(), note });
  }
  return key;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9⁰-⁹₀-₉]+/g, "");

// ---------------------------------------------------------------------------
// 3. Write draft papers and review lists
// ---------------------------------------------------------------------------

async function main() {
  const pages = await readPages();
  if (values.dump) {
    console.log(pages[Number(values.dump) - 1].join("\n"));
    return;
  }
  type Section = { questions: string[]; answers: string[]; duration?: number };
  const sections = new Map<number, Section>();
  let current: { year: number; kind: "questions" | "answers" } | null = null;

  for (const lines of pages) {
    const top = lines.slice(0, 4).join(" ");
    const head = lines.slice(0, 3).map((l) => HEADING.exec(l)).find(Boolean);
    if (head) {
      const objective = head[2] === "1" || (!head[2] && /OBJECTIVE/.test(top));
      current = objective ? { year: Number(head[1]), kind: /ANSWERS/.test(top) ? "answers" : "questions" } : null;
      if (current) {
        const s = sections.get(current.year) ?? { questions: [], answers: [] };
        const d = /(\d+) minutes/.exec(top);
        if (d) s.duration = Number(d[1]);
        sections.set(current.year, s);
      }
    }
    if (current) sections.get(current.year)![current.kind].push(...lines);
  }

  mkdirSync(values.out!, { recursive: true });
  const summary: string[] = [];

  for (const [year, s] of [...sections.entries()].sort((a, b) => b[0] - a[0])) {
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
      const text = [it.preamble, parts.stem].filter(Boolean).join(" ");
      const answer = key.get(it.n);
      if (!answer) flag("no answer in the answer key");
      else {
        const chosen = parts.options.find((o) => o.label === answer.label)!;
        if (answer.text && norm(chosen.text) !== norm(answer.text)) {
          flag(`answer key says ${answer.label}. "${answer.text}" but option ${answer.label} reads "${chosen.text}"`);
        }
        if (answer.note) flag(`the answer key adds "${answer.note}". Check which option is right.`);
      }
      if (/diagram|figure|illustrat|shown below|graph|table below/i.test(text)) flag("mentions a diagram, which is not imported: add an image link or leave it out.");
      if (/�/.test(it.raw)) flag("contains an unreadable character");

      questions.push({
        code: `${subject}-${year}-P1-${it.n}`,
        numberLabel: String(it.n),
        type: "mcq",
        text,
        marks: 1,
        options: parts.options.map((o) => ({ ...o, isCorrect: o.label === answer?.label })),
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
      instructions: "Answer all the questions. Each question is followed by four options lettered A to D. Choose the correct option.",
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
