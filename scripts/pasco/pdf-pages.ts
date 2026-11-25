/**
 * Shared PDF reading for the PASCO converters: turns each page into lines of text in reading order,
 * and recognises the section headings that start each paper.
 *
 * Two book layouts are known:
 *   - PASCO two-column books: "2021: INTEGRATED SCIENCE 1" headings, questions in two columns.
 *   - Single-column books (e.g. WordPub 2020-2025): "June 2025" then "COMPUTING 1" headings, one column,
 *     with marks such as "[3 marks]" right-aligned on the same line.
 * The column layout is detected per book (see `detectColumns`), or forced with `columns`.
 */
import { readFileSync } from "node:fs";
import { getDocument, OPS } from "pdfjs-dist/legacy/build/pdf.mjs";

type Frag = { x: number; y: number; w: number; size: number; str: string };

const SUPER: Record<string, string> = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "-": "⁻", "–": "⁻", "−": "⁻", "+": "⁺", n: "ⁿ" };
const SUB: Record<string, string> = { "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉" };
const mapChars = (s: string, table: Record<string, string>) => ([...s].every((c) => table[c]) ? [...s].map((c) => table[c]).join("") : null);

/**
 * Maths italic letters (𝑥, 𝑦, 𝑚: U+1D400 to U+1D7FF) become plain letters, so "2𝑥 − 4" matches
 * the answer key's "2x − 4" and reads normally on any device. Other characters are left alone
 * (full NFKC would also flatten ² and ½).
 */
export const plainMathLetters = (s: string) => s.replace(/[\u{1D400}-\u{1D7FF}]/gu, (c) => c.normalize("NFKC"));

/** Advert and footer lines printed on every page. */
export const isNoise = (s: string) => /Dial \*\d+\*\d+#|passco\.com\.gh|WordPub|Word Publishers|All rights reserved|Unauthori[sz]ed distribution|^(Top|Bottom) of Form$/i.test(s);

/** A thin filled rectangle or horizontal stroke, in page coordinates: underlines are drawn like this. */
type Rule = { x0: number; x1: number; y: number };

/**
 * Wraps the words of a fragment that sit just above an underline in `<u>...</u>`.
 * Character positions are estimated from the fragment width, which is close enough to pick whole words.
 */
function markUnderlines(f: Frag, rules: Rule[]): string {
  const near = rules.filter((r) => r.y <= f.y && r.y >= f.y - f.size * 0.4 && r.x1 > f.x && r.x0 < f.x + f.w);
  if (!near.length || !f.str.trim()) return f.str;
  const per = f.w / f.str.length;
  return f.str.replace(/\S+/g, (word, at: number) => {
    const centre = f.x + (at + word.length / 2) * per;
    return near.some((r) => centre >= r.x0 && centre <= r.x1) ? `<u>${word}</u>` : word;
  });
}

/** Gaps wider than this between fragments on one line become a tab: table cells (cloze options, "[3 marks]"). */
const CELL_GAP = 12;

/** Groups fragments into lines (same baseline, small script fragments attach to their line). */
function toLines(frags: Frag[], rules: Rule[] = []): string[] {
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
        // Some books fill the gap between table cells with one wide space instead of leaving it empty.
        if (!f.str.trim()) {
          if (out.trim()) out = out.trimEnd() + (f.w > CELL_GAP ? "\t" : " ");
          end = f.x + f.w;
          continue;
        }
        let s = f.str;
        let script: string | null = null;
        if (f.size < body * 0.85) {
          script = f.y > base + 1 ? mapChars(s, SUPER) : f.y < base - 0.5 ? mapChars(s, SUB) : null;
          if (script) s = script;
        }
        if (!script) s = markUnderlines(f, rules);
        if (out && f.x - end > CELL_GAP && out.trim()) out = out.trimEnd() + "\t";
        else if (out && f.x - end > 1.5 && !out.endsWith(" ") && !s.startsWith(" ")) out += " ";
        out += out.endsWith("\t") ? s.trimStart() : s;
        end = f.x + f.w;
      }
      return plainMathLetters(out)
        .replace(/[^\S\t]+/g, " ")
        .replace(/ *\t[\s]*/g, "\t")
        .replace(/<\/u>(\s*)<u>/g, "$1")
        .trim();
    })
    .filter((l) => l && !isNoise(l));
}

type RawPage = { frags: Frag[]; rules: Rule[]; mid: number };

/**
 * Keeps only rules that start and end on text of the line just above them. Table borders run from cell
 * edge to cell edge, past the text, so they are dropped.
 */
function underlinesOnly(rules: Rule[], frags: Frag[]): Rule[] {
  const above = (r: Rule, f: Frag) => r.y <= f.y && r.y >= f.y - f.size * 0.4 && f.str.trim();
  return rules.filter(
    (r) =>
      frags.some((f) => above(r, f) && r.x0 >= f.x - 3.5 && r.x0 <= f.x + f.w) &&
      frags.some((f) => above(r, f) && r.x1 >= f.x && r.x1 <= f.x + f.w + 3.5),
  );
}

