"use client";

import { useActionState } from "react";
import { FormMessage, prepButton } from "@/components/prep/ui";
import { BellRing } from "lucide-react";
import { deleteAssignmentAction, releaseSolutionsAction, sendReminderAction, type AssignmentFormState, type ReminderState } from "../actions";

export function ReleaseSolutionsButton({ id }: { id: string }) {
  const [state, action, pending] = useActionState<AssignmentFormState, FormData>(releaseSolutionsAction, {});
  return (
    <form action={action} className="contents">
      <input type="hidden" name="id" value={id} />
      <button type="submit" disabled={pending} className={prepButton()}>
        {pending ? "Releasing…" : "Release solutions"}
      </button>
      {state.error ? <FormMessage error={state.error} /> : null}
    </form>
  );
}

export function RemindButton({ id, waiting, disabled, remindedAt }: { id: string; waiting: number; disabled: boolean; remindedAt: string | null }) {
  const [state, action, pending] = useActionState<ReminderState, FormData>(sendReminderAction, {});
  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <input type="hidden" name="id" value={id} />
      <button type="submit" disabled={pending || disabled || state.sent !== undefined} className={prepButton({ variant: "secondary" })}>
        <BellRing aria-hidden />
        {pending ? "Sending…" : state.sent !== undefined ? `Reminded ${state.sent}` : `Remind ${waiting} not submitted`}
      </button>
      {state.error ? (
        <p role="alert" className="text-xs text-prep-incorrect">
          {state.error}
        </p>
      ) : disabled && remindedAt && state.sent === undefined ? (
        <p className="text-xs text-prep-muted">Reminded at {remindedAt}. Again in an hour.</p>
      ) : null}
    </form>
  );
}

export function DeleteAssignmentButton({ id }: { id: string }) {
  const [state, action, pending] = useActionState<AssignmentFormState, FormData>(deleteAssignmentAction, {});
  return (
    <form
      action={action}
      className="contents"
      onSubmit={(e) => {
        if (!confirm("Delete this assignment? This can't be undone.")) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" disabled={pending} className={prepButton({ variant: "ghost" })}>
        {pending ? "Deleting…" : "Delete"}
      </button>
      {state.error ? <FormMessage error={state.error} /> : null}
    </form>
  );
}
