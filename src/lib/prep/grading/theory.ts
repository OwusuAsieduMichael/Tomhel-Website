/**
 * Point-by-point marking of written answers against a marking scheme. Deterministic: no AI.
 *
 * Each marking point is checked against the student's answer:
 * - Key terms must be present and correctly spelt. A near miss ("chlorophyl") is flagged as misspelt, no mark.
 * - Accepted answers ("also accept") and the point's own description are matched by their content words,
 *   in any order, close together. Inflections count as the same word (traps / trapped).
 * - strictness "exact": spelling of every matched word counts. "meaning": other words may be misspelt.
 *   "rubric": can't be decided by rules, so the point goes to a teacher.
 * - A piece of the answer earns at most one point, so "State two ..." needs two different things.
 *
 * Not yet detected: wrong statements (e.g. "stored as protein"). That needs the AI marking step.
 */

export type MarkingPoint = {
  description: string;
  marks: number;
  strictness: "exact" | "key_term" | "meaning" | "rubric";
  acceptedAlternatives: string[];
  keyTerms: string[];
};

export type PointStatus = "awarded" | "misspelt" | "missing" | "review";

export type PointResult = {
  description: string;
  marks: number;
  awarded: number;
  status: PointStatus;
  /** The student's words that earned the point. */
  found?: string;
  note?: string;
};

export type Highlight = { start: number; end: number; kind: "awarded" | "misspelt" | "incorrect" };

export type TheoryResult = {
  awarded: number;
  marks: number;
  points: PointResult[];
  highlights: Highlight[];
  /** Some points need a teacher's judgement; `awarded` covers only the points marked here. */
  needsReview: boolean;
};

type Token = { word: string; stem: string; start: number; end: number; index: number };

const STOPWORDS = new Set(
  "a an the of to in on at by for from with and or is are was were be been it its this that these those as into their they them which who whom also so than then there when where while can could will would should may might must has have had do does did".split(
    " ",
  ),
);

