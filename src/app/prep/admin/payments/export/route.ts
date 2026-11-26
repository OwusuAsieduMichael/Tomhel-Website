import { requireRole } from "@/lib/prep/auth/current-user";
import { listPayments } from "@/lib/payments/payments";
import { getStore } from "@/lib/prep/store";

const cell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : v instanceof Date ? v.toISOString() : String(v);
  // Leading = + - @ would be read as a formula by Excel.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

/** Every payment as a CSV for the bursar (amounts in cedis). */
export async function GET() {
  await requireRole("admin");
  const rows = await listPayments(getStore());
  const header = ["Date", "Receipt", "Kind", "Status", "Amount (GHS)", "Student ID", "Student", "Class", "Term", "Project", "Paid by", "Phone", "Email", "Method"];
  const lines = rows.map((p) =>
    [
      p.paidAt ?? p.createdAt,
      p.reference,
      p.kind === "fee" ? "School fees" : "Donation",
      p.status,
      (p.amount / 100).toFixed(2),
      p.studentLoginId,
      p.studentName,
      p.className,
      p.term,
      p.campaignTitle,
      p.payerName,
      p.payerPhone,
      p.payerEmail,
      p.channel,
    ]
      .map(cell)
      .join(","),
  );
  return new Response([header.join(","), ...lines].join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tomhel-payments-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
