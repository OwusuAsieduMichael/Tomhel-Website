import { randomBytes } from "node:crypto";
import { z } from "zod";
import { insert, newId, StoreConflictError, TERMS, update, type Campaign, type FeeItem, type Payment, type Store } from "@/lib/prep/store";
import type { PaystackApi } from "./paystack";

/**
 * School fees and donations, paid on the public website through Paystack.
 *
 * Fees: an admin sets the fee for each class and term. A parent enters the Student ID, sees each term's fee, what
 * has been paid and the balance, and pays all or part of a balance. Donations go to a project or the general fund.
 *
 * A payment is written as "pending" before the payer leaves for Paystack, and only becomes "success" when
 * Paystack's own records confirm the same reference, amount and currency (confirmPayment). That runs when the payer
 * comes back and again when Paystack's signed notification arrives; either way it is safe to run twice.
 */

export class PaymentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentError";
  }
}

export const MIN_PAYMENT = 100; // GH₵ 1
export const MAX_PAYMENT = 10_000_000; // GH₵ 100,000

/** "TMH-F-7K2M9Q4X1A": short enough to read out over the phone. */
export function newReference(kind: Payment["kind"]) {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(10);
  return `TMH-${kind === "fee" ? "F" : "D"}-${[...bytes].map((b) => alphabet[b % alphabet.length]).join("")}`;
}

// ---------------------------------------------------------------------------
// Fees
// ---------------------------------------------------------------------------

const feeKey = (classId: string, term: string) => `${classId}|${term}`;

/** Sets (or changes) the fee for a class and term. 0 removes it from what parents see. */
export async function setFee(store: Store, classId: string, term: (typeof TERMS)[number], amount: number, now = new Date()) {
  if (!Number.isInteger(amount) || amount < 0 || amount > MAX_PAYMENT) throw new PaymentError("Enter the fee in cedis, e.g. 1200 or 1200.50.");
  const { feeItems, classes } = await store.read("feeItems", "classes");
  if (!classes.some((c) => c.id === classId)) throw new PaymentError("That class no longer exists.");
  const existing = feeItems.find((f) => f.itemKey === feeKey(classId, term));
  if (existing) {
    await store.write([update("feeItems", existing.id, { amount, updatedAt: now })]);
    return existing.id;
  }
  const row: FeeItem = { id: newId(), classId, term, itemKey: feeKey(classId, term), amount, createdAt: now, updatedAt: now };
  await store.write([insert("feeItems", [row], { unique: ["itemKey"] })]);
  return row.id;
}

type FeeData = { feeItems: FeeItem[]; payments: Payment[] };

const paidFor = (payments: Payment[], studentId: string, feeItemId: string) =>
  payments.filter((p) => p.kind === "fee" && p.status === "success" && p.studentId === studentId && p.feeItemId === feeItemId).reduce((s, p) => s + p.amount, 0);

/** Each term's fee for the student's class, with what has been paid and the balance. */
export function feesFor(data: FeeData, student: { id: string; classId: string | null }) {
  return data.feeItems
    .filter((f) => f.classId === student.classId && f.amount > 0)
    .sort((a, b) => a.term.localeCompare(b.term))
    .map((f) => {
      const paid = paidFor(data.payments, student.id, f.id);
      return { feeItemId: f.id, term: f.term, fee: f.amount, paid, balance: Math.max(0, f.amount - paid) };
    });
}

/** "Kwame A." from "Kwame Asante Mensah": enough for a parent to recognise, little for a stranger. */
export function shortName(name: string) {
  const [first, ...rest] = name.trim().split(/\s+/);
  return rest.length ? `${first} ${rest[rest.length - 1][0].toUpperCase()}.` : first;
}

