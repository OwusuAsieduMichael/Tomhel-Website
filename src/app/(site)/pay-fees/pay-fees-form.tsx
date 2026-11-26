"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cedisInput, formatCedis } from "@/lib/payments/money";
import { cn } from "@/lib/utils";
import { lookupFeesAction, payFeeAction, type LookupState, type PayState } from "../pay/actions";
import { PayerFields } from "../pay/payer-fields";

/** Step 1: the Student ID. Step 2: the term, the amount and who is paying, then on to Paystack. */
export function PayFeesForm({ enabled }: { enabled: boolean }) {
  const [found, lookup, looking] = useActionState<LookupState, FormData>(lookupFeesAction, {});
  const [payState, pay, paying] = useActionState<PayState, FormData>(payFeeAction, {});
  const fees = found.fees;
  const open = fees?.terms.filter((t) => t.balance > 0) ?? [];
  const [termId, setTermId] = useState<string | null>(null);
  const term = open.find((t) => t.feeItemId === termId) ?? open[0];

  return (
    <div className="space-y-8">
      <form action={lookup} className="surface-card space-y-4 p-6 md:p-8">
        <h2 className="text-xl font-semibold text-primary">1. Whose fees?</h2>
        <div className="space-y-2">
          <Label htmlFor="studentId">Student ID</Label>
          <div className="flex gap-3">
            <Input id="studentId" name="studentId" defaultValue={fees?.loginId} placeholder="e.g. TMH11" autoCapitalize="characters" spellCheck={false} required className="max-w-xs" />
            <Button type="submit" variant="outline" disabled={looking}>
              {looking ? "Finding…" : "Find"}
            </Button>
          </div>
          <p className="text-sm text-deep">It is on the school report and the portal login slip.</p>
        </div>
        {found.error ? (
          <p role="alert" className="text-sm font-medium text-red-700">
            {found.error}
          </p>
        ) : null}
      </form>

      {fees ? (
        <div className="surface-card space-y-6 p-6 md:p-8">
          <div>
            <h2 className="text-xl font-semibold text-primary">2. Fees for {fees.displayName}</h2>
            <p className="text-sm text-deep">
              {fees.loginId}
              {fees.className ? ` · ${fees.className}` : ""}
            </p>
          </div>
          {fees.terms.length ? (
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Fees, payments and balances by term</caption>
              <thead className="border-b border-black/10 text-deep">
                <tr>
                  <th className="py-2 font-medium">Term</th>
                  <th className="py-2 text-right font-medium">Fee</th>
                  <th className="py-2 text-right font-medium">Paid</th>
                  <th className="py-2 text-right font-medium">Balance</th>
                </tr>
              </thead>
              <tbody>
                {fees.terms.map((t) => (
                  <tr key={t.feeItemId} className="border-b border-black/5">
                    <td className="py-2.5 font-medium">{t.term}</td>
                    <td className="py-2.5 text-right tabular-nums">{formatCedis(t.fee)}</td>
                    <td className="py-2.5 text-right tabular-nums">{formatCedis(t.paid)}</td>
                    <td className={cn("py-2.5 text-right font-semibold tabular-nums", t.balance ? "text-primary" : "text-green-700")}>
                      {t.balance ? formatCedis(t.balance) : "Paid"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-deep">The school hasn&apos;t put this class&apos;s fees online yet. Please ask the office.</p>
          )}

          {open.length && term ? (
            <form action={pay} className="space-y-5">
              <input type="hidden" name="studentId" value={fees.loginId} />
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Paying for</legend>
                <div className="flex flex-wrap gap-2">
                  {open.map((t) => (
                    <label
                      key={t.feeItemId}
                      className="flex cursor-pointer items-center gap-2 rounded-full border border-black/15 px-4 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-white"
                    >
                      <input type="radio" name="feeItemId" value={t.feeItemId} checked={t.feeItemId === term.feeItemId} onChange={() => setTermId(t.feeItemId)} className="sr-only" />
                      {t.term} · {formatCedis(t.balance)} left
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (GH₵)</Label>
                <Input key={term.feeItemId} id="amount" name="amount" inputMode="decimal" defaultValue={cedisInput(term.balance)} required className="max-w-[12rem]" />
                <p className="text-sm text-deep">The full balance is filled in. You can pay part of it now and the rest later.</p>
              </div>
              <PayerFields />
              {payState.error ? (
                <p role="alert" className="text-sm font-medium text-red-700">
                  {payState.error}
                </p>
              ) : null}
              <Button type="submit" size="lg" disabled={!enabled || paying}>
                {paying ? "Opening Paystack…" : "Pay with mobile money or card"}
              </Button>
              <p className="text-xs text-deep">You&apos;ll pay on Paystack&apos;s secure page, then come back here for your receipt.</p>
            </form>
          ) : fees.terms.length ? (
            <p className="font-medium text-green-700">All fees listed here are paid. Thank you!</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
