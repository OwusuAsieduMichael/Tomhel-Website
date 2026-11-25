import { Fragment, type ReactNode } from "react";

/**
 * Question and option text is plain text with two pieces of markup:
 * - `<u>word</u>` for words the paper underlines ("choose the word nearest in meaning to the underlined word");
 * - `{{img:ID|width|height}}` for a picture from the paper (a maths equation, a diagram), served to signed-in
 *   users by /prep/media/ID. Width and height are the printed size in pixels and are optional.
 * Everything else is shown as typed; nothing is parsed as HTML.
 */
const MARKUP = /<u>([\s\S]*?)<\/u>|\{\{img:([A-Za-z0-9_-]{10,100})(?:\|(\d{1,4})\|(\d{1,4}))?\}\}/g;

/** Pictures wider than this are diagrams: shown on their own line. Smaller ones (equations) sit in the text. */
const INLINE_MAX_WIDTH = 260;

export function QuestionText({ text }: { text: string }) {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(MARKUP)) {
    if (m.index > last) out.push(<Fragment key={`t${last}`}>{text.slice(last, m.index)}</Fragment>);
    if (m[1] !== undefined) {
      out.push(
        <u key={`u${m.index}`} className="decoration-2 underline-offset-4">
          {m[1]}
        </u>,
      );
    } else {
      const width = m[3] ? Number(m[3]) : undefined;
      const height = m[4] ? Number(m[4]) : undefined;
      const block = !width || width > INLINE_MAX_WIDTH;
      out.push(
        // eslint-disable-next-line @next/next/no-img-element -- served by our own signed-in route, not next/image
        <img
          key={`i${m.index}`}
          src={`/prep/media/${m[2]}`}
          width={width}
          height={height}
          alt="Picture from the paper"
          loading="lazy"
          className={
            block
              ? "my-2 block h-auto max-h-96 w-auto max-w-full rounded-lg border border-prep-line bg-white object-contain"
              : "mx-0.5 inline-block h-auto max-w-full align-middle"
          }
        />,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(<Fragment key={`t${last}`}>{text.slice(last)}</Fragment>);
  return <>{out}</>;
}

/** The text without markup, for places that need a plain string (labels, CSV). */
export const plainQuestionText = (text: string) => text.replace(/<\/?u>/g, "").replace(/\{\{img:[^}]+\}\}/g, "[picture]");
