"use client";

import { Loader2 } from "lucide-react";

export function SubmitButtonContent({
  isSubmitting,
  idleLabel,
  loadingLabel = "Submitting...",
}: {
  isSubmitting: boolean;
  idleLabel: string;
  loadingLabel?: string;
}) {
  if (isSubmitting) {
    return (
      <>
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        {loadingLabel}
      </>
    );
  }

  return idleLabel;
}
