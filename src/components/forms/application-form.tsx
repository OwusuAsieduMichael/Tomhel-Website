"use client";

import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButtonContent } from "@/components/forms/form-feedback";
import { FormSubmissionFeedback } from "@/components/forms/form-success-dialog";
import { useFormSubmission } from "@/components/forms/use-form-submission";
import {
  admissionSchema,
  CLASS_OPTIONS,
  GENDER_OPTIONS,
  type AdmissionFormData,
} from "@/lib/forms/schemas";
import { submitAdmission } from "@/lib/forms/submit-form";
import { getAdmissionSuccessContent } from "@/lib/forms/messages";

const EMPTY_ADMISSION_VALUES: AdmissionFormData = {
  studentName: "",
  dateOfBirth: "",
  gender: "",
  classApplyingFor: "",
  parentName: "",
  phone: "",
  email: "",
  address: "",
  previousSchool: "",
  notes: "",
  _honeypot: "",
};

export function ApplicationForm() {
  const {
    status,
    errorMessage,
    applicationId,
    setApplicationId,
    resetFeedback,
    runSubmission,
    isSubmitting,
  } = useFormSubmission();

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<AdmissionFormData>({
    resolver: zodResolver(admissionSchema),
    defaultValues: EMPTY_ADMISSION_VALUES,
  });

  const gender = watch("gender");
  const classApplyingFor = watch("classApplyingFor");

  const handleSuccessDismiss = useCallback(() => {
    resetFeedback();
    reset(EMPTY_ADMISSION_VALUES);
  }, [reset, resetFeedback]);

  async function onSubmit(data: AdmissionFormData) {
    await runSubmission(() => submitAdmission(data), (result) => {
      if (result.applicationId) {
        setApplicationId(result.applicationId);
      }
    });
  }

  const successContent = getAdmissionSuccessContent(applicationId);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="relative space-y-6" noValidate>
      <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden>
        <Label htmlFor="application-honeypot">Leave blank</Label>
        <Input id="application-honeypot" tabIndex={-1} autoComplete="off" {...register("_honeypot")} />
      </div>

      <fieldset className="space-y-6" disabled={isSubmitting || status === "success"}>
        <legend className="text-lg font-semibold text-primary">Student Information</legend>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="studentName">Student Full Name</Label>
            <Input id="studentName" {...register("studentName")} aria-invalid={!!errors.studentName} />
            {errors.studentName && (
              <p className="text-sm text-red-600" role="alert">
                {errors.studentName.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">Date of Birth</Label>
            <Input id="dateOfBirth" type="date" {...register("dateOfBirth")} aria-invalid={!!errors.dateOfBirth} />
            {errors.dateOfBirth && (
              <p className="text-sm text-red-600" role="alert">
                {errors.dateOfBirth.message}
              </p>
            )}
          </div>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="gender">Gender</Label>
            <Select
              value={gender}
              onValueChange={(value) => setValue("gender", value, { shouldValidate: true })}
            >
              <SelectTrigger id="gender" aria-invalid={!!errors.gender}>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                {GENDER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.gender && (
              <p className="text-sm text-red-600" role="alert">
                {errors.gender.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="classApplyingFor">Class Applying For</Label>
            <Select
              value={classApplyingFor}
              onValueChange={(value) => setValue("classApplyingFor", value, { shouldValidate: true })}
            >
              <SelectTrigger id="classApplyingFor" aria-invalid={!!errors.classApplyingFor}>
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {CLASS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.classApplyingFor && (
              <p className="text-sm text-red-600" role="alert">
                {errors.classApplyingFor.message}
              </p>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="address">Residential Address</Label>
          <Textarea
            id="address"
            rows={3}
            {...register("address")}
            aria-invalid={!!errors.address}
            placeholder="House number, street, area, city"
          />
          {errors.address && (
            <p className="text-sm text-red-600" role="alert">
              {errors.address.message}
            </p>
          )}
        </div>
      </fieldset>

      <fieldset className="space-y-6" disabled={isSubmitting || status === "success"}>
        <legend className="text-lg font-semibold text-primary">Parent / Guardian Information</legend>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="parentName">Parent / Guardian Name</Label>
            <Input id="parentName" {...register("parentName")} aria-invalid={!!errors.parentName} />
            {errors.parentName && (
              <p className="text-sm text-red-600" role="alert">
                {errors.parentName.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Parent Email</Label>
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
            <Label htmlFor="phone">Parent Phone Number</Label>
            <Input id="phone" type="tel" {...register("phone")} aria-invalid={!!errors.phone} />
            {errors.phone && (
              <p className="text-sm text-red-600" role="alert">
                {errors.phone.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="previousSchool">Previous School (if applicable)</Label>
            <Input id="previousSchool" {...register("previousSchool")} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Additional Notes</Label>
          <Textarea
            id="notes"
            rows={4}
            {...register("notes")}
            placeholder="Any special requirements or questions..."
          />
        </div>
      </fieldset>

      <FormSubmissionFeedback
        status={status}
        successTitle={successContent.title}
        successMessage={successContent.message}
        successDetail={successContent.detail}
        errorMessage={errorMessage}
        onDismiss={handleSuccessDismiss}
      />

      <Button type="submit" disabled={isSubmitting || status === "success"} size="lg" className="gap-2">
        <SubmitButtonContent
          isSubmitting={isSubmitting}
          idleLabel="Submit Application"
          loadingLabel="Submitting application..."
        />
      </Button>
    </form>
  );
}
