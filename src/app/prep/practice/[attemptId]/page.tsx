import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/prep/auth/current-user";
import { AttemptError, loadAttemptForRunner } from "@/lib/prep/practice/attempts";
import { getStore } from "@/lib/prep/store";
import { Runner } from "./runner";

export const metadata: Metadata = { title: "Paper" };
export const dynamic = "force-dynamic";

/** Full-screen paper: no app navigation, so nothing distracts from the timer and questions. */
export default async function AttemptPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const user = await requireRole("student");
  const { attemptId } = await params;
  if (!z.string().uuid().safeParse(attemptId).success) notFound();

  let data;
  try {
    data = await loadAttemptForRunner(getStore(), user.id, attemptId);
  } catch (e) {
    if (e instanceof AttemptError) notFound();
    throw e;
  }
  if (data.attempt.status === "submitted") redirect(`/prep/practice/${attemptId}/results`);

  return <Runner data={data} />;
}