/** What the Pay Fees page shows for a Student ID, or null if there is no such student. */
export async function lookupFees(store: Store, studentLoginId: string) {
  const { users, classes, feeItems, payments } = await store.read("users", "classes", "feeItems", "payments");
  const wanted = studentLoginId.trim().toUpperCase();
  const student = users.find((u) => u.role === "student" && u.active && u.loginId.toUpperCase() === wanted);
  if (!student) return null;
  const schoolClass = classes.find((c) => c.id === student.classId);
  return {
    loginId: student.loginId,
    displayName: shortName(student.name),
    className: schoolClass ? `${schoolClass.name} · ${schoolClass.academicYear}` : null,
    terms: feesFor({ feeItems, payments }, student),
  };
}

const payerSchema = z.object({
  payerName: z.string().trim().min(2, "Enter your name.").max(120),
  payerPhone: z
    .string()
    .trim()
    .transform((s) => s.replace(/[\s-]/g, ""))
    .refine((s) => s === "" || /^(\+?233|0)\d{9}$/.test(s), "Enter a Ghana phone number, e.g. 024 123 4567."),
  payerEmail: z.string().trim().max(200).refine((s) => s === "" || z.string().email().safeParse(s).success, "That email address doesn't look right."),
});

type Payer = z.input<typeof payerSchema>;

/** Paystack needs an email; payers without one get the school's address, so the receipt still goes somewhere useful. */
function receiptEmail(email: string) {
  return email || process.env.PAYSTACK_RECEIPT_EMAIL || "payments@tomhel.edu.gh";
}

async function begin(store: Store, paystack: PaystackApi, row: Payment, callbackUrl: string, metadata: Record<string, unknown>) {
  try {
    await store.write([insert("payments", [row], { unique: ["reference"] })]);
  } catch (e) {
    if (e instanceof StoreConflictError) throw new PaymentError("Please try again.");
    throw e;
  }
  const { authorizationUrl } = await paystack.initialize({
    email: receiptEmail(row.payerEmail ?? ""),
    amount: row.amount,
    reference: row.reference,
    callbackUrl,
    metadata,
  });
  return { reference: row.reference, authorizationUrl };
}

/** Starts paying (part of) a term's balance. Returns Paystack's page to send the payer to. */
export async function startFeePayment(
  store: Store,
  paystack: PaystackApi,
  input: Payer & { studentLoginId: string; feeItemId: string; amount: number },
  callbackUrl: string,
  now = new Date(),
) {
  const payer = payerSchema.safeParse(input);
  if (!payer.success) throw new PaymentError(payer.error.issues[0].message);
  const { users, feeItems, payments } = await store.read("users", "feeItems", "payments");
  const student = users.find((u) => u.role === "student" && u.active && u.loginId.toUpperCase() === input.studentLoginId.trim().toUpperCase());
  if (!student) throw new PaymentError("There is no student with that ID.");
  const term = feesFor({ feeItems, payments }, student).find((t) => t.feeItemId === input.feeItemId);
  if (!term) throw new PaymentError("Choose the term you are paying for.");
  if (term.balance <= 0) throw new PaymentError(`${term.term} is already fully paid.`);
  if (!Number.isInteger(input.amount) || input.amount < MIN_PAYMENT) throw new PaymentError("The smallest payment is GH₵ 1.00.");
  if (input.amount > term.balance) throw new PaymentError("That is more than the balance for this term.");
  const row: Payment = {
    id: newId(),
    kind: "fee",
    reference: newReference("fee"),
    status: "pending",
    amount: input.amount,
    currency: "GHS",
    studentId: student.id,
    feeItemId: term.feeItemId,
    campaignId: null,
    payerName: payer.data.payerName,
    payerPhone: payer.data.payerPhone || null,
    payerEmail: payer.data.payerEmail || null,
    anonymous: false,
    message: null,
    channel: null,
    paidAt: null,
    createdAt: now,
    updatedAt: now,
  };
  return begin(store, paystack, row, callbackUrl, { kind: "fee", student: student.loginId, term: term.term });
}

// ---------------------------------------------------------------------------
// Donations
// ---------------------------------------------------------------------------

