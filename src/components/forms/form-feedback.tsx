"use client";

import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FormSubmitStatus } from "@/lib/forms/types";

type FormFeedbackProps = {
  status: FormSubmitStatus;
  successMessage?: string;
  errorMessage?: string | null;
  className?: string;
};

export function FormFeedback({
  status,
  successMessage = "Submission received.",
  errorMessage,
  className,
}: FormFeedbackProps) {
  if (status === "idle" || status === "loading") {
    return null;
  }

  const isSuccess = status === "success";

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm",
        isSuccess
          ? "border-green-200 bg-green-50 text-green-900"
          : "border-red-200 bg-red-50 text-red-900",
        className
      )}
    >
      {isSuccess ? (
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" aria-hidden />
      ) : (
        <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden />
      )}
      <p>{isSuccess ? successMessage : errorMessage || "Something went wrong. Please try again."}</p>
    </div>
  );
}

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
