import type { AdmissionFormData, ContactFormData, VisitRequestFormData } from "./schemas";
import { getClassLabel, getGenderLabel } from "./schemas";
import type { FormApiResponse } from "./types";

async function postJson<T>(path: string, body: T): Promise<FormApiResponse> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = (await response.json()) as FormApiResponse;

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Something went wrong. Please try again.");
  }

  return data;
}

export async function submitAdmission(data: AdmissionFormData) {
  const { _honeypot, classApplyingFor, gender, ...rest } = data;

  return postJson("/api/admissions", {
    ...rest,
    _honeypot,
    classApplyingFor: getClassLabel(classApplyingFor),
    gender: getGenderLabel(gender),
  });
}

export async function submitContact(data: ContactFormData) {
  return postJson("/api/messages", data);
}

export async function submitVisitRequest(data: VisitRequestFormData) {
  return postJson("/api/visit-request", data);
}