export async function startDonation(
  store: Store,
  paystack: PaystackApi,
  input: Payer & { campaignId: string | null; amount: number; anonymous: boolean; message: string },
  callbackUrl: string,
  now = new Date(),
) {
  const payer = payerSchema.safeParse(input);
  if (!payer.success) throw new PaymentError(payer.error.issues[0].message);
  if (!Number.isInteger(input.amount) || input.amount < MIN_PAYMENT) throw new PaymentError("The smallest donation is GH₵ 1.00.");
  if (input.amount > MAX_PAYMENT) throw new PaymentError("For gifts over GH₵ 100,000 please contact the school.");
  if (input.message.length > 300) throw new PaymentError("Keep the message under 300 characters.");
  let campaignTitle = "General fund";
  if (input.campaignId) {
    const { campaigns } = await store.read("campaigns");
    const c = campaigns.find((x) => x.id === input.campaignId && x.status === "open");
    if (!c) throw new PaymentError("That project isn't taking donations any more.");
    campaignTitle = c.title;
  }
  const row: Payment = {
    id: newId(),
    kind: "donation",
    reference: newReference("donation"),
    status: "pending",
    amount: input.amount,
    currency: "GHS",
    studentId: null,
    feeItemId: null,
    campaignId: input.campaignId,
    payerName: payer.data.payerName,
    payerPhone: payer.data.payerPhone || null,
    payerEmail: payer.data.payerEmail || null,
    anonymous: input.anonymous,
    message: input.message.trim() || null,
    channel: null,
    paidAt: null,
    createdAt: now,
    updatedAt: now,
  };
  return begin(store, paystack, row, callbackUrl, { kind: "donation", project: campaignTitle });
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50) || "project";

export async function saveCampaign(store: Store, input: { title: string; description: string; goal: number }, id?: string, now = new Date()) {
  const title = input.title.trim();
  if (title.length < 3 || title.length > 120) throw new PaymentError("Give the project a title (3 to 120 characters).");
  if (input.description.trim().length > 2000) throw new PaymentError("Keep the description under 2,000 characters.");
  if (!Number.isInteger(input.goal) || input.goal < 0 || input.goal > 100 * MAX_PAYMENT) throw new PaymentError("Enter the goal in cedis, or leave it empty.");
  const { campaigns } = await store.read("campaigns");
  if (id) {
    if (!campaigns.some((c) => c.id === id)) throw new PaymentError("That project no longer exists.");
    await store.write([update("campaigns", id, { title, description: input.description.trim(), goal: input.goal, updatedAt: now })]);
    return id;
  }
  const taken = new Set(campaigns.map((c) => c.slug));
  let slug = slugify(title);
  for (let n = 2; taken.has(slug); n++) slug = `${slugify(title)}-${n}`;
  const row: Campaign = { id: newId(), slug, title, description: input.description.trim(), goal: input.goal, status: "open", createdAt: now, updatedAt: now };
  await store.write([insert("campaigns", [row], { unique: ["slug"] })]);
  return row.id;
}

export async function setCampaignStatus(store: Store, id: string, status: Campaign["status"]) {
  await store.write([update("campaigns", id, { status, updatedAt: new Date() })]);
}

/** Projects with how much they have raised (confirmed donations only), open ones first. */
export async function campaignsWithTotals(store: Store) {
  const { campaigns, payments } = await store.read("campaigns", "payments");
  const raised = (id: string | null) =>
    payments.filter((p) => p.kind === "donation" && p.status === "success" && (p.campaignId ?? null) === id).reduce((s, p) => s + p.amount, 0);
  const donors = (id: string | null) => payments.filter((p) => p.kind === "donation" && p.status === "success" && (p.campaignId ?? null) === id).length;
  return {
    campaigns: [...campaigns]
      .sort((a, b) => (a.status === b.status ? b.createdAt.getTime() - a.createdAt.getTime() : a.status === "open" ? -1 : 1))
      .map((c) => ({ ...c, raised: raised(c.id), donors: donors(c.id) })),
    general: { raised: raised(null), donors: donors(null) },
  };
}

