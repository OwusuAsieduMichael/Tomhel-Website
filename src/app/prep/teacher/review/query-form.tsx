"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FormMessage } from "@/components/prep/ui";
import { answerQueryAction } from "./actions";

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export type QueryItem = {
  queryId: string;
  attemptId: string;
  heading: string;
  questionText: string;
  answer: string;
  message: string;
  awarded: number;
  marks: number;
};

/** Replying to a student's mark query, optionally with a new mark. */
export function QueryForm({ item, nextHref, skipHref }: { item: QueryItem; nextHref: string; skipHref: string | null }) {
  const router = useRouter();
  const [mark, setMark] = useState(fmt(item.awarded));
  const [reply, setReply] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const changed = mark !== "" && Number(mark) !== item.awarded;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(undefined);
        startTransition(async () => {
          const r = await answerQueryAction({ queryId: item.queryId, reply, awarded: changed ? Number(mark) : null });
          if (r.error) setError(r.error);
          else router.push(nextHref);
        });
      }}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-4 rounded-2xl border border-prep-line bg-prep-surface p-5">
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-prep-muted">Mark query · {item.heading}</span>
          <p className="text-[15px] font-semibold whitespace-pre-line">{item.questionText}</p>
        </div>
        <section className="flex flex-col gap-1.5">
          <h3 className="text-xs font-bold tracking-wide text-prep-muted">THE STUDENT ASKS</h3>
          <p className="rounded-xl bg-prep-misspelt-bg px-4 py-3 text-sm whitespace-pre-line">{item.message}</p>
        </section>
        <section className="flex flex-col gap-1.5">
          <h3 className="text-xs font-bold tracking-wide text-prep-muted">THEIR ANSWER</h3>
          <p className="rounded-xl border border-prep-line bg-prep-ground/50 p-4 text-base leading-relaxed whitespace-pre-wrap">{item.answer || "—"}</p>
          <Link href={`/prep/teacher/attempts/${item.attemptId}`} className="text-sm font-semibold text-prep-primary hover:underline">
            See the whole attempt
          </Link>
        </section>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-prep-line bg-prep-surface p-5">
        <h2 className="font-bold">Your answer</h2>
        <div className="max-w-[240px]">
          <label htmlFor="newMark" className="mb-1.5 block text-sm font-semibold">
            Mark (out of {fmt(item.marks)})
          </label>
          <input
            id="newMark"
            type="number"
            inputMode="decimal"
            min={0}
            max={item.marks}
            step={0.5}
            required
            value={mark}
            onChange={(e) => setMark(e.target.value)}
            className="block min-h-[52px] w-full rounded-xl border border-prep-input bg-prep-surface px-4 text-base tabular-nums focus-visible:border-prep-primary focus-visible:outline-2 focus-visible:outline-prep-primary"
          />
          <p className="mt-1.5 text-[13px] text-prep-muted">{changed ? `Changes the mark from ${fmt(item.awarded)}.` : `Currently ${fmt(item.awarded)}. Leave it to keep the mark.`}</p>
        </div>
        <div>
          <label htmlFor="reply" className="mb-1.5 block text-sm font-semibold">
            Reply to the student
          </label>
          <textarea
            id="reply"
            rows={3}
            required
            maxLength={2000}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            className="block w-full rounded-xl border border-prep-input bg-prep-surface px-4 py-3 text-base focus-visible:border-prep-primary focus-visible:outline-2 focus-visible:outline-prep-primary"
          />
        </div>
        <FormMessage error={error} />
        <div className="flex flex-wrap justify-end gap-2">
          {skipHref ? (
            <Link href={skipHref} className="flex min-h-11 items-center rounded-xl border border-prep-input bg-prep-surface px-5 text-sm font-semibold hover:bg-prep-ground">
              Skip
            </Link>
          ) : null}
          <button
            type="submit"
            disabled={pending || !reply.trim() || mark === ""}
            className="flex min-h-11 items-center rounded-xl bg-prep-primary px-5 text-sm font-bold text-white hover:bg-prep-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-prep-primary disabled:opacity-60"
          >
            {pending ? "Sending…" : changed ? "Change mark and reply · next" : "Reply · next"}
          </button>
        </div>
      </div>
    </form>
  );
}
