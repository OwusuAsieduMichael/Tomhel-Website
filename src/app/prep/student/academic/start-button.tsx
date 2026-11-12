"use client";

import { useActionState } from "react";
import { startAssignmentAction, type StartState } from "@/app/prep/practice/actions";

export function StartAssignmentButton({ assignmentId, label, confirmText }: { assignmentId: string; label: string; confirmText?: string }) {
  const [state, action, pending] = useActionState<StartState, FormData>(startAssignmentAction, {});
  return (
    <form
      action={action}
      className="flex flex-col items-end gap-1.5"
      onSubmit={(e) => {
        if (confirmText && !confirm(confirmText)) e.preventDefault();
      }}
    >
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <button
        type="submit"
        disabled={pending}
        className="flex min-h-11 items-center rounded-xl bg-prep-primary px-4 text-sm font-bold text-white hover:bg-prep-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-prep-primary disabled:opacity-60"
      >
        {pending ? "Starting…" : label}
      </button>
      {state.error ? (
        <p role="alert" className="text-right text-[13px] text-prep-incorrect">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
