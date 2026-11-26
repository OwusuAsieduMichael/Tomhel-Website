import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { formatCedis, parseCedis } from "@/lib/payments/money";
import {
  campaignsWithTotals,
  classFeeStatus,
  confirmPayment,
  lookupFees,
  PaymentError,
  saveCampaign,
  setCampaignStatus,
  setFee,
  shortName,
  startDonation,
  startFeePayment,
} from "@/lib/payments/payments";
import { validPaystackSignature, type PaystackApi, type PaystackVerified } from "@/lib/payments/paystack";
import { insert, newId, type Store } from "@/lib/prep/store";
import { createRoutedTestStore } from "../helpers/store";

// The first test starts an in-memory Postgres, which can take a while on a busy machine.
vi.setConfig({ hookTimeout: 120_000, testTimeout: 120_000 });

/** A stand-in for Paystack: remembers what was started, and answers verify() with what each test sets. */
function fakePaystack() {
  const started: { reference: string; amount: number; email: string }[] = [];
  const answers = new Map<string, Partial<PaystackVerified>>();
  const api: PaystackApi = {
    async initialize(i) {
      started.push({ reference: i.reference, amount: i.amount, email: i.email });
      return { authorizationUrl: `https://checkout.paystack.test/${i.reference}` };
    },
    async verify(reference) {
      const a = answers.get(reference) ?? { status: "ongoing" };
      return { status: "ongoing", amount: 0, currency: "GHS", reference, channel: null, paidAt: null, ...a } as PaystackVerified;
    },
  };
  return { api, started, answers };
}

let store: Store;
let paystack: ReturnType<typeof fakePaystack>;
const JHS3 = newId();
const payer = { payerName: "Mrs Asante", payerPhone: "024 123 4567", payerEmail: "" };

beforeEach(async () => {
  store = await createRoutedTestStore();
  paystack = fakePaystack();
  await store.write([
    insert("classes", [{ id: JHS3, name: "JHS 3A", yearGroup: 3, academicYear: "2026/2027", createdAt: new Date() }]),
    insert("users", [
      { id: newId(), loginId: "TMH11", name: "Kwame Asante Mensah", role: "student", classId: JHS3, passwordHash: "x", active: true, mustChangePassword: false, failedLoginCount: 0, lockedUntil: null, lastLoginAt: null, sessionVersion: 1, createdAt: new Date() },
    ]),
  ]);
});

describe("money", () => {
  it("reads cedis into pesewas and back", () => {
    expect(parseCedis("1200")).toBe(120000);
    expect(parseCedis("GH₵ 1,200.5")).toBe(120050);
    expect(parseCedis("12.345")).toBeNull();
    expect(parseCedis("abc")).toBeNull();
    expect(formatCedis(120050)).toBe("GH₵ 1,200.50");
  });
});

