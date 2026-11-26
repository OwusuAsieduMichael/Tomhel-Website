import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BelowHeroShell } from "@/components/layout/below-hero-shell";
import { Container, Section } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { PrintButton } from "@/components/prep/print-button";
import { Button } from "@/components/ui/button";
import { formatCedis } from "@/lib/payments/money";
import { receipt } from "@/lib/payments/payments";
import { getStore } from "@/lib/prep/store";

export const metadata: Metadata = { title: "Payment receipt", robots: { index: false } };
export const dynamic = "force-dynamic";

const when = new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeStyle: "short", timeZone: "Africa/Accra" });
const CHANNEL: Record<string, string> = { mobile_money: "Mobile money", card: "Card", bank: "Bank", bank_transfer: "Bank transfer" };

export default async function ReceiptPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  if (!/^TMH-[FD]-[A-Z0-9]{10}$/.test(reference)) notFound();
  const r = await receipt(getStore(), reference);
  if (!r) notFound();
  const { payment: p, forWhat } = r;
  const done = p.status === "success";

  return (
    <>
      <PageHero
        showBack={false}
        eyebrow={done ? "Payment received" : p.status === "failed" ? "Payment not completed" : "Confirming payment"}
        title={done ? (p.kind === "donation" ? "Thank you for your gift" : "Thank you, payment received") : p.status === "failed" ? "The payment didn't go through" : "We're confirming your payment"}
        description={
          done
            ? "Keep this receipt. You can print it or take a screenshot."
            : p.status === "failed"
              ? "No money was taken for this payment. You can try again."
              : "Paystack hasn't confirmed it yet. This usually takes a moment: refresh this page shortly."
        }
      />
      <BelowHeroShell>
        <Section>
          <Container className="max-w-xl">
            <div className="surface-card space-y-4 p-6 md:p-8">
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
                <dt className="text-deep">Receipt number</dt>
                <dd className="font-mono font-semibold">{p.reference}</dd>
                <dt className="text-deep">For</dt>
                <dd className="font-medium">{forWhat}</dd>
                <dt className="text-deep">Amount</dt>
                <dd className="text-lg font-bold text-primary">{formatCedis(p.amount)}</dd>
                <dt className="text-deep">Paid by</dt>
                <dd>{p.payerName}</dd>
                <dt className="text-deep">Status</dt>
                <dd className="font-semibold">{done ? "Paid" : p.status === "failed" ? "Not completed" : "Waiting for confirmation"}</dd>
                {done && p.paidAt ? (
                  <>
                    <dt className="text-deep">Date</dt>
                    <dd>{when.format(p.paidAt)}</dd>
                  </>
                ) : null}
                {done && p.channel ? (
                  <>
                    <dt className="text-deep">Method</dt>
                    <dd>{CHANNEL[p.channel] ?? p.channel}</dd>
                  </>
                ) : null}
              </dl>
              <div className="flex flex-wrap gap-3 pt-2 print:hidden">
                {done ? <PrintButton label="Print receipt" /> : null}
                {!done ? (
                  <Button asChild variant="outline">
                    <Link href={`/pay/receipt/${p.reference}`}>Refresh</Link>
                  </Button>
                ) : null}
                <Button asChild variant="outline">
                  <Link href={p.kind === "fee" ? "/pay-fees" : "/donate"}>{p.kind === "fee" ? "Pay other fees" : "Back to donations"}</Link>
                </Button>
              </div>
            </div>
          </Container>
        </Section>
      </BelowHeroShell>
    </>
  );
}
