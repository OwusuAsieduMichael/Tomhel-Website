"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { FormMessage } from "@/components/prep/ui";
import type { Highlight } from "@/lib/prep/grading/theory";
import { cn } from "@/lib/utils";
import { returnMarkAction } from "./actions";

export type MarkingItem = {
  attemptId: string;
  questionId: string;
  heading: string;
  questionText: string;
  marks: number;
  answer: string;
  markingPoints: { description: string; marks: number }[];
};

type Kind = Highlight["kind"];

const mark: Record<Kind, string> = {
  awarded: "underline decoration-prep-awarded decoration-2 underline-offset-4",
  misspelt: "underline decoration-prep-misspelt decoration-dotted decoration-[3px] underline-offset-4 bg-prep-misspelt-bg",
  incorrect: "underline decoration-prep-incorrect decoration-wavy decoration-2 underline-offset-4 bg-prep-incorrect-bg",
};
const kindLabel: Record<Kind, string> = { awarded: "Correct", misspelt: "Misspelt / incomplete", incorrect: "Incorrect" };
const toolButton =
  "flex min-h-11 items-center gap-2 rounded-xl border border-prep-input bg-prep-surface px-3.5 text-sm font-semibold hover:bg-prep-ground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-prep-primary";

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** The selected characters inside `root`, as offsets into the answer text, without surrounding spaces. */
function selectionOffsets(root: HTMLElement, text: string): { start: number; end: number } | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
  const range = sel.getRangeAt(0);
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return null;
  const before = document.createRange();
  before.selectNodeContents(root);
  before.setEnd(range.startContainer, range.startOffset);
  let start = before.toString().length;
  let end = start + range.toString().length;
  while (start < end && /\s/.test(text[start])) start++;
  while (end > start && /\s/.test(text[end - 1])) end--;
  return end > start ? { start, end } : null;
}

