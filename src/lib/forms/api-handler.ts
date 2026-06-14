import { NextResponse } from "next/server";
import { isHoneypotFilled, postToGas } from "@/lib/forms/gas-server";
import type { FormEndpoint } from "@/lib/forms/types";

export async function handleFormPost(
  endpoint: FormEndpoint,
  payload: Record<string, unknown>
) {
  if (isHoneypotFilled(payload._honeypot)) {
    return NextResponse.json({ success: true, message: "Submission received." });
  }

  const data = { ...payload };
  delete data._honeypot;

  try {
    const result = await postToGas({ endpoint, ...data });
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to process your submission.";

    const status = message.includes("not configured") ? 503 : 502;

    return NextResponse.json({ success: false, message }, { status });
  }
}
