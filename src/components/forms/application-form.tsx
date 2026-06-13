"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const applicationSchema = z.object({
  studentName: z.string().min(2, "Student name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gradeLevel: z.string().min(1, "Please select a grade level"),
  parentName: z.string().min(2, "Parent/guardian name is required"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  previousSchool: z.string().optional(),
  notes: z.string().optional(),
});

type ApplicationFormData = z.infer<typeof applicationSchema>;

export function ApplicationForm() {
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
    defaultValues: { gradeLevel: "" },
  });

  async function onSubmit(data: ApplicationFormData) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log("Application submitted:", data);
    reset();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <fieldset className="space-y-6">
        <legend className="text-lg font-semibold text-primary">Student Information</legend>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="studentName">Student Full Name</Label>
            <Input id="studentName" {...register("studentName")} aria-invalid={!!errors.studentName} />
            {errors.studentName && <p className="text-sm text-red-600" role="alert">{errors.studentName.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">Date of Birth</Label>
            <Input id="dateOfBirth" type="date" {...register("dateOfBirth")} aria-invalid={!!errors.dateOfBirth} />
            {errors.dateOfBirth && <p className="text-sm text-red-600" role="alert">{errors.dateOfBirth.message}</p>}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="gradeLevel">Grade Level Applying For</Label>
          <Select onValueChange={(value) => setValue("gradeLevel", value, { shouldValidate: true })}>
            <SelectTrigger id="gradeLevel" aria-invalid={!!errors.gradeLevel}>
              <SelectValue placeholder="Select grade level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="creche">Creche</SelectItem>
              <SelectItem value="nursery">Nursery</SelectItem>
              <SelectItem value="kg1">Kindergarten 1</SelectItem>
              <SelectItem value="kg2">Kindergarten 2</SelectItem>
              <SelectItem value="basic">Basic School (Grades 1 to 6)</SelectItem>
              <SelectItem value="jhs1">JHS 1</SelectItem>
              <SelectItem value="jhs2">JHS 2</SelectItem>
              <SelectItem value="jhs3">JHS 3</SelectItem>
            </SelectContent>
          </Select>
          {errors.gradeLevel && <p className="text-sm text-red-600" role="alert">{errors.gradeLevel.message}</p>}
        </div>
      </fieldset>

      <fieldset className="space-y-6">
        <legend className="text-lg font-semibold text-primary">Parent / Guardian Information</legend>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="parentName">Full Name</Label>
            <Input id="parentName" {...register("parentName")} aria-invalid={!!errors.parentName} />
            {errors.parentName && <p className="text-sm text-red-600" role="alert">{errors.parentName.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register("email")} aria-invalid={!!errors.email} />
            {errors.email && <p className="text-sm text-red-600" role="alert">{errors.email.message}</p>}
          </div>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" type="tel" {...register("phone")} aria-invalid={!!errors.phone} />
            {errors.phone && <p className="text-sm text-red-600" role="alert">{errors.phone.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="previousSchool">Previous School (if applicable)</Label>
            <Input id="previousSchool" {...register("previousSchool")} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Additional Notes</Label>
          <Textarea id="notes" rows={4} {...register("notes")} placeholder="Any special requirements or questions..." />
        </div>
      </fieldset>

      <Button type="submit" disabled={isSubmitting} size="lg">
        {isSubmitting ? "Submitting..." : "Submit Application"}
      </Button>

      {isSubmitSuccessful && (
        <p className="text-sm text-green-700" role="status">
          Application received! Our admissions team will contact you within 2 business days.
        </p>
      )}
    </form>
  );
}
