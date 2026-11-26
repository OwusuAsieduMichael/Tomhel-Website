import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Paystack (https://paystack.com/docs/api): the payer is sent to Paystack's own page (mobile money or card),
 * then back to the website. A payment only counts once Paystack itself confirms it (verify), never from what the
 * browser says. PAYSTACK_SECRET_KEY: sk_test_... while testing, sk_live_... for real money. Server-side only.
 */

export type PaystackInit = {
  email: string;
  /** In pesewas. */
  amount: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
};

export type PaystackVerified = {
  /** Paystack's status: "success", "failed", "abandoned", "ongoing", "pending", "reversed"... */
  status: string;
  amount: number;
  currency: string;
  reference: string;
  channel: string | null;
  paidAt: Date | null;
};

export interface PaystackApi {
  initialize(input: PaystackInit): Promise<{ authorizationUrl: string }>;
  verify(reference: string): Promise<PaystackVerified>;
}

export class PaystackError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaystackError";
  }
}

export const paystackConfigured = () => !!process.env.PAYSTACK_SECRET_KEY;
export const paystackTestMode = () => (process.env.PAYSTACK_SECRET_KEY ?? "").startsWith("sk_test_");

export function paystackFromEnv(): PaystackApi {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new PaystackError("Online payments aren't set up yet.");
  const call = async (path: string, init?: RequestInit) => {
    const res = await fetch(`https://api.paystack.co${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
      cache: "no-store",
    });
    const body = (await res.json().catch(() => null)) as { status?: boolean; message?: string; data?: Record<string, unknown> } | null;
    if (!res.ok || !body?.status || !body.data) throw new PaystackError(body?.message ?? `Paystack answered HTTP ${res.status}.`);
    return body.data;
  };
  return {
    async initialize(input) {
      const data = await call("/transaction/initialize", {
        method: "POST",
        body: JSON.stringify({
          email: input.email,
          amount: input.amount,
          currency: "GHS",
          reference: input.reference,
          callback_url: input.callbackUrl,
          channels: ["mobile_money", "card"],
          metadata: input.metadata ?? {},
        }),
      });
      return { authorizationUrl: String(data.authorization_url) };
    },
    async verify(reference) {
      const data = await call(`/transaction/verify/${encodeURIComponent(reference)}`);
      return {
        status: String(data.status),
        amount: Number(data.amount),
        currency: String(data.currency),
        reference: String(data.reference),
        channel: data.channel ? String(data.channel) : null,
        paidAt: data.paid_at ? new Date(String(data.paid_at)) : null,
      };
    },
  };
}

/** Paystack signs each notification: HMAC-SHA512 of the raw body with the secret key, in x-paystack-signature. */
export function validPaystackSignature(rawBody: string, signature: string | null, secret = process.env.PAYSTACK_SECRET_KEY ?? ""): boolean {
  if (!secret || !signature) return false;
  const expected = Buffer.from(createHmac("sha512", secret).update(rawBody).digest("hex"));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
