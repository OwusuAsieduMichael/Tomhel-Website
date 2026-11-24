import { Fragment } from "react";

/**
 * Question and option text is plain text with one piece of markup: `<u>word</u>` for words the paper
 * underlines ("choose the word nearest in meaning to the underlined word"). Everything else is shown
 * as typed; nothing is parsed as HTML.
 */
export function QuestionText({ text }: { text: string }) {
  const parts = text.split(/<u>([\s\S]*?)<\/u>/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <u key={i} className="decoration-2 underline-offset-4">
            {part}
          </u>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

/** The text without markup, for places that need a plain string (labels, CSV). */
export const plainQuestionText = (text: string) => text.replace(/<\/?u>/g, "");
