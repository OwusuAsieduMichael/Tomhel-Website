"use client";

import { useActionState, useEffect, useRef } from "react";
import { changePasswordAction, type FormState } from "@/app/prep/actions";
import { Field, FormMessage, prepButton } from "./ui";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(changePasswordAction, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-4" noValidate>
      <FormMessage error={state.error} success={state.success} />
      <Field label="Current password" name="current" type="password" autoComplete="current-password" required />
      <Field label="New password" name="next" type="password" autoComplete="new-password" hint="At least 8 characters." required />
      <Field label="Confirm new password" name="confirm" type="password" autoComplete="new-password" required />
      <button type="submit" className={prepButton()} disabled={pending}>
        {pending ? "Saving…" : "Change password"}
      </button>
    </form>
  );
}
