"use client";

import { useActionState } from "react";
import { Field, FormMessage, prepButton } from "@/components/prep/ui";
import { cn } from "@/lib/utils";
import { loginAction, type FormState } from "../actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(loginAction, {});

  return (
    <form action={action} className="space-y-5" noValidate>
      <FormMessage error={state.error} />
      <Field
        label="Student ID or staff ID"
        name="loginId"
        autoComplete="username"
        autoCapitalize="characters"
        spellCheck={false}
        required
        placeholder="e.g. S0001"
      />
      <Field label="Password" name="password" type="password" autoComplete="current-password" required />
      <button type="submit" className={cn(prepButton({ block: true }), "min-h-[54px] text-base")} disabled={pending}>
        {pending ? "Logging in…" : "Log in"}
      </button>
    </form>
  );
}
