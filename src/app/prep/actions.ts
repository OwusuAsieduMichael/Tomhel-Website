"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser, sessionCookieOptions } from "@/lib/prep/auth/current-user";
import { authenticate, loginErrorMessages } from "@/lib/prep/auth/login";
import { hashPassword, passwordProblem, verifyPassword } from "@/lib/prep/auth/password";
import { roleHome } from "@/lib/prep/auth/permissions";
import { createSessionToken, SESSION_COOKIE } from "@/lib/prep/auth/session";
import { getStore, update } from "@/lib/prep/store";

export type FormState = { error?: string; success?: string };

const loginSchema = z.object({
  loginId: z.string().trim().min(1, "Enter your Student ID or Staff ID.").max(32),
  password: z.string().min(1, "Enter your password.").max(128),
});

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({ loginId: formData.get("loginId"), password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const result = await authenticate(getStore(), parsed.data.loginId, parsed.data.password);
  if (!result.ok) return { error: loginErrorMessages[result.reason] };

  (await cookies()).set(SESSION_COOKIE, result.token, sessionCookieOptions(result.expiresAt));
  redirect(roleHome[result.role]);
}

export async function logoutAction() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/prep/login");
}

const changePasswordSchema = z
  .object({
    current: z.string().min(1, "Enter your current password."),
    next: z.string(),
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, { message: "The new passwords don't match.", path: ["confirm"] });

export async function changePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/prep/login");

  const parsed = changePasswordSchema.safeParse({
    current: formData.get("current"),
    next: formData.get("next"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const problem = passwordProblem(parsed.data.next);
  if (problem) return { error: problem };

  const store = getStore();
  const { users } = await store.read("users");
  const row = users.find((u) => u.id === user.id);
  if (!row || !(await verifyPassword(parsed.data.current, row.passwordHash))) {
    return { error: "Your current password is not correct." };
  }

  // Bumping the session version signs out every other device; this one gets a fresh cookie.
  const sessionVersion = row.sessionVersion + 1;
  await store.write([
    update("users", user.id, { passwordHash: await hashPassword(parsed.data.next), mustChangePassword: false, sessionVersion }),
  ]);
  const { token, expiresAt } = createSessionToken({ id: user.id, sessionVersion });
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));

  return { success: "Password changed. Other devices have been signed out." };
}
