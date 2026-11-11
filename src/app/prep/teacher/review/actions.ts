"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/prep/auth/current-user";
import { answerQuery, answerQuerySchema, changeMark, changeMarkSchema, markInputSchema, returnMark, ReviewError } from "@/lib/prep/review";
import { getStore } from "@/lib/prep/store";

type Result = { error?: string };

async function run(fn: () => Promise<void>): Promise<Result> {
  try {
    await fn();
  } catch (e) {
    if (e instanceof ReviewError) return { error: e.message };
    throw e;
  }
  revalidatePath("/prep/teacher", "layout");
  return {};
}

export async function returnMarkAction(input: unknown): Promise<Result> {
  const user = await requireRole("teacher", "admin");
  const parsed = markInputSchema.safeParse(input);
  if (!parsed.success) return { error: "Those marks couldn't be read. Check every box has a number." };
  return run(() => returnMark(getStore(), user, parsed.data));
}

export async function answerQueryAction(input: unknown): Promise<Result> {
  const user = await requireRole("teacher", "admin");
  const parsed = answerQuerySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  return run(() => answerQuery(getStore(), user, parsed.data));
}

export async function changeMarkAction(input: unknown): Promise<Result> {
  const user = await requireRole("teacher", "admin");
  const parsed = changeMarkSchema.safeParse(input);
  if (!parsed.success) return { error: "Enter the new mark as a number." };
  return run(() => changeMark(getStore(), user, parsed.data));
}
