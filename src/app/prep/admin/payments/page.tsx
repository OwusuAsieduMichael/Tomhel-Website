import type { Metadata } from "next";
import Link from "next/link";
import { DataTable } from "@/components/prep/data-table";
import { PageHeading, PrepCard, prepButton } from "@/components/prep/ui";
import { cedisInput, formatCedis } from "@/lib/payments/money";
import { campaignsWithTotals, classFeeStatus, listPayments } from "@/lib/payments/payments";
import { paystackConfigured, paystackTestMode } from "@/lib/payments/paystack";
import { requireRole } from "@/lib/prep/auth/current-user";
import { formatDayTime } from "@/lib/prep/format";
import { getStore, TERMS } from "@/lib/prep/store";
import { cn } from "@/lib/utils";
import { campaignStatusAction } from "./actions";
import { CampaignForm, ClassFeesForm } from "./payments-forms";

export const metadata: Metadata = { title: "Payments" };

const TABS = [
  { id: "payments", label: "Payments" },
  { id: "fees", label: "School fees" },
  { id: "projects", label: "Donation projects" },
] as const;

const STATUS: Record<string, string> = { success: "Paid", pending: "Not confirmed", failed: "Not completed" };

export default async function AdminPaymentsPage({ searchParams }: { searchParams: Promise<{ tab?: string; class?: string; term?: string }> }) {
  await requireRole("admin");
  const store = getStore();
  const sp = await searchParams;
  const tab = TABS.find((t) => t.id === sp.tab)?.id ?? "payments";

  return (
    <div className="space-y-6">
      <PageHeading title="Payments" description="School fees and donations paid on the website through Paystack." />
      {!paystackConfigured() ? (
        <PrepCard className="border-prep-flag bg-prep-misspelt-bg text-sm text-prep-flag-ink">
          Online payment is off: PAYSTACK_SECRET_KEY isn&apos;t set. Parents see &quot;being set up&quot; on Pay Fees and Donate. See docs/PAYMENTS.md.
        </PrepCard>
      ) : paystackTestMode() ? (
        <PrepCard className="text-sm text-prep-muted">Test mode: payments use Paystack&apos;s test numbers and no real money moves. Switch to the live key when ready.</PrepCard>
      ) : null}
      <nav aria-label="Payments sections" className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/prep/admin/payments?tab=${t.id}`}
            aria-current={t.id === tab ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 items-center rounded-xl border px-4 text-sm font-semibold",
              t.id === tab ? "border-prep-primary bg-prep-primary-soft text-prep-ink" : "border-prep-line bg-prep-surface text-prep-muted hover:text-prep-ink",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {tab === "payments" ? <PaymentsTab /> : tab === "fees" ? <FeesTab classId={sp.class} term={sp.term} /> : <ProjectsTab />}
    </div>
  );

  async function PaymentsTab() {
    const payments = await listPayments(store);
    const paid = payments.filter((p) => p.status === "success");
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
    const thisMonth = (kind: string) => paid.filter((p) => p.kind === kind && (p.paidAt ?? p.createdAt).getTime() >= monthStart).reduce((s, p) => s + p.amount, 0);
    return (
      <>
        <dl className="grid gap-3 sm:grid-cols-3">
          <PrepCard>
            <dt className="text-sm text-prep-muted">Fees this month</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums">{formatCedis(thisMonth("fee"))}</dd>
          </PrepCard>
          <PrepCard>
            <dt className="text-sm text-prep-muted">Donations this month</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums">{formatCedis(thisMonth("donation"))}</dd>
          </PrepCard>
          <PrepCard>
            <dt className="text-sm text-prep-muted">Waiting for confirmation</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums">{payments.filter((p) => p.status === "pending").length}</dd>
          </PrepCard>
        </dl>
        <div className="flex justify-end">
          <a href="/prep/admin/payments/export" className={prepButton({ variant: "secondary" })}>
            Download all payments (CSV)
          </a>
        </div>
        {payments.length ? (
          <DataTable
            caption="Payments, newest first"
            headers={["Date", "For", "Paid by", "Amount", "Status", "Receipt"]}
            rows={payments.slice(0, 200).map((p) => [
              formatDayTime(p.paidAt ?? p.createdAt),
              p.kind === "fee" ? (
                <span key="f">
                  Fees · {p.studentName} <span className="text-prep-muted">({p.studentLoginId}, {p.className}, {p.term})</span>
                </span>
              ) : (
                <span key="d">Donation · {p.campaignTitle}</span>
              ),
              <span key="p">
                {p.payerName}
                {p.payerPhone ? <span className="block text-xs text-prep-muted">{p.payerPhone}</span> : null}
              </span>,
              <span key="a" className="font-semibold tabular-nums">
                {formatCedis(p.amount)}
              </span>,
              <span key="s" className={p.status === "success" ? "font-semibold text-prep-awarded" : p.status === "failed" ? "text-prep-muted" : "text-prep-flag-ink"}>
                {STATUS[p.status]}
              </span>,
              <a key="r" href={`/pay/receipt/${p.reference}`} target="_blank" rel="noreferrer" className="font-mono text-xs text-prep-primary underline">
                {p.reference}
              </a>,
            ])}
          />
        ) : (
          <PrepCard className="text-prep-muted">No payments yet.</PrepCard>
        )}
      </>
    );
  }

  async function FeesTab({ classId, term }: { classId?: string; term?: string }) {
    const { classes, feeItems } = await store.read("classes", "feeItems");
    const sorted = [...classes].sort((a, b) => b.academicYear.localeCompare(a.academicYear) || a.yearGroup - b.yearGroup || a.name.localeCompare(b.name));
    const current = sorted.find((c) => c.id === classId) ?? sorted[0];
    const currentTerm = TERMS.find((t) => t === term) ?? "Term 1";
    const status = current ? await classFeeStatus(store, current.id, currentTerm) : null;
    return (
      <>
        <section aria-labelledby="fees-heading" className="space-y-3">
          <div>
            <h2 id="fees-heading" className="text-lg font-bold">
              Fees per class
            </h2>
            <p className="text-sm text-prep-muted">In cedis. Parents see each term&apos;s fee, what is paid and the balance. Leave a term empty to keep it off the website.</p>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {sorted.map((c) => (
              <ClassFeesForm
                key={c.id}
                classId={c.id}
                className={`${c.name} · ${c.academicYear}`}
                current={Object.fromEntries(feeItems.filter((f) => f.classId === c.id && f.amount > 0).map((f) => [f.term, cedisInput(f.amount)]))}
              />
            ))}
          </div>
        </section>
        {current && status ? (
          <section aria-labelledby="paid-heading" className="space-y-3">
            <h2 id="paid-heading" className="text-lg font-bold">
              Who has paid
            </h2>
            <nav aria-label="Class and term" className="flex flex-wrap gap-2">
              {sorted.map((c) =>
                TERMS.map((t) => (
                  <Link
                    key={`${c.id}-${t}`}
                    href={`/prep/admin/payments?tab=fees&class=${c.id}&term=${encodeURIComponent(t)}`}
                    aria-current={c.id === current.id && t === currentTerm ? "page" : undefined}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-xs font-semibold",
                      c.id === current.id && t === currentTerm ? "border-prep-primary bg-prep-primary-soft" : "border-prep-line bg-prep-surface text-prep-muted",
                    )}
                  >
                    {c.name} · {t}
                  </Link>
                )),
              )}
            </nav>
            {status.fee ? (
              <DataTable
                caption={`${current.name}, ${currentTerm}: fee ${formatCedis(status.fee)}`}
                headers={["Student", "Paid", "Balance"]}
                rows={status.rows.map((r) => [
                  <span key="n">
                    {r.name} <span className="text-prep-muted">({r.loginId})</span>
                  </span>,
                  formatCedis(r.paid),
                  <span key="b" className={r.balance ? "font-semibold" : "font-semibold text-prep-awarded"}>
                    {r.balance ? formatCedis(r.balance) : "Paid"}
                  </span>,
                ])}
              />
            ) : (
              <PrepCard className="text-prep-muted">
                No fee set for {current.name}, {currentTerm}.
              </PrepCard>
            )}
          </section>
        ) : null}
      </>
    );
  }

  async function ProjectsTab() {
    const { campaigns, general } = await campaignsWithTotals(store);
    return (
      <>
        <PrepCard className="max-w-2xl">
          <h2 className="mb-3 text-lg font-bold">Add a project</h2>
          <CampaignForm />
        </PrepCard>
        <p className="text-sm text-prep-muted">
          General fund (donations without a project): {formatCedis(general.raised)} from {general.donors} {general.donors === 1 ? "gift" : "gifts"}.
        </p>
        {campaigns.length ? (
          <ul className="space-y-3">
            {campaigns.map((c) => (
              <li key={c.id} className="space-y-3 rounded-2xl border border-prep-line bg-prep-surface p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-bold">
                    {c.title} {c.status === "closed" ? <span className="font-normal text-prep-muted">· closed</span> : null}
                  </h3>
                  <span className="text-sm">
                    <span className="font-semibold">{formatCedis(c.raised)}</span>
                    {c.goal ? ` of ${formatCedis(c.goal)}` : ""} · {c.donors} {c.donors === 1 ? "gift" : "gifts"}
                  </span>
                </div>
                <details>
                  <summary className="cursor-pointer text-sm font-semibold text-prep-primary">Edit</summary>
                  <div className="pt-3">
                    <CampaignForm campaign={{ id: c.id, title: c.title, description: c.description, goal: c.goal ? cedisInput(c.goal) : "" }} />
                  </div>
                </details>
                <form action={campaignStatusAction}>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="status" value={c.status === "open" ? "closed" : "open"} />
                  <button type="submit" className={prepButton({ variant: "secondary" })}>
                    {c.status === "open" ? "Close (stop taking donations)" : "Open again"}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <PrepCard className="text-prep-muted">No projects yet. Donations go to the general fund until you add one.</PrepCard>
        )}
      </>
    );
  }
}
