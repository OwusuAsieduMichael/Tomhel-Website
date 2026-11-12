"use server";

import { redirect } from "next/navigation";
import { sheetProblemMessage } from "@/lib/prep/errors";
import { z } from "zod";
import { startAssignmentAttempt } from "@/lib/prep/assignments";
import { requireRole } from "@/lib/prep/auth/current-user";
import { AttemptError, saveAnswers, startAttempt, submitAttempt } from "@/lib/prep/practice/attempts";
import { getStore } from "@/lib/prep/store";

export type StartState = { error?: string };

const startSchema = z.object({
  paperId: z.string().uuid("Choose a paper."),
  mode: z.enum(["practice", "full"]),
  time: z.union([z.literal("none"), z.coerce.number().int().min(5).max(240)]),
});

export async function startAttemptAction(_prev: StartState, formData: FormData): Promise<StartState> {
  const user = await requireRole("student");
  const parsed = startSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  let id: string;
  try {
    ({ id } = await startAttempt(getStore(), user.id, {
      paperId: parsed.data.paperId,
      mode: parsed.data.mode,
      timeLimitMinutes: parsed.data.time === "none" ? null : parsed.data.time,
    }));
  } catch (e) {
    if (e instanceof AttemptError) return { error: e.message };
    const problem = sheetProblemMessage(e);
    if (problem) return { error: problem };
    throw e;
  }
  redirect(`/prep/practice/${id}`);
}

export async function startAssignmentAction(_prev: StartState, formData: FormData): Promise<StartState> {
  const user = await requireRole("student");
  const assignmentId = z.string().uuid().safeParse(formData.get("assignmentId"));
  if (!assignmentId.success) return { error: "That work isn't set for you." };
  let id: string;
  try {
    ({ id } = await startAssignmentAttempt(getStore(), user, assignmentId.data));
  } catch (e) {
    if (e instanceof AttemptError) return { error: e.message };
    const problem = sheetProblemMessage(e);
    if (problem) return { error: problem };
    throw e;
  }
  redirect(`/prep/practice/${id}`);
}

export type SaveResult = { status: "saved" | "submitted" } | { status: "error"; message: string };

export async function saveAnswersAction(attemptId: string, answers: unknown): Promise<SaveResult> {
  const user = await requireRole("student");
  try {
    return await saveAnswers(getStore(), user.id, z.string().uuid().parse(attemptId), answers);
  } catch (e) {
    if (e instanceof AttemptError) return { status: "error", message: e.message };
    const problem = sheetProblemMessage(e);
    if (problem) return { status: "error", message: problem };
    throw e;
  }
}

export async function submitAttemptAction(attemptId: string, answers: unknown): Promise<{ error: string } | never> {
  const user = await requireRole("student");
  try {
    await submitAttempt(getStore(), user.id, z.string().uuid().parse(attemptId), answers);
  } catch (e) {
    if (e instanceof AttemptError) return { error: e.message };
    const problem = sheetProblemMessage(e);
    if (problem) return { error: problem };
    throw e;
  }
  redirect(`/prep/practice/${attemptId}/results`);
}
