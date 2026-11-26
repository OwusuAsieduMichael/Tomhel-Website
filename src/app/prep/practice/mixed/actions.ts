"use server";

import { z } from "zod";
import { requireRole } from "@/lib/prep/auth/current-user";
import { sheetProblemMessage } from "@/lib/prep/errors";
import { AttemptError } from "@/lib/prep/practice/attempts";
import { answerMixed, nextMixedBatch, type MixedItem, type MixedResult } from "@/lib/prep/practice/mixed";
import { getStore } from "@/lib/prep/store";

const code = z.string().regex(/^[A-Za-z0-9-]{1,16}$/);

/** More questions for a mixed practice session, leaving out those already queued on screen. */
export async function nextMixedAction(subjectCode: string, exclude: string[]): Promise<{ items: MixedItem[] } | { error: string }> {
  const user = await requireRole("student");
  const parsed = z.object({ code, exclude: z.array(z.string().regex(/^[0-9a-f]{16}$/)).max(200) }).safeParse({ code: subjectCode, exclude });
  if (!parsed.success) return { error: "That subject couldn't be read." };
  try {
    const { items } = await nextMixedBatch(getStore(), user.id, parsed.data.code, parsed.data.exclude);
    return { items };
  } catch (e) {
    if (e instanceof AttemptError) return { error: e.message };
    return { error: sheetProblemMessage(e) ?? "Couldn't load more questions. Check your connection and try again." };
  }
}

const answerSchema = z.object({
  choice: z.string().regex(/^[A-E]$/).optional(),
  text: z.string().max(5000).optional(),
  selfCheck: z.enum(["got", "not"]).optional(),
});

/** Marks one answer and records it, so a wrong one keeps coming back. */
export async function answerMixedAction(questionId: string, answer: unknown): Promise<MixedResult | { error: string }> {
  const user = await requireRole("student");
  const id = z.string().uuid().safeParse(questionId);
  const parsed = answerSchema.safeParse(answer);
  if (!id.success || !parsed.success) return { error: "That answer couldn't be read." };
  try {
    return await answerMixed(getStore(), user.id, id.data, parsed.data);
  } catch (e) {
    if (e instanceof AttemptError) return { error: e.message };
    return { error: sheetProblemMessage(e) ?? "Your answer wasn't saved. Check your connection and try again." };
  }
}
