"use client";

import { Check, Flag, Info, Timer, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { Answers, RunnerData } from "@/lib/prep/practice/attempts";
import { cn } from "@/lib/utils";
import { saveAnswersAction, submitAttemptAction } from "../actions";

const AUTOSAVE_MS = 2500;

type SaveState = "idle" | "pending" | "saving" | "saved" | "error";

function useCountdown(deadlineIso: string | null, serverNowIso: string) {
  // Correct for a wrong clock on the student's phone: count from the server's idea of now.
  const skew = useMemo(() => new Date(serverNowIso).getTime() - Date.now(), [serverNowIso]);
  const deadline = deadlineIso ? new Date(deadlineIso).getTime() : null;
  const [left, setLeft] = useState(() => (deadline ? deadline - (Date.now() + skew) : null));
  useEffect(() => {
    if (!deadline) return;
    const tick = () => setLeft(deadline - (Date.now() + skew));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [deadline, skew]);
  return left === null ? null : Math.max(0, left);
}

const clock = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
};

const words = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);

export function Runner({ data }: { data: RunnerData }) {
  const router = useRouter();
  const { attempt, paper, questions } = data;
  const practice = attempt.mode === "practice";
  const objectives = questions.every((q) => q.type === "mcq");

  const [answers, setAnswers] = useState<Answers>(attempt.answers);
  const [index, setIndex] = useState(() => {
    const firstOpen = questions.findIndex((q) => !attempt.answers[q.id]?.choice && !attempt.answers[q.id]?.text);
    return firstOpen === -1 ? 0 : firstOpen;
  });
  const [save, setSave] = useState<SaveState>("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, startSubmit] = useTransition();
  const latest = useRef(answers);
  latest.current = answers;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const q = questions[index];
  const a = answers[q.id] ?? {};
  const answeredCount = questions.filter((x) => answers[x.id]?.choice || answers[x.id]?.text?.trim()).length;
  const flaggedCount = questions.filter((x) => answers[x.id]?.flagged).length;

  const persist = useCallback(async () => {
    setSave("saving");
    const r = await saveAnswersAction(attempt.id, latest.current);
    if (r.status === "submitted") router.replace(`/prep/practice/${attempt.id}/results`);
    else if (r.status === "error") {
      setSave("error");
      setError(r.message);
    } else {
      setSave("saved");
      setSavedAt(new Date());
    }
  }, [attempt.id, router]);

  const change = (id: string, patch: Answers[string], immediate = false) => {
    setAnswers((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
    setSave("pending");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(persist, immediate ? 0 : AUTOSAVE_MS);
  };

  // Warn before closing the tab with unsaved changes.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (save === "pending" || save === "saving") e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [save]);

  const submit = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    startSubmit(async () => {
      const r = await submitAttemptAction(attempt.id, latest.current);
      if (r && "error" in r) setError(r.error);
    });
  }, [attempt.id]);

  const left = useCountdown(attempt.deadlineAt, data.serverNow);
  const timeUp = left === 0;
  useEffect(() => {
    if (timeUp) submit();
  }, [timeUp, submit]);

  const isLast = index === questions.length - 1;
  const total = practice ? questions.filter((x) => x.key && answers[x.id]?.choice === x.key.correct).length : null;

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col">
      <header className="sticky top-0 z-20 flex flex-col gap-2.5 border-b border-prep-line bg-prep-surface px-5 pt-3 pb-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[15px] font-bold">
              {paper.title}
            </span>
            <span className="text-[13px] text-prep-muted">
              {objectives ? `Question ${index + 1} of ${questions.length}` : `Question ${q.numberLabel} · ${q.marks} ${q.marks === 1 ? "mark" : "marks"}`}
              {practice && total !== null ? ` · ${total} right so far` : ""}
            </span>
          </div>
          {left === null ? (
            <div className="flex h-10 items-center gap-1.5 rounded-full bg-prep-track px-3.5 text-sm font-bold text-prep-muted">
              <Timer className="size-[18px]" aria-hidden /> No limit
            </div>
          ) : (
            <div
              role="timer"
              aria-label={`${Math.ceil(left / 60000)} minutes left`}
              className={cn(
                "flex h-10 items-center gap-1.5 rounded-full px-3.5 text-base font-bold tabular-nums",
                left < 60_000 ? "bg-prep-incorrect-bg text-prep-incorrect" : left < 5 * 60_000 ? "bg-prep-misspelt-bg text-prep-misspelt" : "bg-prep-primary-soft text-prep-primary",
              )}
            >
              <Timer className="size-[18px]" aria-hidden /> {clock(left)}
            </div>
          )}
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-prep-track" aria-hidden>
          <div className="h-full rounded-full bg-prep-primary transition-[width]" style={{ width: `${(answeredCount / questions.length) * 100}%` }} />
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-4 p-5">
        {error ? (
          <p role="alert" className="rounded-xl border border-prep-incorrect/30 bg-prep-incorrect-bg px-4 py-3 text-sm text-prep-incorrect">
            {error}
          </p>
        ) : null}

        <p className="text-[17px] leading-normal font-semibold whitespace-pre-line">{q.text}</p>
        {q.imageUrls.map((src) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={src} src={src} alt={`Diagram for question ${q.numberLabel}`} className="max-h-80 w-auto rounded-xl border border-prep-line bg-white object-contain" />
        ))}

        {q.type === "mcq" ? (
          <McqOptions
            q={q}
            choice={a.choice}
            practice={practice}
            onChoose={(label) => change(q.id, { choice: label }, practice)}
          />
        ) : (
          <TheoryAnswer
            key={q.id}
            value={a.text ?? ""}
            onChange={(text) => change(q.id, { text })}
            save={save}
            savedAt={savedAt}
            toTeacher={!paper.autoMarkTheory}
          />
        )}

        <button
          type="button"
          aria-pressed={!!a.flagged}
          onClick={() => change(q.id, { flagged: !a.flagged })}
          className="flex min-h-11 items-center gap-1.5 self-start text-sm font-semibold text-prep-misspelt focus-visible:outline-2 focus-visible:outline-prep-primary"
        >
          <Flag className={cn("size-[18px]", a.flagged && "fill-current")} aria-hidden />
          {a.flagged ? "Flagged · tap to unflag" : "Flag to come back to"}
        </button>

        <QuestionGrid
          questions={questions}
          answers={answers}
          current={index}
          onJump={setIndex}
          summary={`${answeredCount} answered · ${flaggedCount} flagged`}
        />

        <div className="flex-1" />

        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className="h-[52px] flex-1 rounded-xl border border-prep-input bg-prep-surface text-[15px] font-bold disabled:opacity-50"
          >
            Previous
          </button>
          {isLast ? (
            <button type="button" onClick={() => setConfirming(true)} className="h-[52px] flex-[1.4] rounded-xl bg-prep-primary text-[15px] font-bold text-white">
              {objectives ? "Submit paper" : "Submit for marking"}
            </button>
          ) : (
            <button type="button" onClick={() => setIndex((i) => i + 1)} className="h-[52px] flex-1 rounded-xl bg-prep-primary text-[15px] font-bold text-white">
              Next
            </button>
          )}
        </div>
        {!isLast ? (
          <button type="button" onClick={() => setConfirming(true)} className="flex min-h-11 items-center self-center text-sm font-semibold text-prep-primary underline-offset-4 hover:underline">
            Submit paper
          </button>
        ) : null}
      </main>

      {confirming || submitting || timeUp ? (
        <div role="dialog" aria-modal="true" aria-labelledby="submit-title" className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-sm space-y-4 rounded-2xl bg-prep-surface p-5">
            <h2 id="submit-title" className="text-lg font-bold">
              {timeUp ? "Time is up" : submitting ? "Submitting…" : "Submit your paper?"}
            </h2>
            <p className="text-sm text-prep-muted">
              {timeUp
                ? "Your paper is being submitted with the answers you gave."
                : answeredCount < questions.length
                  ? `You have answered ${answeredCount} of ${questions.length} questions. Unanswered questions get no marks.`
                  : "You have answered every question."}
              {flaggedCount && !timeUp ? ` ${flaggedCount} ${flaggedCount === 1 ? "is" : "are"} flagged.` : ""}
            </p>
            {!timeUp && !submitting ? (
              <div className="flex gap-2.5">
                <button type="button" onClick={() => setConfirming(false)} className="h-12 flex-1 rounded-xl border border-prep-input font-bold">
                  Keep going
                </button>
                <button type="button" onClick={submit} className="h-12 flex-1 rounded-xl bg-prep-primary font-bold text-white">
                  Submit
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function McqOptions({
  q,
  choice,
  practice,
  onChoose,
}: {
  q: RunnerData["questions"][number];
  choice?: string;
  practice: boolean;
  onChoose: (label: string) => void;
}) {
  const revealed = practice && !!choice && !!q.key;
  return (
    <div className="flex flex-col gap-2.5">
      <fieldset className="flex flex-col gap-2.5" disabled={revealed}>
        <legend className="sr-only">Options for question {q.numberLabel}</legend>
        {q.options.map((o) => {
          const chosen = choice === o.label;
          const right = revealed && o.label === q.key!.correct;
          const wrong = revealed && chosen && !right;
          return (
            <label
              key={o.label}
              className={cn(
                "flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border bg-prep-surface px-3.5 py-2 text-[15px] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-prep-primary",
                right
                  ? "border-2 border-prep-awarded bg-prep-primary-soft px-[13px] font-semibold"
                  : wrong
                    ? "border-2 border-prep-incorrect bg-prep-incorrect-bg px-[13px]"
                    : chosen
                      ? "border-2 border-prep-primary bg-prep-primary-soft px-[13px] font-semibold"
                      : "border-prep-input",
                revealed && "cursor-default",
              )}
            >
              <input type="radio" name={`q-${q.id}`} value={o.label} checked={chosen} onChange={() => onChoose(o.label)} className="sr-only" />
              <span
                className={cn(
                  "flex size-[30px] shrink-0 items-center justify-center rounded-full border text-sm font-bold",
                  right ? "border-prep-awarded bg-prep-awarded text-white" : wrong ? "border-prep-incorrect bg-prep-incorrect text-white" : chosen ? "border-prep-primary bg-prep-primary text-white" : "border-prep-input",
                )}
              >
                {right ? <Check className="size-4" aria-hidden /> : wrong ? <X className="size-4" aria-hidden /> : o.label}
              </span>
              <span>
                {right || wrong ? <span className="sr-only">{o.label}. </span> : null}
                {o.text}
                {right ? <span className="sr-only"> (correct answer)</span> : wrong ? <span className="sr-only"> (your answer, not correct)</span> : null}
              </span>
            </label>
          );
        })}
      </fieldset>
      {revealed ? (
        <div
          role="status"
          className={cn("rounded-xl px-3.5 py-3 text-sm", choice === q.key!.correct ? "bg-prep-primary-soft text-prep-awarded" : "bg-prep-incorrect-bg text-prep-incorrect-ink")}
        >
          <p className="font-bold">{choice === q.key!.correct ? "Correct." : `Not quite. The answer is ${q.key!.correct}.`}</p>
          {q.key!.explanation ? <p className="mt-1 text-prep-ink">{q.key!.explanation}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

function TheoryAnswer({
  value,
  onChange,
  save,
  savedAt,
  toTeacher,
}: {
  value: string;
  onChange: (text: string) => void;
  save: SaveState;
  savedAt: Date | null;
  toTeacher: boolean;
}) {
  const status =
    save === "saving" || save === "pending"
      ? "Saving…"
      : save === "error"
        ? "Not saved. Check your connection."
        : savedAt
          ? `Saved at ${savedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
          : "Your answer saves as you type";
  return (
    <>
      <div className="flex flex-col gap-2">
        <label htmlFor="answer" className="text-sm font-bold">
          Your answer
        </label>
        <textarea
          id="answer"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={10}
          className="min-h-[260px] resize-y rounded-xl border border-prep-input bg-prep-surface p-3.5 text-base leading-relaxed focus-visible:border-prep-primary focus-visible:outline-2 focus-visible:outline-prep-primary"
        />
        <div className="flex justify-between text-xs text-prep-muted">
          <span aria-live="polite" className={cn(save === "error" && "font-semibold text-prep-incorrect")}>
            {status}
          </span>
          <span>{words(value)} words</span>
        </div>
      </div>
      <div className="flex items-start gap-2.5 rounded-xl border border-prep-line bg-prep-surface px-3.5 py-3">
        <Info className="mt-px size-5 shrink-0 text-prep-primary" aria-hidden />
        <p className="text-[13px] leading-normal text-prep-muted">
          {toTeacher
            ? "Your teacher marks this answer and returns it to you."
            : "Marked against the official marking scheme, point by point. Spelling of key terms counts."}
        </p>
      </div>
    </>
  );
}

function QuestionGrid({
  questions,
  answers,
  current,
  onJump,
  summary,
}: {
  questions: RunnerData["questions"];
  answers: Answers;
  current: number;
  onJump: (i: number) => void;
  summary: string;
}) {
  return (
    <nav aria-label="All questions" className="flex flex-col gap-2.5 rounded-[14px] border border-prep-line bg-prep-surface p-3.5">
      <div className="flex justify-between text-[13px]">
        <span className="font-bold">All questions</span>
        <span className="text-prep-muted">{summary}</span>
      </div>
      <ol className="grid grid-cols-8 gap-[5px] sm:grid-cols-10">
        {questions.map((x, i) => {
          const a = answers[x.id];
          const answered = !!(a?.choice || a?.text?.trim());
          return (
            <li key={x.id}>
              <button
                type="button"
                onClick={() => onJump(i)}
                aria-current={i === current ? "step" : undefined}
                aria-label={`Question ${x.numberLabel}${answered ? ", answered" : ""}${a?.flagged ? ", flagged" : ""}`}
                className={cn(
                  "flex h-8 w-full items-center justify-center rounded-[5px] border text-[11px] font-bold",
                  i === current
                    ? "border-2 border-prep-ink bg-prep-surface text-prep-ink"
                    : a?.flagged
                      ? "border-prep-misspelt bg-prep-flag text-prep-flag-ink"
                      : answered
                        ? "border-prep-primary bg-prep-primary text-white"
                        : "border-prep-line bg-prep-surface text-prep-muted",
                )}
              >
                {x.numberLabel}
              </button>
            </li>
          );
        })}
      </ol>
      <div className="flex flex-wrap gap-3.5 text-xs text-prep-muted">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px] bg-prep-primary" />
          Answered
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px] border border-prep-misspelt bg-prep-flag" />
          Flagged
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px] border-2 border-prep-ink" />
          Current
        </span>
      </div>
    </nav>
  );
}
