/**
 * Convert the theory (Paper 2, "ESSAY") sections of a PASCO / WordPub Word book into draft paper files
 * in the BECE Prep import format, with marking points built from the book's marking scheme, plus a
 * review list of everything a person should look at.
 *
 * Usage:
 *   npm run pasco:theory -- <book.htm> --subject SOC [--year 2021] [--out private/papers/theory]
 *
 * The Word book is saved from Word as HTML first (see docs/PAST_PAPERS.md). Output goes to a git-ignored
 * folder: licensed content must never be committed. Papers import as drafts.
 *
 * How a sub-part such as 2(a)(i) becomes marking points:
 * - "State / List / Name four ..." with a list in the scheme ("[ANY FOUR]"): four points of equal marks.
 *   Each point accepts any item of the list, and the marker never credits the same item twice.
 * - "Highlight four ... (Write an essay ... to explain any four of these points)": for each point, 1 mark
 *   for naming it (marked automatically) and the rest for explaining it (marked by a teacher). Rules can
 *   tell whether a point is there, not whether it is explained well.
 * - "... with an example each": the same split, the example going to a teacher.
 * - Lists of examples by category ("Festivals: Aboakyer, Kundum, ..."): any one example earns the point.
 * - Calculations: the final answer must be exact ("50 km").
 * - Anything else (definitions, diagrams): one point marked by a teacher, with the scheme as model answer.
 *
 * Accepted answers must contain all their content words, so each scheme line also gives shorter forms:
 * without "e.g." tails, split at "/", and without leading words such as "Encouraging" or "There should be".
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { tokenize } from "../../src/lib/prep/grading/theory";
import { readHtmlPages } from "./word-html";

const SUBJECT_NAMES: Record<string, string> = {
  SOC: "SOCIAL STUDIES",
  RME: "RELIGIOUS AND MORAL EDUCATION",
  SCI: "INTEGRATED SCIENCE",
  MATH: "MATHEMATICS",
  COMP: "COMPUTING",
  ENG: "ENGLISH LANGUAGE",
};
const MONTH_YEAR = /^(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)\s+(\d{4})\s*$/i;
const ROMAN = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"];
const NUMBER_WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8 };

type Part = { num: string; letter?: string; roman?: string; text: string; marks?: number; section?: string };
type Point = { description: string; marks: number; strictness: "exact" | "meaning" | "rubric"; acceptedAlternatives: string[]; keyTerms: string[] };
type Question = { code: string; numberLabel: string; type: string; text: string; marks: number; markingPoints: Point[]; modelAnswer: string; items?: string[] };

const clean = (s: string) => s.replace(/\s+/g, " ").trim();
const label = (p: Pick<Part, "num" | "letter" | "roman">) => `${p.num}${p.letter ? `(${p.letter})` : ""}${p.roman ? `(${p.roman})` : ""}`;
const comparable = (s: string) => s.toLowerCase().replace(/<\/?u>/g, "").replace(/[^a-z0-9]+/g, "");

/** "1. (a)\t(i)\tState ..." -> its label parts and the rest. A bare "(i)" only counts where `romanOk`. */
function parseLabel(line: string) {
  const m = /^(?:(\d{1,2})\s*\.\s*)?(?:\(([a-h])\)\s*)?(?:\((i|ii|iii|iv|v|vi|vii|viii|ix|x)\)\s*)?(.*)$/i.exec(line.trim())!;
  const [, num, letter, roman, rest] = m;
  // "(i)" alone could be letter (i) or roman (i); BECE papers use letters a-h, so it is roman.
  return { num, letter: letter?.toLowerCase(), roman: roman?.toLowerCase(), rest: rest.trim(), labelled: !!(num || letter || roman) };
}

const MARKS = /\[\s*(\d+(?:\.\d+)?)\s*marks?\s*\]\s*$/i;

