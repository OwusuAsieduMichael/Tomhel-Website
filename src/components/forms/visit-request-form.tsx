"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormFeedback, SubmitButtonContent } from "@/components/forms/form-feedback";
import { useFormSubmission } from "@/components/forms/use-form-submission";
import { visitRequestSchema, type VisitRequestFormData } from "@/lib/forms/schemas";
import { submitVisitRequest } from "@/lib/forms/submit-form";
import { VISIT_SUCCESS_MESSAGE } from "@/lib/forms/messages";

export function VisitRequestForm() {
  const { status, errorMessage, runSubmission, isSubmitting } = useFormSubmission();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<VisitRequestFormData>({
    resolver: zodResolver(visitRequestSchema),
    defaultValues: { _honeypot: "", visitorsCount: 1 },
  });

  async function onSubmit(data: VisitRequestFormData) {
    await runSubmission(() => submitVisitRequest(data), () => {
      reset({ _honeypot: "", visitorsCount: 1 });
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="relative space-y-6" noValidate>
      <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden>
        <Label htmlFor="visit-honeypot">Leave blank</Label>
        <Input id="visit-honeypot" tabIndex={-1} autoComplete="off" {...register("_honeypot")} />
      </div>

      <fieldset className="space-y-6" disabled={isSubmitting}>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="visit-name">Parent Name</Label>
            <Input id="visit-name" {...register("name")} aria-invalid={!!errors.name} />
            {errors.name && (
              <p className="text-sm text-red-600" role="alert">
                {errors.name.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="visit-email">Email</Label>
            <Input id="visit-email" type="email" {...register("email")} aria-invalid={!!errors.email} />
            {errors.email && (
              <p className="text-sm text-red-600" role="alert">
                {errors.email.message}
              </p>
            )}
          </div>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="visit-phone">Phone Number</Label>
            <Input id="visit-phone" type="tel" {...register("phone")} aria-invalid={!!errors.phone} />
            {errors.phone && (
              <p className="text-sm text-red-600" role="alert">
                {errors.phone.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="visit-date">Preferred Visit Date</Label>
            <Input id="visit-date" type="date" {...register("visitDate")} aria-invalid={!!errors.visitDate} />
            {errors.visitDate && (
              <p className="text-sm text-red-600" role="alert">
                {errors.visitDate.message}
              </p>
            )}
          </div>
        </div>
        <div className="space-y-2 sm:max-w-xs">
          <Label htmlFor="visitors-count">Number of Visitors</Label>
          <Input
            id="visitors-count"
            type="number"
            min={1}
            max={20}
            {...register("visitorsCount", { valueAsNumber: true })}
            aria-invalid={!!errors.visitorsCount}
          />
          {errors.visitorsCount && (
            <p className="text-sm text-red-600" role="alert">
              {errors.visitorsCount.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="visit-message">Additional Message</Label>
          <Textarea
            id="visit-message"
            rows={4}
            {...register("message")}
            placeholder="Tell us about your child’s age, class of interest, or any scheduling preferences..."
          />
        </div>
      </fieldset>

      <FormFeedback
        status={status}
        successMessage={VISIT_SUCCESS_MESSAGE}
        errorMessage={errorMessage}
      />

      <Button type="submit" disabled={isSubmitting} className="w-full gap-2 sm:w-auto">
        <SubmitButtonContent
          isSubmitting={isSubmitting}
          idleLabel="Request a Visit"
          loadingLabel="Submitting request..."
        />
      </Button>
    </form>
  );
}
