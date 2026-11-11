"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { changeMarkAction } from "../../review/actions";

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** "Change mark" for one answer: a new total and an optional note to the student. */
export function ChangeMark({ attemptId, questionId, awarded, marks }: { attemptId: string; questionId: string; awarded: number; marks: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mark, setMark] = useState(fmt(awarded));
  const [note, setNote] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="min-h-11 rounded-xl px-3 text-sm font-semibold text-prep-primary hover:bg-prep-primary-soft">
        Change mark
      </button>
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(undefined);
        startTransition(async () => {
          const r = await changeMarkAction({ attemptId, questionId, awarded: Number(mark), note });
          if (r.error) setError(r.error);
          else {
            setOpen(false);
            router.refresh();
          }
        });
      }}
      className="flex w-full flex-col gap-2.5 rounded-xl border border-prep-line bg-prep-ground/60 p-3.5"
    >
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-32">
          <label htmlFor={`m-${questionId}`} className="mb-1 block text-sm font-semibold">
            New mark / {fmt(marks)}
          </label>
          <input
            id={`m-${questionId}`}
            type="number"
            inputMode="decimal"
            min={0}
            max={marks}
            step={0.5}
            required
            value={mark}
            onChange={(e) => setMark(e.target.value)}
            className="block min-h-11 w-full rounded-xl border border-prep-input bg-prep-surface px-3 tabular-nums"
          />
        </div>
        <div className="min-w-[200px] flex-1">
          <label htmlFor={`n-${questionId}`} className="mb-1 block text-sm font-semibold">
            Note to student <span className="font-normal text-prep-muted">(optional)</span>
          </label>
          <input id={`n-${questionId}`} value={note} maxLength={2000} onChange={(e) => setNote(e.target.value)} className="block min-h-11 w-full rounded-xl border border-prep-input bg-prep-surface px-3" />
        </div>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-prep-incorrect">
          {error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <button type="submit" disabled={pending || mark === ""} className="min-h-11 rounded-xl bg-prep-primary px-4 text-sm font-bold text-white disabled:opacity-60">
          {pending ? "Saving…" : "Save mark"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded-xl px-4 text-sm font-semibold hover:bg-prep-surface">
          Cancel
        </button>
      </div>
    </form>
  );
}
