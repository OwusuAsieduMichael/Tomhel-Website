"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { parseCedis } from "@/lib/payments/money";
import { lookupFees, PaymentError, startDonation, startFeePayment } from "@/lib/payments/payments";
import { paystackFromEnv, PaystackError } from "@/lib/payments/paystack";
import { sheetProblemMessage } from "@/lib/prep/errors";
import { getStore } from "@/lib/prep/store";

/** Where Paystack sends the payer back: this same site (works on the vercel.app address and the school's domain). */
async function returnUrl() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}/pay/return`;
}

const text = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

function problem(e: unknown): string {
  if (e instanceof PaymentError) return e.message;
  if (e instanceof PaystackError) return `The payment service didn't accept this: ${e.message} Please try again, or contact the school.`;
  return sheetProblemMessage(e) ?? "Something went wrong. Please try again in a moment.";
}

export type LookupState = { error?: string; fees?: Awaited<ReturnType<typeof lookupFees>> };

export async function lookupFeesAction(_prev: LookupState, formData: FormData): Promise<LookupState> {
  const id = text(formData, "studentId");
  if (!/^[A-Za-z0-9-]{2,32}$/.test(id)) return { error: "Enter the Student ID, e.g. TMH11." };
  try {
    const fees = await lookupFees(getStore(), id);
    if (!fees) return { error: `There is no student with the ID ${id.toUpperCase()}. Check the ID on the school report or ask the office.` };
    return { fees };
  } catch (e) {
    return { error: problem(e) };
  }
}

export type PayState = { error?: string };

export async function payFeeAction(_prev: PayState, formData: FormData): Promise<PayState> {
  const amount = parseCedis(text(formData, "amount"));
  if (amount === null) return { error: "Enter the amount in cedis, e.g. 500 or 500.50." };
  let url: string;
  try {
    ({ authorizationUrl: url } = await startFeePayment(
      getStore(),
      paystackFromEnv(),
      {
        studentLoginId: text(formData, "studentId"),
        feeItemId: text(formData, "feeItemId"),
        amount,
        payerName: text(formData, "payerName"),
        payerPhone: text(formData, "payerPhone"),
        payerEmail: text(formData, "payerEmail"),
      },
      await returnUrl(),
    ));
  } catch (e) {
    return { error: problem(e) };
  }
  redirect(url);
}

export async function donateAction(_prev: PayState, formData: FormData): Promise<PayState> {
  const amount = parseCedis(text(formData, "amount"));
  if (amount === null) return { error: "Enter the amount in cedis, e.g. 100." };
  let url: string;
  try {
    ({ authorizationUrl: url } = await startDonation(
      getStore(),
      paystackFromEnv(),
      {
        campaignId: text(formData, "campaignId") || null,
        amount,
        anonymous: formData.get("anonymous") === "on",
        message: text(formData, "message"),
        payerName: text(formData, "payerName"),
        payerPhone: text(formData, "payerPhone"),
        payerEmail: text(formData, "payerEmail"),
      },
      await returnUrl(),
    ));
  } catch (e) {
    return { error: problem(e) };
  }
  redirect(url);
}
