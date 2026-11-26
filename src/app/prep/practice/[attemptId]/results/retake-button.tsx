"use client";

import { RotateCcw } from "lucide-react";
import { useActionState } from "react";
import { retakeAttemptAction, type StartState } from "../../actions";

/** Starts the same paper again, as it was taken last time. */
export function RetakeButton({ attemptId }: { attemptId: string }) {
  const [state, action, pending] = useActionState<StartState, FormData>(retakeAttemptAction, {});
  return (
    <form action={action} className="flex flex-1 flex-col gap-1.5">
      <input type="hidden" name="attemptId" value={attemptId} />
      <button
        type="submit"
        disabled={pending}
        className="flex h-[52px] items-center justify-center gap-2 rounded-xl bg-prep-primary text-[15px] font-bold text-white disabled:opacity-60 [&_svg]:size-4"
      >
        <RotateCcw aria-hidden /> {pending ? "Starting…" : "Retake test"}
      </button>
      {state.error ? (
        <p role="alert" className="text-sm text-prep-incorrect">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