/** The lines of the essay paper for a year, and of its answers. */
function findSections(lines: string[], subject: string, year: number) {
  const name = SUBJECT_NAMES[subject] ?? subject;
  const heads: { at: number; answers: boolean }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const my = MONTH_YEAR.exec(lines[i].trim());
    if (!my || Number(my[2]) !== year) continue;
    const next = lines.slice(i + 1, i + 5).map((l) => l.trim().toUpperCase());
    if (!new RegExp(`^${name}\\s*(2|II|PAPER 2)\\b`).test(next[0] ?? "") || !next.slice(1).some((l) => l.startsWith("ESSAY"))) continue;
    heads.push({ at: i, answers: next.some((l) => /^(ANSWERS|SOLUTIONS|MARKING SCHEME)/.test(l)) });
  }
  const paper = heads.find((h) => !h.answers);
  const answers = heads.find((h) => h.answers);
  if (!paper || !answers) return null;
  const endOf = (from: number, stop: (l: string) => boolean) => {
    for (let i = from + 2; i < lines.length; i++) if (stop(lines[i].trim())) return i;
    return lines.length;
  };
  const paperEnd = endOf(paper.at, (l) => /^END OF (ESSAY|THEORY|PAPER)/i.test(l) || l === lines[answers.at].trim());
  const answersEnd = endOf(answers.at, (l) => MONTH_YEAR.test(l));
  return { paper: lines.slice(paper.at, paperEnd), answers: lines.slice(answers.at, answersEnd) };
}

/** Questions of the paper, with their sections, marks and any stems carried onto their sub-parts. */
function parsePaper(lines: string[]) {
  const parts: Part[] = [];
  const intro: string[] = [];
  let section: string | undefined;
  let cur: Part | undefined;
  let num = "";
  let letter: string | undefined;
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line) continue;
    if (/^SECTION\s+[A-Z0-9]+\b/i.test(line)) {
      const title = lines[i + 1]?.trim();
      section = clean(`${line}${title && !/^answer/i.test(title) ? `: ${title}` : ""}`);
      if (title && !/^answer/i.test(title)) i++;
      cur = undefined;
      continue;
    }
    if (/^answer (one|any|all|two|three)\b.*\b(section|questions?)\b/i.test(line) && !cur) continue;
    const marksOnly = /^\[\s*(\d+(?:\.\d+)?)\s*marks?\s*\]$/i.exec(line);
    if (marksOnly && cur) {
      cur.marks = Number(marksOnly[1]);
      continue;
    }
    const l = parseLabel(line);
    if (l.labelled && (l.num || num)) {
      if (l.num) {
        num = l.num;
        letter = undefined;
      }
      if (l.letter) letter = l.letter;
      cur = { num, letter: l.letter ?? (l.roman ? letter : undefined), roman: l.roman, text: "", section };
      parts.push(cur);
      line = l.rest;
    }
    if (!cur) {
      intro.push(line);
      continue;
    }
    const m = MARKS.exec(line);
    if (m) cur.marks = Number(m[1]);
    cur.text = clean(`${cur.text} ${line.replace(MARKS, "")}`);
  }
  // A part without marks followed by its own sub-parts is a stem: carry its text onto them.
  const out: Part[] = [];
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (p.marks !== undefined) {
      out.push(p);
      continue;
    }
    const children = parts.slice(i + 1).filter((c) => c.num === p.num && (!p.letter || c.letter === p.letter) && label(c).startsWith(label(p)) && c !== p);
    for (const c of children) if (p.text) c.text = `${p.text}\n\n${c.text}`;
  }
  return { parts: out.filter((p) => p.text), intro };
}

/** The scheme lines under each part's heading in the answers. */
function parseAnswers(lines: string[], parts: Part[]) {
  const byLabel = new Map<string, string[]>();
  let cur: string[] | undefined;
  let num = "";
  let letter: string | undefined;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const l = parseLabel(line);
    if (l.labelled) {
      const n = l.num ?? num;
      const lt = l.letter ?? (l.num ? undefined : letter);
      const key = label({ num: n, letter: lt, roman: l.roman });
      const part = parts.find((p) => label(p) === key);
      // A heading repeats the question; a scheme item that happens to start "(i)" does not.
      const head = l.rest.replace(MARKS, "");
      if (part && comparable(head).length > 8 && comparable(part.text).includes(comparable(head).slice(0, 40))) {
        num = n;
        letter = lt;
        cur = [];
        byLabel.set(key, cur);
        continue;
      }
      if (l.num || l.letter) {
        // A stem heading ("1. (a) Figure 1(a) ...") without a part of its own.
        const stem = parts.find((p) => p.num === n && (!lt || p.letter === lt));
        if (stem && comparable(stem.text).includes(comparable(head).slice(0, 30)) && comparable(head).length > 8) {
          num = n;
          letter = lt;
          cur = undefined;
          continue;
        }
      }
    }
    if (/^(SECTION\s+[A-Z0-9]+|answer one question only)/i.test(line)) continue;
    if (/^\[\s*\d+(?:\.\d+)?\s*marks?\s*\]$/i.test(line)) continue;
    cur?.push(line.replace(MARKS, "").trim());
  }
  return byLabel;
}