function normalise(s: string) {
  return s.normalize("NFKC").toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

/** Crude English stemmer: enough to treat traps/trapped/trapping and acid/acids as the same word. */
function stem(w: string) {
  if (w.length <= 4 || /\d/.test(w)) return w;
  const suffix = /(ing|edly|ed|ies|es|ly|(?<!s)s)$/.exec(w)?.[1];
  if (!suffix) return w;
  const root = w.slice(0, -suffix.length) + (suffix === "ies" ? "y" : "");
  // trapped -> trapp -> trap. Only after a suffix: "chlorophyll" itself must keep its double l.
  return root.length >= 3 ? root.replace(/(.)\1$/, "$1") : w;
}

export function tokenize(text: string): Token[] {
  const out: Token[] = [];
  // A number is its own token, so "50cm2" reads as "50" "cm2". Words keep their digits (H2O, cm2).
  for (const m of text.matchAll(/\d+(?:[.,]\d+)?|\p{L}[\p{L}\p{N}]*(?:['’]\p{L}+)?/gu)) {
    const word = normalise(m[0]);
    out.push({ word, stem: stem(word), start: m.index, end: m.index + m[0].length, index: out.length });
  }
  return out;
}

const content = (phrase: string) => tokenize(phrase).filter((t) => !STOPWORDS.has(t.word));

/** Damerau-Levenshtein distance, capped (returns cap + 1 when larger). */
function distance(a: string, b: string, cap: number) {
  if (Math.abs(a.length - b.length) > cap) return cap + 1;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

type WordMatch = "exact" | "misspelt" | null;

function compare(target: Token, candidate: Token): WordMatch {
  if (target.word === candidate.word || target.stem === candidate.stem) return "exact";
  if (/\d/.test(target.word) || target.word.length < 5) return null; // numbers and short words must be exact
  const cap = target.word.length >= 8 ? 2 : 1;
  return distance(target.word, candidate.word, cap) <= cap || distance(target.stem, candidate.stem, cap) <= cap ? "misspelt" : null;
}

type PhraseMatch = { tokens: Token[]; misspelt: { got: Token; want: Token }[]; coverage: number };

/**
 * Finds the best window of the answer containing the phrase's content words (any order).
 * `required` is how many of them must be found. Tokens in `used` are not available.
 */
function matchPhrase(answer: Token[], phrase: string, used: Set<number>, required: (n: number) => number): PhraseMatch | null {
  const want = content(phrase);
  if (!want.length) return null;
  const window = Math.max(8, want.length * 3);
  let best: PhraseMatch | null = null;
  for (let i = 0; i < answer.length; i++) {
    const slice = answer.slice(i, i + window).filter((t) => !used.has(t.index));
    const taken = new Set<number>();
    const tokens: Token[] = [];
    const misspelt: PhraseMatch["misspelt"] = [];
    for (const w of want) {
      let pick: { t: Token; m: WordMatch } | null = null;
      for (const t of slice) {
        if (taken.has(t.index)) continue;
        const m = compare(w, t);
        if (m === "exact") {
          pick = { t, m };
          break;
        }
        if (m === "misspelt" && !pick) pick = { t, m };
      }
      if (pick) {
        taken.add(pick.t.index);
        tokens.push(pick.t);
        if (pick.m === "misspelt") misspelt.push({ got: pick.t, want: w });
      }
    }
    if (tokens.length >= required(want.length)) {
      const candidate = { tokens, misspelt, coverage: tokens.length / want.length };
      if (!best || candidate.coverage > best.coverage || (candidate.coverage === best.coverage && candidate.misspelt.length < best.misspelt.length)) {
        best = candidate;
      }
    }
  }
  return best;
}

const all = (n: number) => n;
/** Long descriptions are paraphrased; most of their content words are enough. */
const most = (n: number) => (n <= 3 ? n : Math.max(3, Math.ceil(n * 0.7)));


export function markTheory(answerText: string, points: MarkingPoint[]): TheoryResult {
  const answer = tokenize(answerText);
  const used = new Set<number>();
  const highlights: Highlight[] = [];
  const results: PointResult[] = [];
  const quote = (tokens: Token[]) => tokens.map((t) => answerText.slice(t.start, t.end)).join(" ");
  /** Accepted answers already credited: "State two ..." needs two different ones. */
  const credited = new Set<string>();

  for (const p of points) {
    const base = { description: p.description, marks: p.marks };
    const misspelt = (tokens: Token[], want: string) => {
      tokens.forEach((t) => used.add(t.index));
      for (const t of tokens) highlights.push({ start: t.start, end: t.end, kind: "misspelt" });
      const got = quote(tokens);
      results.push({ ...base, awarded: 0, status: "misspelt", found: got, note: `"${got}" is misspelt. It must be spelt ${want}.` });
    };

    if (p.strictness === "rubric") {
      results.push({ ...base, awarded: 0, status: "review", note: "A teacher marks this point." });
      continue;
    }

    // 1. Key terms: present and spelt right.
    const keyTokens: Token[] = [];
    const missingTerms: string[] = [];
    let misspeltTerm: { tokens: Token[]; term: string } | null = null;
    for (const term of p.keyTerms) {
      const m = matchPhrase(answer, term, used, all);
      if (!m) missingTerms.push(term);
      else if (m.misspelt.length) misspeltTerm ??= { tokens: m.misspelt.map((x) => x.got), term };
      else keyTokens.push(...m.tokens);
    }
    if (misspeltTerm) {
      misspelt(misspeltTerm.tokens, misspeltTerm.term);
      continue;
    }

    // 2. Best match among the accepted answers (all words) and the description (most words).
    let match: (PhraseMatch & { alternative: boolean; phrase: string }) | null = null;
    for (const c of [...p.acceptedAlternatives.map((phrase) => ({ phrase, alternative: true })), { phrase: p.description, alternative: false }]) {
      if (credited.has(normalise(c.phrase))) continue;
      const m = matchPhrase(answer, c.phrase, used, c.alternative ? all : most);
      if (m && (!match || m.misspelt.length < match.misspelt.length)) match = { ...m, alternative: c.alternative, phrase: c.phrase };
      if (match && !match.misspelt.length) break;
    }
    if (match && p.strictness === "exact" && match.misspelt.length) {
      misspelt(
        match.misspelt.map((x) => x.got),
        match.misspelt.map((x) => x.want.word).join(", "),
      );
      continue;
    }

    // 3. Award: key terms all present, or (when there are none) a match. An accepted answer overrides key terms.
    const earned = p.keyTerms.length
      ? !missingTerms.length
        ? [...keyTokens, ...(match?.tokens ?? [])]
        : match?.alternative
          ? match.tokens
          : null
      : (match?.tokens ?? null);
    if (earned?.length) {
      earned.forEach((t) => used.add(t.index));
      if (match) credited.add(normalise(match.phrase));
      const start = Math.min(...earned.map((t) => t.start));
      const end = Math.max(...earned.map((t) => t.end));
      highlights.push({ start, end, kind: "awarded" });
      results.push({ ...base, awarded: p.marks, status: "awarded", found: answerText.slice(start, end) });
      continue;
    }

    const note = p.keyTerms.length && match ? `Use the key term: ${missingTerms.join(", ")}.` : "Missing from your answer.";
    results.push({ ...base, awarded: 0, status: "missing", note });
  }

  return {
    awarded: results.reduce((s, r) => s + r.awarded, 0),
    marks: points.reduce((s, p) => s + p.marks, 0),
    points: results,
    highlights: mergeHighlights(highlights),
    needsReview: results.some((r) => r.status === "review"),
  };
}

/** Overlapping highlights: misspelt wins over awarded where they overlap; otherwise keep both. */
function mergeHighlights(hs: Highlight[]): Highlight[] {
  const out: Highlight[] = [];
  for (const h of hs) {
    const clash = out.find((o) => h.start < o.end && o.start < h.end);
    if (!clash) out.push(h);
    else if (h.kind === "misspelt" && clash.kind === "awarded") {
      // Split the awarded span around the misspelt word.
      out.splice(out.indexOf(clash), 1);
      if (clash.start < h.start) out.push({ start: clash.start, end: h.start, kind: "awarded" });
      out.push(h);
      if (h.end < clash.end) out.push({ start: h.end, end: clash.end, kind: "awarded" });
    }
  }
  return out.sort((a, b) => a.start - b.start);
}
