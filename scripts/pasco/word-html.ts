/**
 * Reads a PASCO / WordPub book that was saved from Word as HTML, into the same "pages of lines" shape
 * that `readPdfPages` gives, so both kinds of book go through one parser.
 *
 * Why HTML and not plain text: Word's text export drops underlining ("the word underlined"),
 * superscripts and subscripts (m², H₂O), table cells, and pictures. HTML keeps them.
 *
 * Convert a password-protected .doc once with Word (see docs/PAST_PAPERS.md), then pass the .htm file.
 * A book has no real pages here; a new "page" starts at every paper heading, which is all the
 * section splitter needs.
 */
import { readFileSync } from "node:fs";
import { isNoise, plainMathLetters, sectionHead } from "./pdf-pages";

const SUPER: Record<string, string> = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "-": "⁻", "−": "⁻", "+": "⁺", n: "ⁿ" };
const SUB: Record<string, string> = { "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉" };
const script = (s: string, table: Record<string, string>, fallback: string) =>
  [...s].every((c) => table[c]) ? [...s].map((c) => table[c]).join("") : fallback;

const ENTITIES: Record<string, string> = { nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", ndash: "–", mdash: "—", hellip: "…", deg: "°", times: "×", divide: "÷", frac12: "½", frac14: "¼", frac34: "¾" };
const decode = (s: string) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+\d*);/gi, (m, e: string) =>
    e[0] === "#" ? String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : (ENTITIES[e.toLowerCase()] ?? m),
  );

/** src, width and height of an <img> tag's attributes. */
const imgAttrs = (attrs: string) => ({
  src: /\bsrc="([^"]+)"/i.exec(attrs)?.[1],
  w: Number(/\bwidth="?(\d+)/i.exec(attrs)?.[1] ?? 0),
  h: Number(/\bheight="?(\d+)/i.exec(attrs)?.[1] ?? 0),
});

/** Underline markers survive tag stripping as these private characters, then become `<u>`/`</u>` again. */
const U_OPEN = "\u{F0001}";
const U_CLOSE = "\u{F0002}";

export function htmlToLines(html: string): string[] {
  let s = html
    .replace(/<head[\s\S]*?<\/head>/i, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<!\[(?:if|endif)[^\]]*\]>/gi, "")
    // Symbol-font bullets (Wingdings "§", Symbol "·") are list markers, not text.
    .replace(/<span[^>]*font-family:(?:Wingdings|Symbol)[^>]*>[^<]*<\/span>/gi, "▪ ")
    // Superscript / subscript, as tags or as Word's inline vertical-align style.
    .replace(/<sup[^>]*>([^<]*)<\/sup>/gi, (_, t: string) => script(decode(t), SUPER, `^${t}`))
    .replace(/<sub[^>]*>([^<]*)<\/sub>/gi, (_, t: string) => script(decode(t), SUB, `_${t}`))
    .replace(/<span[^>]*vertical-align:\s*super[^>]*>([^<]*)<\/span>/gi, (_, t: string) => script(decode(t), SUPER, `^${t}`))
    .replace(/<span[^>]*vertical-align:\s*sub[^>]*>([^<]*)<\/span>/gi, (_, t: string) => script(decode(t), SUB, `_${t}`))
    // Word saves each equation twice, side by side: a sharper copy, then the one sized as printed.
    // Same shape means the same picture: keep the sharper file at the printed size.
    .replace(/<img([^>]*)>\s*<img([^>]*)>/gi, (both, a: string, b: string) => {
      const [pa, pb] = [imgAttrs(a), imgAttrs(b)];
      const sameShape = pa.w && pa.h && pb.w && pb.h && Math.abs(pa.w / pa.h - pb.w / pb.h) < 0.05 * (pb.w / pb.h);
      return sameShape ? ` [image: ${pa.src}|${pb.w}|${pb.h}] ` : both;
    })
    .replace(/<img([^>]*)>/gi, (_, a: string) => {
      const p = imgAttrs(a);
      return p.src ? ` [image: ${p.src}${p.w && p.h ? `|${p.w}|${p.h}` : ""}] ` : " ";
    })
    // Word tab stops: table-like rows such as the cloze options "31. seek  request  search  look".
    .replace(/<span[^>]*mso-tab-count:\s*\d+[^>]*>[^<]*<\/span>/gi, "\t")
    .replace(/<u\b[^>]*>/gi, U_OPEN)
    .replace(/<\/u>/gi, U_CLOSE)
    .replace(/<\/td>/gi, "\t")
    .replace(/<br[^>]*>|<\/(?:p|h[1-6]|li|tr|div|table)>/gi, "\n")
    .replace(/<[^>]+>/g, "");
  s = plainMathLetters(decode(s));
  return s
    .split("\n")
    .map((l) =>
      l
        .replace(/[^\S\t]+/g, " ")
        .replace(/ *\t[\s]*/g, "\t")
        .replace(new RegExp(`${U_OPEN}(\\s*)${U_CLOSE}`, "g"), "$1")
        .replace(new RegExp(`${U_CLOSE}(\\s*)${U_OPEN}`, "g"), "$1")
        .replaceAll(U_OPEN, "<u>")
        .replaceAll(U_CLOSE, "</u>")
        .replace(/<u>(\s+)/g, "$1<u>")
        .replace(/(\s+)<\/u>/g, "</u>$1")
        .replace(/^\t+|\t+$/g, "")
        // A fraction typed as a raised and a lowered letter ("^a/_b") reads as a/b.
        .replace(/\^([^\s/^_]+)\s*\/\s*_([^\s/^_]+)/g, "$1/$2")
        .trim(),
    )
    .filter((l) => l && l !== "▪" && !isNoise(l));
}

/** Lines of the book, cut into a new "page" at every paper heading. */
export function readHtmlPages(htmlPath: string): { pages: string[][] } {
  const raw = readFileSync(htmlPath);
  const charset = /charset=["']?([\w-]+)/i.exec(raw.toString("latin1", 0, 4000))?.[1] ?? "utf-8";
  const lines = htmlToLines(new TextDecoder(charset).decode(raw));
  const pages: string[][] = [[]];
  for (let i = 0; i < lines.length; i++) {
    if (pages.at(-1)!.length && sectionHead(lines.slice(i, i + 6))) pages.push([]);
    pages.at(-1)!.push(lines[i]);
  }
  return { pages };
}