/** Underline-shaped drawings on a page: filled rectangles under 1.5pt tall, and horizontal stroked lines. */
function findRules(fnArray: number[], argsArray: unknown[]): Rule[] {
  const rules: Rule[] = [];
  let ctm = [1, 0, 0, 1, 0, 0];
  const stack: number[][] = [];
  const at = (x: number, y: number) => [ctm[0] * x + ctm[2] * y + ctm[4], ctm[1] * x + ctm[3] * y + ctm[5]];
  for (let i = 0; i < fnArray.length; i++) {
    const fn = fnArray[i];
    if (fn === OPS.save) stack.push(ctm);
    else if (fn === OPS.restore) ctm = stack.pop() ?? [1, 0, 0, 1, 0, 0];
    else if (fn === OPS.transform) {
      const [a, b, c, d, e, f] = argsArray[i] as number[];
      ctm = [ctm[0] * a + ctm[2] * b, ctm[1] * a + ctm[3] * b, ctm[0] * c + ctm[2] * d, ctm[1] * c + ctm[3] * d, ctm[0] * e + ctm[2] * f + ctm[4], ctm[1] * e + ctm[3] * f + ctm[5]];
    } else if (fn === OPS.constructPath) {
      const next = fnArray[i + 1];
      const filled = next === OPS.fill || next === OPS.eoFill || next === OPS.fillStroke || next === OPS.eoFillStroke;
      const stroked = next === OPS.stroke || next === OPS.closeStroke;
      if (!filled && !stroked) continue;
      const [ops, coords] = argsArray[i] as [number[], number[]];
      let k = 0;
      let last: number[] | null = null;
      for (const op of ops) {
        if (op === OPS.rectangle) {
          const [x, y, w, h] = coords.slice(k, (k += 4));
          const [x0, y0] = at(x, y);
          const [x1, y1] = at(x + w, y + h);
          if (filled && Math.abs(y1 - y0) < 1.5 && Math.abs(x1 - x0) > 4) rules.push({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), y: Math.max(y0, y1) });
        } else if (op === OPS.moveTo) last = at(coords[k++], coords[k++]);
        else if (op === OPS.lineTo) {
          const p = at(coords[k++], coords[k++]);
          if (stroked && last && Math.abs(p[1] - last[1]) < 0.5 && Math.abs(p[0] - last[0]) > 4) {
            rules.push({ x0: Math.min(p[0], last[0]), x1: Math.max(p[0], last[0]), y: p[1] });
          }
          last = p;
        } else if (op === OPS.curveTo) k += 6;
        else if (op === OPS.curveTo2 || op === OPS.curveTo3) k += 4;
      }
    }
  }
  return rules;
}

/** A page is single-column when text runs across the centre line. Two-column pages never do. */
const crossesMiddle = (p: RawPage) => p.frags.filter((f) => f.x < p.mid - 20 && f.x + f.w > p.mid + 20).length >= 2;

/** One layout for the whole book: single column if a fair share of its pages are. */
function detectColumns(pages: RawPage[]): 1 | 2 {
  const single = pages.filter(crossesMiddle).length;
  return single >= pages.length * 0.25 ? 1 : 2;
}

export async function readPdfPages(pdfPath: string, opts: { password?: string; columns?: 1 | 2 } = {}) {
  const doc = await getDocument({ data: new Uint8Array(readFileSync(pdfPath)), password: opts.password, verbosity: 0 }).promise;
  const raw: RawPage[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const frags: Frag[] = [];
    for (const it of (await page.getTextContent()).items) {
      if (!("str" in it) || !it.str) continue;
      frags.push({ x: it.transform[4], y: it.transform[5], w: it.width, size: Math.abs(it.transform[0]) || it.height, str: it.str });
    }
    const ops = await page.getOperatorList();
    raw.push({ frags, rules: underlinesOnly(findRules(ops.fnArray, ops.argsArray), frags), mid: page.getViewport({ scale: 1 }).width / 2 });
  }
  const columns = opts.columns ?? detectColumns(raw);
  const pages = raw.map((p) =>
    columns === 1
      ? toLines(p.frags, p.rules)
      : [...toLines(p.frags.filter((f) => f.x < p.mid), p.rules), ...toLines(p.frags.filter((f) => f.x >= p.mid), p.rules)],
  );
  return { pages, columns };
}

// ---------------------------------------------------------------------------
// Section headings
// ---------------------------------------------------------------------------

