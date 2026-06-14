import type { FormApiResponse, FormEndpoint } from "./types";

type GasPayload = Record<string, unknown> & { endpoint: FormEndpoint };

export async function postToGas(payload: GasPayload): Promise<FormApiResponse> {
  const url = process.env.GAS_WEB_APP_URL;

  if (!url) {
    throw new Error("Forms backend is not configured. Please contact the school office.");
  }

  const body: GasPayload = {
    ...payload,
    secret: process.env.GAS_API_SECRET || undefined,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  let data: FormApiResponse;

  try {
    data = (await response.json()) as FormApiResponse;
  } catch {
    throw new Error("Invalid response from forms backend.");
  }

  if (!data.success) {
    throw new Error(data.message || "Submission failed. Please try again.");
  }

  return data;
}

export function isHoneypotFilled(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}
