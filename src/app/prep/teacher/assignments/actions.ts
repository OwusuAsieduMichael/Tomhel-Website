"use server";

import { revalidatePath } from "next/cache";
import { sheetProblemMessage } from "@/lib/prep/errors";
import { redirect } from "next/navigation";
import { z } from "zod";
import { AssignmentError, assignmentFromForm, deleteAssignment, releaseSolutions, saveAssignment, sendReminder } from "@/lib/prep/assignments";
import { requireRole } from "@/lib/prep/auth/current-user";
import { getStore } from "@/lib/prep/store";

export type AssignmentFormState = { error?: string };

export async function saveAssignmentAction(_prev: AssignmentFormState, formData: FormData): Promise<AssignmentFormState> {
  const user = await requireRole("teacher", "admin");
  const id = z.string().uuid().optional().safeParse(formData.get("id") || undefined);
  const parsed = assignmentFromForm(formData);
  if (!id.success) return { error: "Unknown assignment." };
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  let savedId: string;
  try {
    savedId = await saveAssignment(getStore(), user, parsed.data, id.data);
  } catch (e) {
    if (e instanceof AssignmentError) return { error: e.message };
    const problem = sheetProblemMessage(e);
    if (problem) return { error: problem };
    throw e;
  }
  revalidatePath("/prep/teacher", "layout");
  redirect(`/prep/teacher/assignments/${savedId}`);
}

const idSchema = z.string().uuid();

export async function deleteAssignmentAction(_prev: AssignmentFormState, formData: FormData): Promise<AssignmentFormState> {
  const user = await requireRole("teacher", "admin");
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "Unknown assignment." };
  try {
    await deleteAssignment(getStore(), user, id.data);
  } catch (e) {
    if (e instanceof AssignmentError) return { error: e.message };
    const problem = sheetProblemMessage(e);
    if (problem) return { error: problem };
    throw e;
  }
  revalidatePath("/prep/teacher", "layout");
  redirect("/prep/teacher/assignments");
}

export type ReminderState = { error?: string; sent?: number };

export async function sendReminderAction(_prev: ReminderState, formData: FormData): Promise<ReminderState> {
  const user = await requireRole("teacher", "admin");
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "Unknown assignment." };
  try {
    const sent = await sendReminder(getStore(), user, id.data);
    revalidatePath(`/prep/teacher/assignments/${id.data}`);
    return { sent };
  } catch (e) {
    if (e instanceof AssignmentError) return { error: e.message };
    const problem = sheetProblemMessage(e);
    if (problem) return { error: problem };
    throw e;
  }
}

export async function releaseSolutionsAction(_prev: AssignmentFormState, formData: FormData): Promise<AssignmentFormState> {
  const user = await requireRole("teacher", "admin");
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "Unknown assignment." };
  try {
    await releaseSolutions(getStore(), user, id.data);
  } catch (e) {
    if (e instanceof AssignmentError) return { error: e.message };
    const problem = sheetProblemMessage(e);
    if (problem) return { error: problem };
    throw e;
  }
  revalidatePath(`/prep/teacher/assignments/${id.data}`);
  return {};
}
