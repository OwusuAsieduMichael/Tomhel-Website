"use server";

import { revalidatePath } from "next/cache";
import { sheetProblemMessage } from "@/lib/prep/errors";
import { requireRole } from "@/lib/prep/auth/current-user";
import { markNoticesRead } from "@/lib/prep/notices";
import { raiseQuery, raiseQuerySchema, ReviewError } from "@/lib/prep/review";
import { getStore } from "@/lib/prep/store";

export async function markNoticesReadAction() {
  const user = await requireRole("student");
  await markNoticesRead(getStore(), user.id);
  revalidatePath("/prep/student", "layout");
}

export type QueryState = { error?: string; sent?: boolean };

export async function raiseQueryAction(_prev: QueryState, formData: FormData): Promise<QueryState> {
  const user = await requireRole("student");
  const parsed = raiseQuerySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    await raiseQuery(getStore(), user, parsed.data);
  } catch (e) {
    if (e instanceof ReviewError) return { error: e.message };
    const problem = sheetProblemMessage(e);
    if (problem) return { error: problem };
    throw e;
  }
  revalidatePath(`/prep/practice/${parsed.data.attemptId}/results`);
  return { sent: true };
}
