"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormMessage, prepButton } from "@/components/prep/ui";
import { importPaperAction, type PaperImportFormState } from "../actions";

export function ImportPaperForm() {
  const [state, action, pending] = useActionState<PaperImportFormState, FormData>(importPaperAction, {});
  const r = state.result;

  return (
    <div className="space-y-4">
      <form action={action} className="space-y-4" noValidate>
        <FormMessage error={state.error} />
        <div className="space-y-1.5">
          <label htmlFor="paper-file" className="block text-sm font-semibold">
            Paper file (JSON)
          </label>
          <input
            id="paper-file"
            name="file"
            type="file"
            accept=".json,application/json"
            required
            aria-describedby="paper-hint"
            className="block w-full text-sm file:mr-3 file:min-h-11 file:rounded-xl file:border file:border-prep-line file:bg-prep-surface file:px-4 file:font-semibold"
          />
          <p id="paper-hint" className="text-sm text-prep-muted">
            One paper per file. Export any paper below to see the format. New and changed questions arrive as drafts for you to
            check and approve; students only see approved questions.
          </p>
        </div>
        <button type="submit" className={prepButton({ variant: "secondary" })} disabled={pending}>
          {pending ? "Importing…" : "Import paper"}
        </button>
      </form>

      {r && !r.ok ? (
        <div role="alert" className="rounded-xl border border-prep-incorrect/30 bg-prep-incorrect-bg px-4 py-3 text-sm text-prep-incorrect">
          <p className="font-semibold">Nothing was imported. Fix these problems and try again:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {r.problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {r?.ok ? (
        <div role="status" className="space-y-2 rounded-xl border border-prep-awarded/30 bg-prep-primary-soft px-4 py-3 text-sm">
          <p>
            <span className="font-semibold">{r.created} new</span>, {r.changed} changed (back to draft), {r.unchanged} unchanged.
          </p>
          {r.notInFile.length ? (
            <p className="text-prep-misspelt">
              Already on this paper but not in the file (kept): {r.notInFile.join(", ")}.
            </p>
          ) : null}
          <Link href={`/prep/admin/questions/${r.paperId}`} className="font-semibold text-prep-primary underline">
            Review the paper
          </Link>
        </div>
      ) : null}
    </div>
  );
}
