"use client";

import { useActionState, useState } from "react";
import { raiseQueryAction, type QueryState } from "@/app/prep/student/actions";

type Query = { status: "open" | "answered"; message: string; reply: string | null } | null;

/** "Ask your teacher to check this mark", or the query already sent and its reply. */
export function MarkQuery({ attemptId, questionId, query }: { attemptId: string; questionId: string; query: Query }) {
  const [state, action, pending] = useActionState<QueryState, FormData>(raiseQueryAction, {});
  const [open, setOpen] = useState(false);

  if (query && !(query.status === "answered" && open)) {
    return (
      <div className="flex flex-col gap-1.5 rounded-xl border border-prep-line bg-prep-surface px-3.5 py-3 text-sm">
        <p>
          <span className="font-semibold">You asked:</span> {query.message}
        </p>
        {query.status === "open" ? (
          <p className="text-prep-flag-ink">Waiting for your teacher to reply.</p>
        ) : (
          <>
            <p>
              <span className="font-semibold text-prep-primary">Your teacher replied:</span> {query.reply}
            </p>
            <button type="button" onClick={() => setOpen(true)} className="self-start text-[13px] font-semibold text-prep-muted underline">
              Ask again
            </button>
          </>
        )}
      </div>
    );
  }
  if (state.sent) {
    return (
      <p role="status" className="rounded-xl bg-prep-primary-soft px-3.5 py-3 text-sm text-prep-awarded">
        Sent. Your teacher will check the mark and reply.
      </p>
    );
  }
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="min-h-11 self-start rounded-xl px-1 text-[13px] font-semibold text-prep-muted underline-offset-2 hover:text-prep-ink hover:underline">
        Think this mark is wrong? Ask your teacher
      </button>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-2 rounded-xl border border-prep-line bg-prep-surface p-3.5">
      <input type="hidden" name="attemptId" value={attemptId} />
      <input type="hidden" name="questionId" value={questionId} />
      <label htmlFor={`query-${questionId}`} className="text-sm font-semibold">
        What do you think is wrong with the mark?
      </label>
      <textarea
        id={`query-${questionId}`}
        name="message"
        rows={3}
        required
        minLength={5}
        maxLength={1000}
        className="block w-full rounded-xl border border-prep-input bg-prep-surface px-3.5 py-2.5 text-base focus-visible:border-prep-primary focus-visible:outline-2 focus-visible:outline-prep-primary"
      />
      {state.error ? (
        <p role="alert" className="text-sm text-prep-incorrect">
          {state.error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="min-h-11 rounded-xl bg-prep-primary px-4 text-sm font-bold text-white disabled:opacity-60">
          {pending ? "Sending…" : "Send to my teacher"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded-xl px-4 text-sm font-semibold hover:bg-prep-ground">
          Cancel
        </button>
      </div>
    </form>
  );
}
