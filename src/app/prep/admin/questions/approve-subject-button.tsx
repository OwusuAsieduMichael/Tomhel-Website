"use client";

import { Check, LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";
import { prepButton } from "@/components/prep/ui";

/** Submit button for "approve every draft in this subject": shows progress and can't be tapped twice. */
export function ApproveSubjectButton({ drafts, subject }: { drafts: number; subject: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={prepButton()} aria-label={`Approve all ${drafts} draft questions in ${subject}`}>
      {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : <Check aria-hidden />}
      {pending ? "Approving…" : `Approve all ${drafts.toLocaleString()}`}
    </button>
  );
}
