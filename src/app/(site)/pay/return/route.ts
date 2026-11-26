import { NextResponse, type NextRequest } from "next/server";
import { confirmPayment } from "@/lib/payments/payments";
import { paystackFromEnv } from "@/lib/payments/paystack";
import { getStore } from "@/lib/prep/store";

/**
 * Paystack sends the payer back here with ?reference=... We ask Paystack for the result (never trusting the
 * address alone), record it, and show the receipt. If Paystack can't be reached, the receipt says "confirming"
 * and the signed notification (/api/paystack/webhook) records it shortly after.
 */
export async function GET(req: NextRequest) {
  const reference = req.nextUrl.searchParams.get("reference") ?? req.nextUrl.searchParams.get("trxref") ?? "";
  if (!/^TMH-[FD]-[A-Z0-9]{10}$/.test(reference)) return NextResponse.redirect(new URL("/pay-fees", req.url));
  try {
    await confirmPayment(getStore(), paystackFromEnv(), reference);
  } catch (e) {
    console.error("Payment return: couldn't confirm yet", reference, e instanceof Error ? e.message : e);
  }
  return NextResponse.redirect(new URL(`/pay/receipt/${reference}`, req.url));
}
