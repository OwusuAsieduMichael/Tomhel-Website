"use client";

import { useActionState } from "react";
import { Field, FormMessage, prepButton } from "@/components/prep/ui";
import { saveCampaignAction, saveClassFeesAction, type PaymentsFormState } from "./actions";

const TERMS = ["Term 1", "Term 2", "Term 3"] as const;

/** One class's fee for each term, in cedis. Empty: no fee online for that term. */
export function ClassFeesForm({ classId, className, current }: { classId: string; className: string; current: Record<string, string> }) {
  const [state, action, pending] = useActionState<PaymentsFormState, FormData>(saveClassFeesAction, {});
  return (
    <form action={action} className="space-y-3 rounded-2xl border border-prep-line bg-prep-surface p-4">
      <h3 className="font-bold">{className}</h3>
      <input type="hidden" name="classId" value={classId} />
      <div className="grid grid-cols-3 gap-3">
        {TERMS.map((t) => (
          <Field key={t} id={`fee-${classId}-${t}`} label={`${t} (GH₵)`} name={t} inputMode="decimal" defaultValue={current[t] ?? ""} placeholder="—" />
        ))}
      </div>
      <FormMessage error={state.error} success={state.success} />
      <button type="submit" className={prepButton({ variant: "secondary" })} disabled={pending}>
        {pending ? "Saving…" : "Save fees"}
      </button>
    </form>
  );
}

export function CampaignForm({ campaign }: { campaign?: { id: string; title: string; description: string; goal: string } }) {
  const [state, action, pending] = useActionState<PaymentsFormState, FormData>(saveCampaignAction, {});
  const id = campaign?.id ?? "new";
  return (
    <form action={action} className="space-y-3">
      {campaign ? <input type="hidden" name="id" value={campaign.id} /> : null}
      <Field id={`camp-title-${id}`} label="Project title" name="title" defaultValue={campaign?.title} required maxLength={120} />
      <div className="space-y-1.5">
        <label htmlFor={`camp-desc-${id}`} className="block text-sm font-semibold">
          What the money is for
        </label>
        <textarea
          id={`camp-desc-${id}`}
          name="description"
          rows={3}
          maxLength={2000}
          defaultValue={campaign?.description}
          className="w-full rounded-xl border border-prep-input bg-prep-surface px-3.5 py-3 text-base leading-relaxed focus-visible:border-prep-primary focus-visible:outline-2 focus-visible:outline-prep-primary"
        />
      </div>
      <Field id={`camp-goal-${id}`} label="Goal (GH₵, optional)" name="goal" inputMode="decimal" defaultValue={campaign?.goal} />
      <FormMessage error={state.error} success={state.success} />
      <button type="submit" className={prepButton()} disabled={pending}>
        {pending ? "Saving…" : campaign ? "Save changes" : "Add project"}
      </button>
    </form>
  );
}
