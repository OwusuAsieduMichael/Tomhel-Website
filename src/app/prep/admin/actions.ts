"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  AccountError,
  createAccount,
  importStudents,
  resetPassword,
  setAccountActive,
  type ImportResult,
} from "@/lib/prep/admin/people";
import {
  approveAllOnPaper,
  importPaper,
  saveQuestion,
  setQuestionStatus,
  type PaperImportResult,
} from "@/lib/prep/admin/question-bank";
import { requireRole } from "@/lib/prep/auth/current-user";
import { getStore, ROLES } from "@/lib/prep/store";

/** A password shown once to the admin, to hand to the user. Never stored in plain text. */
export type IssuedPassword = { loginId: string; name: string; tempPassword: string };

export type AccountFormState = { error?: string; issued?: IssuedPassword };

const createSchema = z.object({
  loginId: z.string().trim().min(1, "Enter the Student ID or Staff ID.").max(32),
  name: z.string().trim().min(1, "Enter the person's name.").max(120),
  role: z.enum(ROLES),
  classId: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
});

export async function createAccountAction(_prev: AccountFormState, formData: FormData): Promise<AccountFormState> {
  await requireRole("admin");
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const { tempPassword } = await createAccount(getStore(), parsed.data);
    revalidatePath("/prep/admin", "layout");
    return { issued: { loginId: parsed.data.loginId.toUpperCase(), name: parsed.data.name, tempPassword } };
  } catch (e) {
    if (e instanceof AccountError) return { error: e.message };
    throw e;
  }
}

const userIdSchema = z.string().uuid();

export async function resetPasswordAction(_prev: AccountFormState, formData: FormData): Promise<AccountFormState> {
  await requireRole("admin");
  const userId = userIdSchema.safeParse(formData.get("userId"));
  if (!userId.success) return { error: "Unknown account." };
  try {
    const { loginId, tempPassword } = await resetPassword(getStore(), userId.data);
    revalidatePath("/prep/admin/people");
    return { issued: { loginId, name: String(formData.get("name") ?? ""), tempPassword } };
  } catch (e) {
    if (e instanceof AccountError) return { error: e.message };
    throw e;
  }
}

export async function setActiveAction(_prev: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const admin = await requireRole("admin");
  const userId = userIdSchema.safeParse(formData.get("userId"));
  if (!userId.success) return { error: "Unknown account." };
  try {
    await setAccountActive(getStore(), admin.id, userId.data, formData.get("active") === "true");
    revalidatePath("/prep/admin/people");
    return {};
  } catch (e) {
    if (e instanceof AccountError) return { error: e.message };
    throw e;
  }
}

export type ImportFormState = { error?: string; result?: ImportResult };

const MAX_CSV_BYTES = 512 * 1024;

export async function importStudentsAction(_prev: ImportFormState, formData: FormData): Promise<ImportFormState> {
  await requireRole("admin");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a CSV file to upload." };
  if (file.size > MAX_CSV_BYTES) return { error: "That file is too big. Class lists should be well under 500 KB." };

  const result = await importStudents(getStore(), await file.text());
  if (!result.problems.length) revalidatePath("/prep/admin", "layout");
  return { result };
}

// ---------------------------------------------------------------------------
// Question bank
// ---------------------------------------------------------------------------

export type PaperImportFormState = { error?: string; result?: PaperImportResult };

const MAX_PAPER_BYTES = 2 * 1024 * 1024;

export async function importPaperAction(_prev: PaperImportFormState, formData: FormData): Promise<PaperImportFormState> {
  await requireRole("admin");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a paper file (.json) to upload." };
  if (file.size > MAX_PAPER_BYTES) return { error: "That file is too big for one paper (over 2 MB)." };

  let json: unknown;
  try {
    json = JSON.parse(await file.text());
  } catch {
    return { error: "That file isn't valid JSON. Export a paper to see the expected format." };
  }
  const result = await importPaper(getStore(), json);
  if (result.ok) revalidatePath("/prep/admin", "layout");
  return { result };
}

const paperIdSchema = z.string().uuid();

export async function approveAllAction(formData: FormData) {
  await requireRole("admin");
  const paperId = paperIdSchema.parse(formData.get("paperId"));
  await approveAllOnPaper(getStore(), paperId);
  revalidatePath("/prep/admin", "layout");
}

export async function setQuestionStatusAction(formData: FormData) {
  await requireRole("admin");
  const questionId = z.string().uuid().parse(formData.get("questionId"));
  const status = z.enum(["draft", "approved"]).parse(formData.get("status"));
  await setQuestionStatus(getStore(), [questionId], status);
  revalidatePath("/prep/admin", "layout");
}

export type SaveQuestionState = { problems?: string[]; saved?: boolean };

export async function saveQuestionAction(
  questionId: string,
  question: unknown,
  approved: boolean,
): Promise<SaveQuestionState> {
  await requireRole("admin");
  const id = z.string().uuid().safeParse(questionId);
  if (!id.success) return { problems: ["Unknown question."] };
  const result = await saveQuestion(getStore(), id.data, question, approved);
  if (!result.ok) return { problems: result.problems };
  revalidatePath("/prep/admin", "layout");
  return { saved: true };
}
