"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { donateAction, type PayState } from "../pay/actions";
import { PayerFields } from "../pay/payer-fields";

const PRESETS = ["50", "100", "200", "500"];

export function DonateForm({ projects, preselect, enabled }: { projects: { id: string; title: string }[]; preselect: string | null; enabled: boolean }) {
  const [state, action, pending] = useActionState<PayState, FormData>(donateAction, {});
  const [amount, setAmount] = useState("100");
  return (
    <form action={action} className="surface-card space-y-5 p-6 md:p-8">
      <h2 className="text-xl font-semibold text-primary">Make a donation</h2>
      <div className="space-y-2">
        <Label htmlFor="campaignId">Give to</Label>
        <select
          id="campaignId"
          name="campaignId"
          defaultValue={preselect ?? ""}
          className="flex h-11 w-full max-w-md rounded-xl border border-black/15 bg-white px-3 text-sm focus-visible:outline-2 focus-visible:outline-primary"
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
          <option value="">General fund (where it is needed most)</option>
        </select>
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Amount (GH₵)</legend>
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setAmount(p)}
              aria-pressed={amount === p}
              className="rounded-full border border-black/15 px-4 py-2 text-sm font-medium aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-white"
            >
              GH₵ {p}
            </button>
          ))}
          <label htmlFor="amount" className="sr-only">
            Other amount in cedis
          </label>
          <Input id="amount" name="amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} required className="w-32" />
        </div>
      </fieldset>
      <PayerFields />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="anonymous" className="size-4" /> Keep my name private (shown as &quot;A well-wisher&quot;)
      </label>
      <div className="space-y-2">
        <Label htmlFor="message">
          Message <span className="font-normal text-deep">(optional)</span>
        </Label>
        <Textarea id="message" name="message" rows={2} maxLength={300} />
      </div>
      {state.error ? (
        <p role="alert" className="text-sm font-medium text-red-700">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={!enabled || pending}>
        {pending ? "Opening Paystack…" : "Donate with mobile money or card"}
      </Button>
      <p className="text-xs text-deep">You&apos;ll pay on Paystack&apos;s secure page, then come back here for your receipt.</p>
    </form>
  );
}
