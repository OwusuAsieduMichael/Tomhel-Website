/**
 * Picks the converted paper files to import, applies the hand-checked answer-key corrections,
 * holds back questions that need a picture, and validates every paper with the importer's own rules.
 *
 * Usage: npx tsx scripts/pasco/select-papers.ts
 *   reads  private/papers/{comp,eng,soc,sci,2026,old}/*.json  (from npm run pasco:objectives)
 *   writes private/papers/ready/*.json, then: npm run prep:import -- private/papers/ready/*.json
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describeIssues, paperSchema } from "../../src/lib/prep/admin/question-bank";

const root = "private/papers";
const out = path.join(root, "ready");
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

/** Newer editions win: the 2020-2025 books replace the old books' 2020 and 2021. */
const sources: { dir: string; keep: (subject: string, year: number) => boolean }[] = [
  { dir: "comp", keep: () => true },
  { dir: "eng", keep: () => true },
  { dir: "soc", keep: () => true },
  { dir: "sci", keep: () => true },
  { dir: "math", keep: () => true },
  { dir: "2026", keep: (s) => s !== "MATH" },
  { dir: "old", keep: (s, y) => !(["ENG", "SOC", "COMP", "SCI"].includes(s) && y >= 2020) },
];
/** Questions that need a picture the text does not carry (see review notes). */
const needsPicture = new Set(["COMP-2024-P1-8", "SOC-2021-P1-17", "SCI-2022-P1-2", "SCI-2022-P1-3", "SCI-2022-P1-18"]);

/** Answer-key misprints, checked by hand. Applied here so they survive re-converting a book. */
type Fix = { answer?: string; options?: Record<string, string>; textBefore?: string; modelAnswer?: string; why: string };
const corrections: Record<string, Fix> = {
  "SCI-2015-P1-34": { answer: "A", why: "N₂O is nitrogen(I) oxide; the book's key says D." },
  "SCI-2021-P1-23": { options: { B: "₁₇Cl" }, why: "Printing error: the key gives ₁₇Cl, the option read ₁₇Ca." },
  "SCI-2021-P1-24": {
    answer: "D",
    modelAnswer: "The Sun is at the centre of the solar system. (The printed key gives Mars, which is a slip.)",
    why: "The key says Mars and adds that the body at the centre is the Sun.",
  },
};

const held: string[] = [];
const dropped: string[] = [];
let papers = 0;
let questions = 0;
for (const { dir, keep } of sources) {
  for (const f of readdirSync(path.join(root, dir)).filter((f) => f.endsWith(".json"))) {
    const p = JSON.parse(readFileSync(path.join(root, dir, f), "utf8"));
    if (!keep(p.subjectCode, p.year)) continue;
    const hasImage = (q: { text: string; options?: { text: string }[] }) => /\[image:/.test(q.text) || (q.options ?? []).some((o) => /\[image:/.test(o.text));
    type Q = { code: string; numberLabel: string; text: string; options: { label: string; text: string; isCorrect: boolean }[] };
    // Maths from a PDF: fractions are drawn as numerator, line, denominator, and come out wrong as text
    // ("11 <u>3</u>"). Only questions that converted cleanly go in; the rest wait to be shown as pictures.
    const reviewFile = path.join(root, dir, f.replace(/\.json$/, ".review.txt"));
    const flagged = p.subjectCode === "MATH" && existsSync(reviewFile)
      ? new Set([...readFileSync(reviewFile, "utf8").matchAll(/^Q(\d+):/gm)].map((m) => m[1]))
      : new Set<string>();
    const unclearMaths = (q: Q) =>
      p.subjectCode === "MATH" &&
      (flagged.has(q.numberLabel) || [q.text, ...q.options.map((o) => o.text)].some((t) => /<u>|[₀-₉⁰-⁹]\s|\s[a-z]$/.test(t)));
    const kept = p.questions.filter((q: Q) => {
      if (needsPicture.has(q.code) || hasImage(q) || unclearMaths(q)) {
        held.push(q.code);
        return false;
      }
      const fix = corrections[q.code];
      if (fix?.options) q.options = q.options.map((o) => ({ ...o, text: fix.options![o.label] ?? o.text }));
      if (fix?.answer) q.options = q.options.map((o) => ({ ...o, isCorrect: o.label === fix.answer }));
      if (fix?.textBefore) q.text = q.text.replace(/^(Use the information[^\n]*\n\n)?/, `$1${fix.textBefore} `);
      if (fix?.modelAnswer) (q as Q & { modelAnswer?: string }).modelAnswer = fix.modelAnswer;
      // No single right answer in the key (e.g. "C and D"): leave it out rather than guess.
      if (q.options.filter((o) => o.isCorrect).length !== 1) {
        dropped.push(q.code);
        return false;
      }
      return true;
    });
    if (!kept.length) continue;
    const paper = { ...p, questions: kept };
    const parsed = paperSchema.safeParse(paper);
    if (!parsed.success) {
      console.log(`✗ ${dir}/${f}`);
      for (const issue of describeIssues(parsed.error, paper)) console.log("   -", issue);
      continue;
    }
    writeFileSync(path.join(out, f), JSON.stringify(paper, null, 2) + "\n");
    papers++;
    questions += kept.length;
  }
}
writeFileSync(path.join(root, "held-for-pictures.txt"), held.join("\n") + "\n");
console.log(`${papers} papers, ${questions} questions ready in ${out}; ${held.length} picture questions held back.`);
if (dropped.length) console.log(`Left out, no single correct answer in the key: ${dropped.join(", ")}`);