const BULLET = /^(?:[§·•▪●○◦\-–*?]|\((?:[ivx]+|[a-z])\)|(?:[ivx]+|[a-z])[.)])\s*/i;
const LEADING = [
  /^(there (should|must) be|there is)\s+(the\s+)?(existence of\s+)?/i,
  /^(it|this)\s+(can|may|will|helps?\s+to)\s+/i,
  /^(an individual|people|individuals|the youth|parents|government|ngo[’']?s|some ngo[’']?s)\s+(can|may|must|should|will)\s+(get\s+)?/i,
  /^(can|may|must|should|will|to)\s+/i,
  /^(as an?|as|through|by|having|the|a|an|easy|adequate|effective)\s+/i,
  /^(provision|improvement|use|promotion|encouragement|enforcement|avoidance|existence|acquisition|cultivation|supply|training|employment)\s+of\s+(the\s+)?/i,
];
const GERUND = /^[a-z]+ing\s+/i;

/** Short forms of a scheme line that a student's answer can be matched against. */
export function alternativesFor(line: string): string[] {
  const out = new Set<string>();
  const add = (s: string) => {
    const t = clean(s.replace(/[;:,.]+$/, "").replace(/\betc\.?$/i, "")).replace(/[;:,.]+$/, "");
    if (t && /[a-z]/i.test(t) && t.split(" ").length <= 12) out.add(t);
  };
  const head = line
    .replace(/\s*[,(]?\s*\b(e\.?\s?g\.?|eg|for example|such as|i\.e\.)[,:]?(\s.*)?$/i, "")
    .replace(/\s+[–—-]\s+.*$/, "")
    .replace(/\s*\(.*?\)\s*/g, " ");
  for (const variant of [head, ...head.split(/\s*\/\s*/)]) {
    add(variant);
    let v = clean(variant);
    for (let round = 0; round < 3; round++) {
      const before = v;
      for (const r of LEADING) v = v.replace(r, "");
      if (v === before) break;
    }
    add(v);
    const g = v.replace(GERUND, "");
    if (g !== v && g.split(" ").length >= 2) add(g);
  }
  // Drop forms that are only filler ("the", "it").
  return [...out].filter((a) => a.replace(/\b(the|a|an|of|and|or|to|in|on)\b/gi, "").trim().length >= 3);
}

function pointCount(text: string, any?: number) {
  if (any) return any;
  const m = /\b(one|two|three|four|five|six|seven|eight)\b/i.exec(text.replace(/\(\w+\)/g, ""));
  return m ? NUMBER_WORDS[m[1].toLowerCase()] : undefined;
}

function buildQuestion(subject: string, year: number, p: Part, scheme: string[] | undefined, review: string[]): Question | null {
  const numberLabel = label(p);
  const code = `${subject}-${year}-P2-${p.num}${p.letter ?? ""}${p.roman ? ROMAN.indexOf(p.roman) + 1 : ""}`;
  const marks = p.marks!;
  const flag = (msg: string) => review.push(`${numberLabel}: ${msg}`);
  if (!scheme?.length) {
    flag("no marking scheme found in the answers; left out.");
    return null;
  }
  const any = /\[\s*ANY\s+(\w+)\s*\]/i.exec(scheme.join(" "));
  const essay = scheme.some((l) => /write an essay|explain any|<u>explain<\/u>/i.test(l));
  const lines = scheme.filter((l) => !/^\[\s*ANY\s+\w+\s*\]$/i.test(l) && !/write an essay|^\(.*points?\)$/i.test(l));
  const images = lines.filter((l) => /^\[image:/.test(l));
  const textLines = lines.filter((l) => !/^\[image:/.test(l));
  const bullets = textLines.filter((l) => BULLET.test(l)).map((l) => clean(l.replace(BULLET, "")));
  const k = pointCount(p.text, any ? NUMBER_WORDS[any[1].toLowerCase()] : undefined);
  if (images.length) flag(`the scheme has ${images.length} picture(s), not shown in the model answer.`);
  const listAnswer = (intro: string) => `${intro}\n${bullets.map((b) => `- ${b}`).join("\n")}`;

  const rubric = (type: string, why: string): Question => {
    flag(`marked by a teacher (${why}).`);
    return {
      code,
      numberLabel,
      type,
      text: p.text,
      marks,
      markingPoints: [{ description: "As in the marking scheme", marks, strictness: "rubric", acceptedAlternatives: [], keyTerms: [] }],
      modelAnswer: bullets.length ? listAnswer("The marking scheme accepts:") : textLines.join("\n"),
    };
  };

  // Calculation: the last "= value" line is the answer.
  if (/\bcalculate|\bwork out|\bfind the value|\bdetermine\b/i.test(p.text) && textLines.some((l) => l.includes("="))) {
    const last = textLines.filter((l) => l.includes("=")).at(-1)!.split("=").at(-1)!.trim();
    if (!last) return rubric("calculation", "no final answer found");
    flag(`calculation: the final answer must be "${last}".`);
    return {
      code,
      numberLabel,
      type: "calculation",
      text: p.text,
      marks,
      markingPoints: [{ description: `The answer: ${last}`, marks, strictness: "exact", acceptedAlternatives: [last, last.replace(/\s+/g, "")].filter((v, i, a) => a.indexOf(v) === i), keyTerms: [] }],
      modelAnswer: textLines.join("\n"),
    };
  }
  if (!bullets.length) return rubric("short", "the answer is a paragraph, not a list");
  if (!k) return rubric("short", "the question doesn't say how many points");
  if (bullets.length < k) return rubric("short", `the scheme lists ${bullets.length} items for ${k} points`);

  // "Festivals: Aboakyer, Kundum, ..." -> any example earns the point.
  const categorised = bullets.filter((b) => /^[^:]{2,40}:\s*\S/.test(b)).length >= Math.ceil(bullets.length / 2);
  // One group per scheme item ("a | b | c"), so an item earns a mark once however it is worded.
  const groups = bullets.map((b) =>
    categorised
      ? [...new Set(b.replace(/^[^:]*:\s*/, "").split(/\s*[,/;]\s*/).map((x) => clean(x.replace(/\betc\.?/i, ""))))].filter((x) => x.length > 1)
      : alternativesFor(b),
  );
  const alternatives = groups.filter((g) => g.length).map((g) => g.join(" | "));

  const per = marks / k;
  const needsExplaining = essay || (/\bexample\b/i.test(p.text) && !categorised);
  const what = categorised ? "an example" : "a point";
  const points: Point[] = [];
  if (needsExplaining && per > 1 && Number.isInteger(per)) {
    for (let i = 1; i <= k; i++) points.push({ description: `Names ${what} from the scheme (${i} of ${k})`, marks: 1, strictness: "meaning", acceptedAlternatives: alternatives, keyTerms: [] });
    for (let i = 1; i <= k; i++)
      points.push({ description: essay ? `Explains point ${i} in a paragraph` : `Gives a correct example for point ${i}`, marks: per - 1, strictness: "rubric", acceptedAlternatives: [], keyTerms: [] });
    flag(`${k} points: 1 mark each for naming (automatic), ${per - 1} each for ${essay ? "explaining" : "the example"} (teacher).`);
  } else if (Number.isInteger(per * 2)) {
    for (let i = 1; i <= k; i++) points.push({ description: `Gives ${what} from the scheme (${i} of ${k})`, marks: per, strictness: "meaning", acceptedAlternatives: alternatives, keyTerms: [] });
  } else {
    return rubric("short", `${marks} marks don't divide into ${k} points`);
  }
  return {
    code,
    numberLabel,
    type: essay ? "essay" : "short",
    text: p.text,
    marks,
    markingPoints: points,
    modelAnswer: listAnswer(essay ? `Explain any ${k} of these points, a paragraph each:` : `Any ${k} of:`),
    items: bullets.filter((_, i) => groups[i].length),
  };
}

/**
 * Hand-checked additions, kept in <out>/extras.json (private: they quote the scheme) so they survive re-converting.
 * `accept`: more accepted answers for the automatic points ("coat of arms" where the scheme says "The Ghana Coat
 * Of Arms"). `markingPoints`: replaces the points outright (e.g. a definition split into its ideas).
 */
type Extra = { accept?: string[]; markingPoints?: Point[]; note?: string };

function applyExtras(q: Question, extra: Extra | undefined, review: string[]): Question {
  if (!extra) return q;
  if (extra.markingPoints) {
    review.push(`${q.numberLabel}: marking points set by hand${extra.note ? ` (${extra.note})` : ""}.`);
    return { ...q, markingPoints: extra.markingPoints.map((p) => ({ ...p, acceptedAlternatives: p.acceptedAlternatives ?? [], keyTerms: p.keyTerms ?? [] })) };
  }
  const auto = q.markingPoints.find((p) => p.strictness !== "rubric");
  if (!auto) return q;
  // Each extra joins the scheme item it shares most words with, so it can't earn a second mark for that item.
  const groups = auto.acceptedAlternatives.map((g) => g.split(/\s+\|\s+/));
  const own: string[][] = [];
  for (const phrase of extra.accept ?? []) {
    const words = stems(phrase);
    let best = -1;
    let bestShared = 0;
    groups.forEach((g, i) => {
      const shared = [...words].filter((w) => stems(`${g.join(" ")} ${q.items?.[i] ?? ""}`).has(w)).length;
      if (shared > bestShared) [best, bestShared] = [i, shared];
    });
    const wordings = phrase.split(/\s+\|\s+/);
    if (best >= 0) groups[best].push(...wordings);
    else own.push(wordings);
  }
  const merged = [...groups, ...own].map((g) => [...new Set(g)].join(" | "));
  return { ...q, markingPoints: q.markingPoints.map((p) => (p.strictness === "rubric" ? p : { ...p, acceptedAlternatives: merged })) };
}

const FILLER = new Set("the and for with from that this their them they can may must should will have has into such also other some more".split(" "));
/** The content words of a phrase, stemmed the way the marker does. */
const stems = (s: string) => new Set(tokenize(s).filter((t) => t.word.length > 2 && !FILLER.has(t.word)).map((t) => t.stem));

function duration(intro: string[]) {
  const t = intro.join(" ");
  const h = /(\d+)\s*hours?/i.exec(t);
  const m = /(\d+)\s*min/i.exec(t);
  const total = (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0);
  return total || null;
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { subject: { type: "string" }, year: { type: "string" }, out: { type: "string", default: "private/papers/theory" } },
  });
  const book = positionals[0];
  if (!book || !values.subject) throw new Error("Usage: npm run pasco:theory -- <book.htm> --subject SOC [--year 2021] [--out private/papers/theory]");
  const subject = values.subject.toUpperCase();
  const lines = readHtmlPages(book).pages.flat();
  const years = values.year
    ? [Number(values.year)]
    : [...new Set(lines.map((l) => MONTH_YEAR.exec(l.trim())?.[2]).filter(Boolean).map(Number))].sort((a, b) => b - a);
  mkdirSync(values.out!, { recursive: true });
  const extrasFile = path.join(values.out!, "extras.json");
  const extras: Record<string, Extra> = existsSync(extrasFile) ? JSON.parse(readFileSync(extrasFile, "utf8")) : {};

  for (const year of years) {
    const found = findSections(lines, subject, year);
    if (!found) {
      if (values.year) console.log(`${year}: no essay paper with answers found.`);
      continue;
    }
    const { parts, intro } = parsePaper(found.paper);
    const answers = parseAnswers(found.answers, parts);
    const review: string[] = [];
    const questions = parts
      .filter((p) => {
        if (p.marks === undefined) review.push(`${label(p)}: no marks printed; left out.`);
        return p.marks !== undefined;
      })
      .map((p) => buildQuestion(subject, year, p, answers.get(label(p)), review))
      .filter((q): q is Question => !!q)
      .map((q) => applyExtras(q, extras[q.code], review));
    const sections = [...new Set(parts.map((p) => p.section).filter(Boolean))];
    const header = intro.filter((l) => !MONTH_YEAR.test(l) && !/^(ESSAY|\d+\s*hours?|.*\b2$)/i.test(l) && !l.toUpperCase().startsWith(SUBJECT_NAMES[subject] ?? subject));
    const paper = {
      subjectCode: subject,
      year,
      paperNo: 2,
      durationMinutes: duration(intro),
      instructions: [
        ...header,
        sections.length ? `Sections: ${sections.join("; ")}.` : "",
        "Practice: every question of the paper is here. Answer the ones the paper asks for. Points you name are marked straight away; explanations and examples are marked by your teacher.",
      ]
        .filter(Boolean)
        .join("\n"),
      questions: questions.map((q) => ({ ...q, items: undefined })),
    };
    const base = path.join(values.out!, `${subject}-${year}-P2`);
    writeFileSync(`${base}.json`, JSON.stringify(paper, null, 2) + "\n");
    writeFileSync(`${base}.review.txt`, `${subject} ${year} Paper 2: ${questions.length} questions from ${parts.length} parts\n\n${review.join("\n")}\n`);
    const marks = questions.reduce((s, q) => s + q.marks, 0);
    console.log(`${subject}-${year}-P2: ${questions.length} questions, ${marks} marks, ${review.length} review notes -> ${base}.json`);
  }
}

if (process.argv[1] && /extract-theory/.test(process.argv[1])) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