// ---------------------------------------------------------------------------
// Confirming with Paystack
// ---------------------------------------------------------------------------

/**
 * Asks Paystack about the payment and records the answer. Only a "success" for the same amount and currency
 * counts; a mismatch is left pending for an admin to look into. Running it again changes nothing.
 */
export async function confirmPayment(store: Store, paystack: PaystackApi, reference: string, now = new Date()): Promise<Payment | null> {
  const { payments } = await store.read("payments");
  const p = payments.find((x) => x.reference === reference);
  if (!p) return null;
  if (p.status === "success") return p;
  const v = await paystack.verify(reference);
  if (v.status === "success" && v.amount === p.amount && v.currency === p.currency) {
    const set = { status: "success" as const, channel: v.channel, paidAt: v.paidAt ?? now, updatedAt: now };
    await store.write([update("payments", p.id, set)]);
    return { ...p, ...set };
  }
  if (["failed", "abandoned", "reversed"].includes(v.status)) {
    await store.write([update("payments", p.id, { status: "failed", updatedAt: now })]);
    return { ...p, status: "failed", updatedAt: now };
  }
  return p;
}

/** For the receipt page: the payment and what it was for. */
export async function receipt(store: Store, reference: string) {
  const { payments, users, feeItems, campaigns, classes } = await store.read("payments", "users", "feeItems", "campaigns", "classes");
  const p = payments.find((x) => x.reference === reference);
  if (!p) return null;
  const student = p.studentId ? users.find((u) => u.id === p.studentId) : undefined;
  const fee = p.feeItemId ? feeItems.find((f) => f.id === p.feeItemId) : undefined;
  const schoolClass = fee ? classes.find((c) => c.id === fee.classId) : undefined;
  const campaign = p.campaignId ? campaigns.find((c) => c.id === p.campaignId) : undefined;
  return {
    payment: p,
    forWhat:
      p.kind === "fee"
        ? `School fees · ${student ? `${shortName(student.name)} (${student.loginId})` : "student"} · ${fee?.term ?? ""}${schoolClass ? ` · ${schoolClass.name}` : ""}`
        : `Donation · ${campaign?.title ?? "General fund"}`,
  };
}

// ---------------------------------------------------------------------------
// For the admin
// ---------------------------------------------------------------------------

export async function listPayments(store: Store) {
  const { payments, users, feeItems, campaigns, classes } = await store.read("payments", "users", "feeItems", "campaigns", "classes");
  return [...payments]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((p) => {
      const student = p.studentId ? users.find((u) => u.id === p.studentId) : undefined;
      const fee = p.feeItemId ? feeItems.find((f) => f.id === p.feeItemId) : undefined;
      const campaign = p.campaignId ? campaigns.find((c) => c.id === p.campaignId) : undefined;
      return {
        ...p,
        studentName: student?.name ?? null,
        studentLoginId: student?.loginId ?? null,
        className: fee ? (classes.find((c) => c.id === fee.classId)?.name ?? null) : null,
        term: fee?.term ?? null,
        campaignTitle: p.kind === "donation" ? (campaign?.title ?? "General fund") : null,
      };
    });
}

/** Who has paid what for one class and term. */
export async function classFeeStatus(store: Store, classId: string, term: (typeof TERMS)[number]) {
  const { users, feeItems, payments } = await store.read("users", "feeItems", "payments");
  const fee = feeItems.find((f) => f.itemKey === feeKey(classId, term));
  const students = users.filter((u) => u.role === "student" && u.classId === classId).sort((a, b) => a.name.localeCompare(b.name));
  return {
    fee: fee?.amount ?? 0,
    rows: students.map((s) => {
      const paid = fee ? paidFor(payments, s.id, fee.id) : 0;
      return { id: s.id, name: s.name, loginId: s.loginId, paid, balance: Math.max(0, (fee?.amount ?? 0) - paid) };
    }),
  };
}
