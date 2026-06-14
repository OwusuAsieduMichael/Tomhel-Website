import { z } from "zod";

const phoneSchema = z
  .string()
  .min(10, "Please enter a valid phone number")
  .max(20, "Phone number is too long");

export const CLASS_OPTIONS = [
  { value: "creche", label: "Creche" },
  { value: "nursery", label: "Nursery" },
  { value: "kg1", label: "Kindergarten 1" },
  { value: "kg2", label: "Kindergarten 2" },
  { value: "basic", label: "Basic School (Grades 1 to 6)" },
  { value: "jhs1", label: "JHS 1" },
  { value: "jhs2", label: "JHS 2" },
  { value: "jhs3", label: "JHS 3" },
] as const;

export const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
] as const;

export function getClassLabel(value: string) {
  return CLASS_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function getGenderLabel(value: string) {
  return GENDER_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export const admissionSchema = z.object({
  studentName: z.string().min(2, "Student name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.string().min(1, "Please select gender"),
  classApplyingFor: z.string().min(1, "Please select a class"),
  parentName: z.string().min(2, "Parent/guardian name is required"),
  phone: phoneSchema,
  email: z.string().email("Please enter a valid email"),
  address: z.string().min(5, "Residential address is required"),
  previousSchool: z.string().optional(),
  notes: z.string().optional(),
  _honeypot: z.string().max(0).optional(),
});

export const contactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  phone: phoneSchema,
  subject: z.string().min(3, "Subject is required"),
  message: z.string().min(10, "Message must be at least 10 characters"),
  _honeypot: z.string().max(0).optional(),
});

export const visitRequestSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Please enter a valid email"),
  phone: phoneSchema,
  visitDate: z.string().min(1, "Preferred visit date is required"),
  visitorsCount: z.coerce
    .number({ invalid_type_error: "Enter number of visitors" })
    .int("Enter a whole number")
    .min(1, "At least 1 visitor")
    .max(20, "Maximum 20 visitors"),
  message: z.string().optional(),
  _honeypot: z.string().max(0).optional(),
});

export type AdmissionFormData = z.infer<typeof admissionSchema>;
export type ContactFormData = z.infer<typeof contactSchema>;
export type VisitRequestFormData = z.infer<typeof visitRequestSchema>;
