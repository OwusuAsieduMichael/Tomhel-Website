"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parseCedis } from "@/lib/payments/money";
import { PaymentError, saveCampaign, setCampaignStatus, setFee } from "@/lib/payments/payments";
import { requireRole } from "@/lib/prep/auth/current-user";
import { sheetProblemMessage } from "@/lib/prep/errors";
import { getStore, TERMS } from "@/lib/prep/store";

export type PaymentsFormState = { error?: string; success?: string };

const refresh = () => {
  revalidatePath("/prep/admin/payments");
  revalidatePath("/donate");
};

const fail = (e: unknown): PaymentsFormState => {
  if (e instanceof PaymentError) return { error: e.message };
  const p = sheetProblemMessage(e);
  if (p) return { error: p };
  throw e;
};

/** Saves the fees for one class: one amount per term (empty = none). */
export async function saveClassFeesAction(_prev: PaymentsFormState, formData: FormData): Promise<PaymentsFormState> {
  await requireRole("admin");
  const classId = z.string().uuid().safeParse(formData.get("classId"));
  if (!classId.success) return { error: "Unknown class." };
  try {
    for (const term of TERMS) {
      const raw = String(formData.get(term) ?? "").trim();
      const amount = raw === "" ? 0 : parseCedis(raw);
      if (amount === null) return { error: `${term}: enter the fee in cedis, e.g. 1200 or 1200.50.` };
      await setFee(getStore(), classId.data, term, amount);
    }
  } catch (e) {
    return fail(e);
  }
  refresh();
  return { success: "Saved. Parents see these fees on the Pay Fees page." };
}

export async function saveCampaignAction(_prev: PaymentsFormState, formData: FormData): Promise<PaymentsFormState> {
  await requireRole("admin");
  const id = z.string().uuid().optional().safeParse(formData.get("id") || undefined);
  if (!id.success) return { error: "Unknown project." };
  const goalRaw = String(formData.get("goal") ?? "").trim();
  const goal = goalRaw === "" ? 0 : parseCedis(goalRaw);
  if (goal === null) return { error: "Enter the goal in cedis, or leave it empty." };
  try {
    await saveCampaign(getStore(), { title: String(formData.get("title") ?? ""), description: String(formData.get("description") ?? ""), goal }, id.data);
  } catch (e) {
    return fail(e);
  }
  refresh();
  return { success: id.data ? "Project updated." : "Project added. It is on the Donate page now." };
}

export async function campaignStatusAction(formData: FormData) {
  await requireRole("admin");
  const id = z.string().uuid().safeParse(formData.get("id"));
  const status = z.enum(["open", "closed"]).safeParse(formData.get("status"));
  if (!id.success || !status.success) return;
  await setCampaignStatus(getStore(), id.data, status.data);
  refresh();
}