export function MarkingForm({ item, nextHref, skipHref }: { item: MarkingItem; nextHref: string; skipHref: string | null }) {
  const router = useRouter();
  const answerRef = useRef<HTMLParagraphElement>(null);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [points, setPoints] = useState<string[]>(item.markingPoints.map(() => ""));
  const [total, setTotal] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string>();
  const [hint, setHint] = useState<string>();
  const [pending, startTransition] = useTransition();

  const awarded = item.markingPoints.length ? points.reduce((s, p) => s + (Number(p) || 0), 0) : Number(total) || 0;

  const apply = (kind: Kind | null) => {
    const root = answerRef.current;
    const at = root && selectionOffsets(root, item.answer);
    if (!at) {
      setHint("Select some words in the answer first.");
      return;
    }
    setHint(undefined);
    setHighlights((hs) => {
      const kept = hs.filter((h) => h.end <= at.start || h.start >= at.end);
      return (kind ? [...kept, { ...at, kind }] : kept).sort((a, b) => a.start - b.start);
    });
    window.getSelection()?.removeAllRanges();
  };

  const submit = () => {
    setError(undefined);
    startTransition(async () => {
      const result = await returnMarkAction({
        attemptId: item.attemptId,
        questionId: item.questionId,
        points: item.markingPoints.length ? points.map((p) => Number(p)) : [],
        total: item.markingPoints.length ? null : total === "" ? null : Number(total),
        highlights,
        note,
      });
      if (result.error) setError(result.error);
      else router.push(nextHref);
    });
  };

  const parts: React.ReactNode[] = [];
  let at = 0;
  for (const [i, h] of highlights.entries()) {
    if (h.start > at) parts.push(item.answer.slice(at, h.start));
    parts.push(
      <span key={i} className={mark[h.kind]}>
        {item.answer.slice(h.start, h.end)}
      </span>,
    );
    at = h.end;
  }
  parts.push(item.answer.slice(at));

  const complete = item.markingPoints.length ? points.every((p) => p !== "") : total !== "";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-4 rounded-2xl border border-prep-line bg-prep-surface p-5">
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-prep-muted">
            {item.heading} · {fmt(item.marks)} marks
          </span>
          <p className="text-[15px] font-semibold whitespace-pre-line">{item.questionText}</p>
        </div>

        {item.answer.trim() ? (
          <>
            <div role="toolbar" aria-label="Mark selected words" className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-prep-muted">Select words, then mark them:</span>
              {(["awarded", "misspelt", "incorrect"] as const).map((k) => (
                <button key={k} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => apply(k)} className={toolButton}>
                  <span className={cn("w-4 border-b-2", k === "awarded" ? "border-prep-awarded" : k === "misspelt" ? "border-dotted border-prep-misspelt" : "border-prep-incorrect")} aria-hidden />
                  {kindLabel[k]}
                </button>
              ))}
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => apply(null)} className={cn(toolButton, "text-prep-muted")}>
                Clear
              </button>
            </div>
            {hint ? (
              <p role="status" className="text-sm text-prep-flag-ink">
                {hint}
              </p>
            ) : null}
            <p ref={answerRef} className="rounded-xl border border-prep-line bg-prep-ground/50 p-4 text-base leading-[1.9] whitespace-pre-wrap">
              {parts}
            </p>
            {highlights.length ? (
              <ul aria-label="Marked words" className="flex flex-wrap gap-2 text-[13px]">
                {highlights.map((h, i) => (
                  <li key={i} className="flex items-center gap-1.5 rounded-lg border border-prep-line bg-prep-surface px-2.5 py-1">
                    <b>“{item.answer.slice(h.start, h.end)}”</b>
                    <span className="text-prep-muted">{kindLabel[h.kind]}</span>
                    <button
                      type="button"
                      onClick={() => setHighlights((hs) => hs.filter((_, j) => j !== i))}
                      className="ml-1 rounded px-1 text-prep-muted hover:bg-prep-ground hover:text-prep-ink"
                      aria-label={`Remove mark on ${item.answer.slice(h.start, h.end)}`}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        ) : (
          <p className="rounded-xl border border-dashed border-prep-line p-4 text-sm text-prep-muted">The student didn&apos;t write anything for this question.</p>
        )}
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-prep-line bg-prep-surface p-5">
        <h2 className="font-bold">{item.markingPoints.length ? "Rubric" : "Mark"}</h2>
        {item.markingPoints.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {item.markingPoints.map((p, i) => (
              <div key={i}>
                <label htmlFor={`point-${i}`} className="mb-1.5 block text-sm font-semibold">
                  {p.description} (out of {fmt(p.marks)})
                </label>
                <input
                  id={`point-${i}`}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={p.marks}
                  step={0.5}
                  required
                  value={points[i]}
                  onChange={(e) => setPoints((ps) => ps.map((x, j) => (j === i ? e.target.value : x)))}
                  className="block min-h-[52px] w-full rounded-xl border border-prep-input bg-prep-surface px-4 text-base tabular-nums focus-visible:border-prep-primary focus-visible:outline-2 focus-visible:outline-prep-primary"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="max-w-[220px]">
            <label htmlFor="total" className="mb-1.5 block text-sm font-semibold">
              Mark (out of {fmt(item.marks)})
            </label>
            <input
              id="total"
              type="number"
              inputMode="decimal"
              min={0}
              max={item.marks}
              step={0.5}
              required
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              className="block min-h-[52px] w-full rounded-xl border border-prep-input bg-prep-surface px-4 text-base tabular-nums focus-visible:border-prep-primary focus-visible:outline-2 focus-visible:outline-prep-primary"
            />
          </div>
        )}
        <div>
          <label htmlFor="note" className="mb-1.5 block text-sm font-semibold">
            Note to student <span className="font-normal text-prep-muted">(optional)</span>
          </label>
          <textarea
            id="note"
            rows={3}
            maxLength={2000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="block w-full rounded-xl border border-prep-input bg-prep-surface px-4 py-3 text-base focus-visible:border-prep-primary focus-visible:outline-2 focus-visible:outline-prep-primary"
          />
        </div>
        <FormMessage error={error} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className={cn("text-base font-bold tabular-nums", awarded > item.marks && "text-prep-incorrect")}>
            Total: {fmt(awarded)} / {fmt(item.marks)}
          </span>
          <div className="flex flex-wrap gap-2">
            {skipHref ? (
              <Link
                href={skipHref}
                className="flex min-h-11 items-center rounded-xl border border-prep-input bg-prep-surface px-5 text-sm font-semibold hover:bg-prep-ground"
              >
                Skip
              </Link>
            ) : null}
            <button
              type="submit"
              disabled={pending || !complete}
              className="flex min-h-11 items-center rounded-xl bg-prep-primary px-5 text-sm font-bold text-white hover:bg-prep-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-prep-primary disabled:opacity-60"
            >
              {pending ? "Returning…" : "Return to student · next"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