describe("school fees", () => {
  it("shows each term's fee, paid and balance for a Student ID, with only a short name", async () => {
    await setFee(store, JHS3, "Term 1", 120000);
    await setFee(store, JHS3, "Term 2", 100000);
    const f = await lookupFees(store, "tmh11");
    expect(f).toMatchObject({ loginId: "TMH11", displayName: "Kwame M.", className: "JHS 3A · 2026/2027" });
    expect(f!.terms.map((t) => [t.term, t.fee, t.paid, t.balance])).toEqual([
      ["Term 1", 120000, 0, 120000],
      ["Term 2", 100000, 0, 100000],
    ]);
    expect(await lookupFees(store, "NOPE")).toBeNull();
    expect(shortName("Ama")).toBe("Ama");
  });

  it("counts a payment only once Paystack confirms the same amount; part payments reduce the balance", async () => {
    const t1 = await setFee(store, JHS3, "Term 1", 120000);
    const r = await startFeePayment(store, paystack.api, { ...payer, studentLoginId: "TMH11", feeItemId: t1, amount: 50000 }, "https://site/pay/return");
    expect(r.authorizationUrl).toContain(r.reference);
    // No email given: Paystack still gets one (the school's), so it accepts the payment.
    expect(paystack.started[0]).toMatchObject({ amount: 50000, email: expect.stringContaining("@") });

    // Not confirmed yet: the balance hasn't moved.
    expect((await lookupFees(store, "TMH11"))!.terms[0].balance).toBe(120000);
    expect((await confirmPayment(store, paystack.api, r.reference))!.status).toBe("pending");

    // Paystack says success, but for a different amount: not counted.
    paystack.answers.set(r.reference, { status: "success", amount: 100 });
    expect((await confirmPayment(store, paystack.api, r.reference))!.status).toBe("pending");

    paystack.answers.set(r.reference, { status: "success", amount: 50000, channel: "mobile_money" });
    expect(await confirmPayment(store, paystack.api, r.reference)).toMatchObject({ status: "success", channel: "mobile_money" });
    // Confirming again (the notification after the return) changes nothing.
    await confirmPayment(store, paystack.api, r.reference);
    expect((await lookupFees(store, "TMH11"))!.terms[0]).toMatchObject({ paid: 50000, balance: 70000 });
    expect((await classFeeStatus(store, JHS3, "Term 1")).rows[0]).toMatchObject({ loginId: "TMH11", paid: 50000, balance: 70000 });
  });

  it("refuses more than the balance, less than GH₵ 1, a paid-up term and bad phone numbers", async () => {
    const t1 = await setFee(store, JHS3, "Term 1", 1000);
    const pay = (amount: number, extra = {}) =>
      startFeePayment(store, paystack.api, { ...payer, ...extra, studentLoginId: "TMH11", feeItemId: t1, amount }, "https://site/pay/return");
    await expect(pay(1001)).rejects.toThrow(/more than the balance/);
    await expect(pay(50)).rejects.toThrow(/smallest/);
    await expect(pay(1000, { payerPhone: "12345" })).rejects.toThrow(/phone/);
    const r = await pay(1000);
    paystack.answers.set(r.reference, { status: "success", amount: 1000 });
    await confirmPayment(store, paystack.api, r.reference);
    await expect(pay(100)).rejects.toThrow(/fully paid/);
  });

  it("marks a refused payment as failed", async () => {
    const t1 = await setFee(store, JHS3, "Term 1", 1000);
    const r = await startFeePayment(store, paystack.api, { ...payer, studentLoginId: "TMH11", feeItemId: t1, amount: 1000 }, "https://site/pay/return");
    paystack.answers.set(r.reference, { status: "abandoned" });
    expect((await confirmPayment(store, paystack.api, r.reference))!.status).toBe("failed");
    expect((await lookupFees(store, "TMH11"))!.terms[0].balance).toBe(1000);
  });
});

describe("donations", () => {
  it("adds confirmed donations to the project's total; closed projects take none", async () => {
    const id = await saveCampaign(store, { title: "New science lab", description: "Equipment for the lab.", goal: 5_000_000 });
    const d = await startDonation(store, paystack.api, { ...payer, campaignId: id, amount: 20000, anonymous: true, message: "Good luck" }, "https://site/pay/return");
    const general = await startDonation(store, paystack.api, { ...payer, campaignId: null, amount: 5000, anonymous: false, message: "" }, "https://site/pay/return");
    paystack.answers.set(d.reference, { status: "success", amount: 20000 });
    paystack.answers.set(general.reference, { status: "success", amount: 5000 });
    await confirmPayment(store, paystack.api, d.reference);
    await confirmPayment(store, paystack.api, general.reference);
    const t = await campaignsWithTotals(store);
    expect(t.campaigns[0]).toMatchObject({ slug: "new-science-lab", raised: 20000, donors: 1 });
    expect(t.general).toEqual({ raised: 5000, donors: 1 });

    await setCampaignStatus(store, id, "closed");
    await expect(startDonation(store, paystack.api, { ...payer, campaignId: id, amount: 1000, anonymous: false, message: "" }, "x")).rejects.toBeInstanceOf(PaymentError);
  });
});

describe("Paystack notifications", () => {
  it("are trusted only with a valid signature", () => {
    const body = JSON.stringify({ event: "charge.success", data: { reference: "TMH-F-X" } });
    const sig = createHmac("sha512", "sk_test_abc").update(body).digest("hex");
    expect(validPaystackSignature(body, sig, "sk_test_abc")).toBe(true);
    expect(validPaystackSignature(body + " ", sig, "sk_test_abc")).toBe(false);
    expect(validPaystackSignature(body, null, "sk_test_abc")).toBe(false);
    expect(validPaystackSignature(body, sig, "")).toBe(false);
  });
});
