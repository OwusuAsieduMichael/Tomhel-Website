"use client";

import { useCallback, useRef, useState } from "react";
import type { FormSubmitStatus } from "@/lib/forms/types";

const SUBMIT_COOLDOWN_MS = 3000;

export function useFormSubmission() {
  const [status, setStatus] = useState<FormSubmitStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const lastSubmitAt = useRef(0);

  const resetFeedback = useCallback(() => {
    setStatus("idle");
    setErrorMessage(null);
    setApplicationId(null);
  }, []);

  const runSubmission = useCallback(
    async <T,>(submitFn: () => Promise<T>, onSuccess?: (result: T) => void) => {
      const now = Date.now();
      if (now - lastSubmitAt.current < SUBMIT_COOLDOWN_MS) {
        return;
      }

      lastSubmitAt.current = now;
      setStatus("loading");
      setErrorMessage(null);
      setApplicationId(null);

      try {
        const result = await submitFn();
        onSuccess?.(result);
        setStatus("success");
      } catch (error) {
        setStatus("error");
        setErrorMessage(
          error instanceof Error ? error.message : "Something went wrong. Please try again."
        );
        lastSubmitAt.current = 0;
      }
    },
    []
  );

  return {
    status,
    errorMessage,
    applicationId,
    setApplicationId,
    resetFeedback,
    runSubmission,
    isSubmitting: status === "loading",
  };
}
