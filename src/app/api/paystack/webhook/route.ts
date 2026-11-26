import { NextResponse, type NextRequest } from "next/server";
import { confirmPayment } from "@/lib/payments/payments";
import { paystackFromEnv, validPaystackSignature } from "@/lib/payments/paystack";
import { getStore } from "@/lib/prep/store";

/**
 * Paystack's notification of a payment (set in Paystack → Settings → API Keys & Webhooks → Webhook URL:
 * https://<site>/api/paystack/webhook). Records payments even if the payer closed the page before coming back.
 * Only signed notifications are read, and even then the payment is checked with Paystack before it counts.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!validPaystackSignature(raw, req.headers.get("x-paystack-signature"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  let event: { event?: string; data?: { reference?: string } };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const reference = event.data?.reference;
  if (event.event === "charge.success" && reference && /^TMH-[FD]-[A-Z0-9]{10}$/.test(reference)) {
    try {
      await confirmPayment(getStore(), paystackFromEnv(), reference);
    } catch (e) {
      // Paystack retries notifications that fail, so say so and it will come back.
      console.error("Paystack webhook: couldn't record", reference, e instanceof Error ? e.message : e);
      return NextResponse.json({ ok: false }, { status: 500 });
    }
  }
  return NextResponse.json({ ok: true });
}