const MONTHS = "January|February|March|April|May|June|July|August|September|October|November|December";
/** "2021: INTEGRATED SCIENCE 1". Some answer pages leave out the paper number. */
const PASCO_HEADING = /^(\d{4}): [A-Z ]+?(?: ([12]))?$/;
/** "June 2025" on its own line, followed by "COMPUTING 1". */
/** Some years had two sittings: "JUNE 2015 (FIRST SITTING)". */
const DATE_LINE = new RegExp(`^(?:(?:${MONTHS}) )?(\\d{4})(?:\\s*\\((FIRST|SECOND|1st|2nd) SITTING\\))?$`, "i");
const SUBJECT_LINE = /^[A-Z][A-Z &]+? ([12])$/;
/** Under a date line the subject can be in any case, and some books write "INTEGRATED SCIENCE - Paper 2". */
const SUBJECT_UNDER_DATE = /^[A-Za-z][A-Za-z &]+?(?: -)? (?:Paper )?([12])$/i;
/** Older books leave the paper number out of the heading ("1990" then "MATHEMATICS"). */
const SUBJECT_ONLY = /^[A-Z][A-Z &]{3,}$/;
const PAPER_WORDS = /OBJECTIVE|ESSAY|THEORY|PAPER [12]|ANSWERS|minutes|hours?/i;
const flat = (l: string) => l.replace(/\t/g, " ");

/** Lines that are part of a heading or page furniture, never question text. */
export const isHeadingLine = (raw: string) => {
  const l = flat(raw);
  return PASCO_HEADING.test(l) || DATE_LINE.test(l) || SUBJECT_LINE.test(l) || /^\d{1,3}$/.test(l);
};

export type SectionHead = { year: number; paperNo: 1 | 2; answers: boolean; duration?: number; secondSitting?: boolean };

/** The section a page starts, if its first lines are a paper heading. */
export function sectionHead(rawLines: string[]): SectionHead | null {
  const lines = rawLines.map(flat);
  const top = lines.slice(0, 6).join(" ");
  const answers = /\b(ANSWERS|SOLUTIONS)\b/.test(top);
  // "45 minutes", "1 Hour", "1 hour 25 minutes", "(1 ¼ hours)".
  const time = /(?:(\d+)(?: ?¼| ?½| ?¾)? hours?)?\s*(?:(\d+) minutes)?/i;
  const t = [...top.matchAll(new RegExp(time.source, "gi"))].find((m) => m[1] || m[2]);
  const frac = t ? (/¼/.test(t[0]) ? 15 : /½/.test(t[0]) ? 30 : /¾/.test(t[0]) ? 45 : 0) : 0;
  const duration = t ? Number(t[1] ?? 0) * 60 + frac + Number(t[2] ?? 0) : 0;
  const withDuration = (h: Omit<SectionHead, "duration">): SectionHead => (duration ? { ...h, duration } : h);

  const pasco = lines.slice(0, 3).map((l) => PASCO_HEADING.exec(l)).find(Boolean);
  if (pasco) {
    const paperNo = pasco[2] === "1" || (!pasco[2] && /OBJECTIVE/.test(top)) ? 1 : 2;
    return withDuration({ year: Number(pasco[1]), paperNo, answers });
  }
  const date = DATE_LINE.exec(lines[0] ?? "");
  const sitting = date && /^(SECOND|2nd)$/i.test(date[2] ?? "") ? { secondSitting: true } : {};
  const subject = SUBJECT_UNDER_DATE.exec(lines[1] ?? "");
  // "OBJECTIVE TEST" decides the paper: one book prints "RELIGIOUS AND MORAL EDUCATION 2" over an objective test.
  const kind = /OBJECTIVE/i.test(top) ? 1 : /ESSAY|THEORY/i.test(top) ? 2 : null;
  if (date && subject) return withDuration({ year: Number(date[1]), paperNo: kind ?? (subject[1] === "1" ? 1 : 2), answers, ...sitting });
  if (date && SUBJECT_ONLY.test(lines[1] ?? "") && PAPER_WORDS.test(lines.slice(2, 6).join(" "))) {
    return withDuration({ year: Number(date[1]), paperNo: /OBJECTIVE/i.test(top) ? 1 : 2, answers, ...sitting });
  }
  return null;
}

/** Splits a book into sections keyed by year and paper, each with its question pages and answer pages. */
export function splitSections(pages: string[][]) {
  type Section = { questions: string[]; answers: string[]; duration?: number };
  const sections = new Map<string, Section & { year: number; paperNo: 1 | 2 }>();
  let current: { key: string; answers: boolean } | null = null;
  for (const lines of pages) {
    const head = sectionHead(lines);
    // The portal holds one paper per year, so a second sitting is left out rather than mixed into the first.
    if (head?.secondSitting) {
      current = null;
      continue;
    }
    if (head) {
      const key = `${head.year}-P${head.paperNo}`;
      const s = sections.get(key) ?? { year: head.year, paperNo: head.paperNo, questions: [], answers: [] };
      if (head.duration && !head.answers) s.duration = head.duration;
      sections.set(key, s);
      current = { key, answers: head.answers };
    }
    if (current) sections.get(current.key)![current.answers ? "answers" : "questions"].push(...lines);
  }
  return [...sections.values()];
}
