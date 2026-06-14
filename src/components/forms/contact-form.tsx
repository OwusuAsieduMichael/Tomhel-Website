"use client";

import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButtonContent } from "@/components/forms/form-feedback";
import { FormSubmissionFeedback } from "@/components/forms/form-success-dialog";
import { useFormSubmission } from "@/components/forms/use-form-submission";
import { contactSchema, type ContactFormData } from "@/lib/forms/schemas";
import { submitContact } from "@/lib/forms/submit-form";
import { CONTACT_SUCCESS_CONTENT } from "@/lib/forms/messages";

const EMPTY_CONTACT_VALUES: ContactFormData = {
  name: "",
  email: "",
  phone: "",
  subject: "",
  message: "",
  _honeypot: "",
};

export function ContactForm() {
  const { status, errorMessage, resetFeedback, runSubmission, isSubmitting } = useFormSubmission();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: EMPTY_CONTACT_VALUES,
  });

  const handleSuccessDismiss = useCallback(() => {
    resetFeedback();
    reset(EMPTY_CONTACT_VALUES);
  }, [reset, resetFeedback]);

  async function onSubmit(data: ContactFormData) {
    await runSubmission(() => submitContact(data));
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="relative space-y-6" noValidate>
      <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden>
        <Label htmlFor="contact-honeypot">Leave blank</Label>
        <Input id="contact-honeypot" tabIndex={-1} autoComplete="off" {...register("_honeypot")} />
      </div>

      <fieldset className="space-y-6" disabled={isSubmitting || status === "success"}>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" {...register("name")} aria-invalid={!!errors.name} />
            {errors.name && (
              <p className="text-sm text-red-600" role="alert">
                {errors.name.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register("email")} aria-invalid={!!errors.email} />
            {errors.email && (
              <p className="text-sm text-red-600" role="alert">
                {errors.email.message}
              </p>
            )}
          </div>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input id="phone" type="tel" {...register("phone")} aria-invalid={!!errors.phone} />
            {errors.phone && (
              <p className="text-sm text-red-600" role="alert">
                {errors.phone.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" {...register("subject")} aria-invalid={!!errors.subject} />
            {errors.subject && (
              <p className="text-sm text-red-600" role="alert">
                {errors.subject.message}
              </p>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="message">Message</Label>
          <Textarea id="message" rows={5} {...register("message")} aria-invalid={!!errors.message} />
          {errors.message && (
            <p className="text-sm text-red-600" role="alert">
              {errors.message.message}
            </p>
          )}
        </div>
      </fieldset>

      <FormSubmissionFeedback
        status={status}
        successTitle={CONTACT_SUCCESS_CONTENT.title}
        successMessage={CONTACT_SUCCESS_CONTENT.message}
        errorMessage={errorMessage}
        onDismiss={handleSuccessDismiss}
      />

      <Button type="submit" disabled={isSubmitting || status === "success"} className="w-full gap-2 sm:w-auto">
        <SubmitButtonContent isSubmitting={isSubmitting} idleLabel="Send Message" loadingLabel="Sending..." />
      </Button>
    </form>
  );
}
