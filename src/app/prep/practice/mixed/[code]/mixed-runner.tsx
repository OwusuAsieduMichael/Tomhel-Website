"use client";

import { Check, ChevronLeft, RotateCcw, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { QuestionText } from "@/components/prep/question-text";
import { prepButton } from "@/components/prep/ui";
import { fmtMarks } from "@/lib/prep/format";
import type { MixedItem, MixedQuestion, MixedResult, MixedStats } from "@/lib/prep/practice/mixed";
import { cn } from "@/lib/utils";
import { answerMixedAction, nextMixedAction } from "../actions";

/** A wrong answer comes back after this many other questions (or at the end, if fewer are left). */
const COME_BACK_AFTER = 3;

type Slot = { item: MixedItem; copy: number; again: boolean };

type Feedback = { correct: boolean; result: MixedResult | null; error?: string };

export function MixedRunner({
  subject,
  items,
  stats: initialStats,
  backHref,
}: {
  subject: { name: string; code: string };
  items: MixedItem[];
  stats: MixedStats;
  backHref: string;
}) {
  const [queue, setQueue] = useState<Slot[]>(items.map((item) => ({ item, copy: 0, again: false })));
  const [stats, setStats] = useState(initialStats);
  const [session, setSession] = useState({ answered: 0, right: 0 });
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [choice, setChoice] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [exhausted, setExhausted] = useState(items.length === 0);
  const [checking, startChecking] = useTransition();
  const fetching = useRef(false);
  const top = useRef<HTMLHeadingElement>(null);

  const slot = queue[0];
  const q: MixedQuestion | undefined = slot ? slot.item.copies[slot.copy % slot.item.copies.length] : undefined;
  // The question on screen now: a save that finishes after the student moved on must not touch the next one.
  const onScreen = useRef<string | undefined>(undefined);
  onScreen.current = q?.id;

  // Keep a few questions ahead: fetch more when the queue runs low.
  useEffect(() => {
    if (exhausted || fetching.current || queue.length > 4) return;
    fetching.current = true;
    nextMixedAction(subject.code, queue.map((s) => s.item.groupKey))
      .then((r) => {
        if ("error" in r) return setLoadError(r.error);
        setLoadError(null);
        if (!r.items.length) setExhausted(true);
        setQueue((cur) => {
          const have = new Set(cur.map((s) => s.item.groupKey));
          return [...cur, ...r.items.filter((i) => !have.has(i.groupKey)).map((item) => ({ item, copy: 0, again: false }))];
        });
      })
      .catch(() => setLoadError("Couldn't load more questions. Check your connection."))
      .finally(() => (fetching.current = false));
  }, [queue, exhausted, subject.code]);

  const record = (answer: { choice?: string; text?: string; selfCheck?: "got" | "not" }, correct: boolean | null) => {
    if (!q) return;
    // Objectives: the key is already here, so the answer shows at once and is saved in the background.
    if (correct !== null) setFeedback({ correct, result: null });
    startChecking(async () => {
      const id = q.id;
      const r = await answerMixedAction(id, answer).catch(() => ({ error: "Your answer wasn't saved. Check your connection." }));
      if (!("error" in r)) setStats(r.stats);
      if (onScreen.current !== id) return;
      if ("error" in r) {
        setFeedback((f) => (f ? { ...f, error: r.error } : { correct: false, result: null, error: r.error }));
        return;
      }
      setFeedback({ correct: r.correct, result: r });
    });
  };

  const next = () => {
    if (!slot || !feedback) return;
    setSession((s) => ({ answered: s.answered + 1, right: s.right + (feedback.correct ? 1 : 0) }));
    setQueue((cur) => {
      const [done, ...rest] = cur;
      if (feedback.correct) return rest;
      // Wrong: it comes back a few questions later, as another year's copy when there is one.
      const back: Slot = { item: done.item, copy: done.copy + 1, again: true };
      const at = Math.min(COME_BACK_AFTER, rest.length);
      return [...rest.slice(0, at), back, ...rest.slice(at)];
    });
    setFeedback(null);
    setChoice(null);
    setText("");
    setRevealed(false);
    requestAnimationFrame(() => top.current?.focus());
  };

  const pct = stats.total ? Math.round((stats.mastered / stats.total) * 100) : 0;

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col">
      <header className="sticky top-0 z-20 flex flex-col gap-2.5 border-b border-prep-line bg-prep-surface px-5 py-3">
        <div className="flex items-center gap-2">
          <Link href={backHref} aria-label="End practice" className="-ml-3 flex size-11 items-center justify-center rounded-xl hover:bg-prep-primary-soft">
            <ChevronLeft className="size-[22px]" aria-hidden />
          </Link>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h1 className="text-[15px] font-bold">{subject.name} · Practice mode</h1>
            <span className="text-[13px] text-prep-muted">
              All years mixed · no timer · {session.answered} answered, {session.right} right
            </span>
          </div>
        </div>
        <div>
          <div className="mb-1 flex justify-between text-xs text-prep-muted">
            <span>
              Mastered {stats.mastered} of {stats.total} questions
            </span>
            {stats.toRedo ? <span>{stats.toRedo} to get right</span> : null}
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-prep-track" role="progressbar" aria-label="Questions mastered" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-prep-primary transition-[width]" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-4 p-5">
        {!q ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            {loadError ? (
              <p role="alert" className="text-prep-incorrect">
                {loadError}
              </p>
            ) : exhausted ? (
              <>
                <p className="text-xl font-bold">Well done. Every question here is mastered.</p>
                <p className="text-prep-muted">Come back any time: practice starts again with a review of the oldest ones.</p>
                <Link href={backHref} className={prepButton()}>
                  Back to {subject.name}
                </Link>
              </>
            ) : (
              <p className="text-prep-muted">Loading questions…</p>
            )}
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 text-[13px] text-prep-muted">
              <span>{q.source}</span>
              <span>· Question {q.numberLabel}</span>
              {slot.again ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-prep-misspelt-bg px-2 py-0.5 font-semibold text-prep-misspelt">
                  <RotateCcw className="size-3" aria-hidden /> Try again
                </span>
              ) : null}
            </div>
            <h2 ref={top} tabIndex={-1} className="text-[17px] leading-normal font-semibold whitespace-pre-line focus:outline-none">
              <QuestionText text={q.text} />
            </h2>
            {q.imageUrls.map((src) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={src} src={src} alt={`Diagram for question ${q.numberLabel}`} className="max-h-80 w-auto rounded-xl border border-prep-line bg-white object-contain" />
            ))}

            {q.type === "mcq" ? (
              <Options q={q} choice={choice} feedback={feedback} onChoose={(label) => {
                if (feedback) return;
                setChoice(label);
                record({ choice: label }, label === q.key!.correct);
              }} />
            ) : (
              <Theory
                q={q}
                text={text}
                setText={setText}
                revealed={revealed}
                checking={checking}
                feedback={feedback}
                onCheck={() => record({ text }, null)}
                onReveal={() => setRevealed(true)}
                onSelfCheck={(got) => record({ text, selfCheck: got ? "got" : "not" }, null)}
              />
            )}

            {feedback ? (
              <div aria-live="polite" className="flex flex-col gap-3">
                <div className={cn("rounded-xl px-3.5 py-3 text-sm", feedback.correct ? "bg-prep-primary-soft text-prep-awarded" : "bg-prep-incorrect-bg text-prep-incorrect-ink")}>
                  <p className="font-bold">
                    {feedback.correct ? "Correct." : q.type === "mcq" ? `Not quite. The answer is ${q.key!.correct}.` : "Not yet. This one will come back."}
                  </p>
                  {q.type === "mcq" && q.key!.explanation ? <p className="mt-1 text-prep-ink">{q.key!.explanation}</p> : null}
                  {!feedback.correct && q.type === "mcq" ? <p className="mt-1 text-prep-ink">It comes back later, until you get it right.</p> : null}
                </div>
                {feedback.error ? (
                  <p role="alert" className="text-sm font-semibold text-prep-incorrect">
                    {feedback.error}
                  </p>
                ) : null}
                <button type="button" onClick={next} className={prepButton({ block: true })} disabled={checking && !feedback}>
                  Next question
                </button>
              </div>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}

function Options({ q, choice, feedback, onChoose }: { q: MixedQuestion; choice: string | null; feedback: Feedback | null; onChoose: (label: string) => void }) {
  return (
    <fieldset className="flex flex-col gap-2.5" disabled={!!feedback}>
      <legend className="sr-only">Options for question {q.numberLabel}</legend>
      {q.options.map((o) => {
        const chosen = choice === o.label;
        const right = !!feedback && o.label === q.key!.correct;
        const wrong = !!feedback && chosen && !right;
        return (
          <label
            key={o.label}
            className={cn(
              "flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border bg-prep-surface px-3.5 py-2 text-[15px] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-prep-primary",
              right ? "border-2 border-prep-awarded bg-prep-primary-soft px-[13px] font-semibold" : wrong ? "border-2 border-prep-incorrect bg-prep-incorrect-bg px-[13px]" : "border-prep-input",
              feedback && "cursor-default",
            )}
          >
            <input type="radio" name={`q-${q.id}`} value={o.label} checked={chosen} onChange={() => onChoose(o.label)} className="sr-only" />
            <span
              className={cn(
                "flex size-[30px] shrink-0 items-center justify-center rounded-full border text-sm font-bold",
                right ? "border-prep-awarded bg-prep-awarded text-white" : wrong ? "border-prep-incorrect bg-prep-incorrect text-white" : "border-prep-input",
              )}
            >
              {right ? <Check className="size-4" aria-hidden /> : wrong ? <X className="size-4" aria-hidden /> : o.label}
            </span>
            <span>
              {right || wrong ? <span className="sr-only">{o.label}. </span> : null}
              <QuestionText text={o.text} />
              {right ? <span className="sr-only"> (correct answer)</span> : wrong ? <span className="sr-only"> (your answer, not correct)</span> : null}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}

function Theory({
  q,
  text,
  setText,
  revealed,
  checking,
  feedback,
  onCheck,
  onReveal,
  onSelfCheck,
}: {
  q: MixedQuestion;
  text: string;
  setText: (t: string) => void;
  revealed: boolean;
  checking: boolean;
  feedback: Feedback | null;
  onCheck: () => void;
  onReveal: () => void;
  onSelfCheck: (got: boolean) => void;
}) {
  const result = feedback?.result;
  return (
    <div className="flex flex-col gap-3">
      <label htmlFor="answer" className="text-sm font-bold">
        Your answer <span className="font-normal text-prep-muted">({fmtMarks(q.marks)} marks)</span>
      </label>
      <textarea
        id="answer"
        value={text}
        onChange={(e) => setText(e.target.value)}
        readOnly={!!feedback}
        rows={6}
        className="min-h-[160px] resize-y rounded-xl border border-prep-input bg-prep-surface p-3.5 text-base leading-relaxed focus-visible:border-prep-primary focus-visible:outline-2 focus-visible:outline-prep-primary"
      />
      {q.selfCheck ? (
        !revealed ? (
          <button type="button" onClick={onReveal} className={prepButton({ variant: "secondary" })}>
            Show the answer
          </button>
        ) : (
          <>
            <ModelAnswer text={q.modelAnswer} />
            {!feedback ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-semibold">Compare with your answer. Did you get it?</p>
                <div className="flex gap-2.5">
                  <button type="button" onClick={() => onSelfCheck(true)} className={cn(prepButton(), "flex-1")} disabled={checking}>
                    Got it
                  </button>
                  <button type="button" onClick={() => onSelfCheck(false)} className={cn(prepButton({ variant: "secondary" }), "flex-1")} disabled={checking}>
                    Not yet
                  </button>
                </div>
              </div>
            ) : null}
          </>
        )
      ) : !feedback ? (
        <button type="button" onClick={onCheck} className={prepButton()} disabled={checking || !text.trim()}>
          {checking ? "Checking…" : "Check my answer"}
        </button>
      ) : null}

      {result?.theory ? (
        <div className="rounded-xl border border-prep-line bg-prep-surface p-3.5 text-sm">
          <p className="font-bold">
            {fmtMarks(result.theory.awarded)} of {fmtMarks(result.theory.outOf)} points the computer can mark
          </p>
          <ul className="mt-2 space-y-1.5">
            {result.theory.points.map((p, i) => (
              <li key={i} className="flex items-start gap-2">
                {p.status === "awarded" ? <Check className="mt-0.5 size-4 shrink-0 text-prep-awarded" aria-hidden /> : <X className="mt-0.5 size-4 shrink-0 text-prep-incorrect" aria-hidden />}
                <span>
                  <span className="sr-only">{p.status === "awarded" ? "Awarded: " : "Not awarded: "}</span>
                  {p.description}
                  {p.found ? <span className="text-prep-muted"> · “{p.found}”</span> : null}
                  {p.note && p.status !== "awarded" ? <span className="text-prep-muted"> · {p.note}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {result && !q.selfCheck ? <ModelAnswer text={result.modelAnswer} /> : null}
    </div>
  );
}

/** The scheme's model answer, to compare with. */
function ModelAnswer({ text }: { text: string | null }) {
  if (!text) return <p className="text-sm text-prep-muted">No model answer for this question yet.</p>;
  return (
    <div className="rounded-xl border border-prep-line bg-prep-surface p-3.5 text-sm">
      <p className="mb-1 font-bold">Model answer</p>
      <p className="whitespace-pre-line text-prep-ink">
        <QuestionText text={text} />
      </p>
    </div>
  );
}
