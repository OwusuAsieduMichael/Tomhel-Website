"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FormSubmitStatus } from "@/lib/forms/types";

export const SUCCESS_DIALOG_DURATION_MS = 8000;

type FormSuccessDialogProps = {
  open: boolean;
  title: string;
  message: string;
  detail?: string;
  onClose: () => void;
};

export function FormSuccessDialog({ open, title, message, detail, onClose }: FormSuccessDialogProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    const autoCloseTimer = window.setTimeout(onClose, SUCCESS_DIALOG_DURATION_MS);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      window.clearTimeout(autoCloseTimer);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="Close success dialog"
            className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="form-success-title"
              aria-describedby="form-success-message"
              className="pointer-events-auto w-full max-w-md rounded-2xl border border-black/[0.06] bg-white p-8 text-center shadow-2xl"
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
            >
              <div className="mx-auto flex h-20 w-20 items-center justify-center">
                <Image
                  src="/IMGG/confirmed.png"
                  alt=""
                  width={80}
                  height={80}
                  className="h-20 w-20 object-contain"
                  priority
                />
              </div>

              <h2 id="form-success-title" className="mt-5 text-2xl font-bold tracking-tight text-primary">
                {title}
              </h2>

              <p id="form-success-message" className="mt-3 text-sm leading-relaxed text-deep">
                {message}
              </p>

              {detail ? (
                <p className="mt-4 rounded-xl border border-taim-dark/10 bg-surface px-4 py-3 text-sm font-medium text-primary">
                  {detail}
                </p>
              ) : null}

              <Button type="button" className="mt-8 min-w-36" onClick={onClose}>
                Done
              </Button>
            </motion.div>
          </div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

type FormSubmissionFeedbackProps = {
  status: FormSubmitStatus;
  successTitle: string;
  successMessage: string;
  successDetail?: string;
  errorMessage?: string | null;
  onDismiss: () => void;
  className?: string;
};

export function FormSubmissionFeedback({
  status,
  successTitle,
  successMessage,
  successDetail,
  errorMessage,
  onDismiss,
  className,
}: FormSubmissionFeedbackProps) {
  return (
    <>
      <FormSuccessDialog
        open={status === "success"}
        title={successTitle}
        message={successMessage}
        detail={successDetail}
        onClose={onDismiss}
      />

      {status === "error" ? (
        <div
          role="alert"
          aria-live="assertive"
          className={cn(
            "flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900",
            className
          )}
        >
          <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden />
          <p>{errorMessage || "Something went wrong. Please try again."}</p>
        </div>
      ) : null}
    </>
  );
}
