import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/prep/auth/current-user";
import { AttemptError } from "@/lib/prep/practice/attempts";
import { nextMixedBatch } from "@/lib/prep/practice/mixed";
import { getStore } from "@/lib/prep/store";
import { MixedRunner } from "./mixed-runner";

export const metadata: Metadata = { title: "Practice mode" };
export const dynamic = "force-dynamic";

/** Practice mode: one subject, every year mixed, untimed. Full-screen like a paper. */
export default async function MixedPracticePage({ params }: { params: Promise<{ code: string }> }) {
  const user = await requireRole("student");
  const { code } = await params;
  if (!/^[a-z0-9-]{1,16}$/i.test(code)) notFound();
  let batch;
  try {
    batch = await nextMixedBatch(getStore(), user.id, code);
  } catch (e) {
    if (e instanceof AttemptError) notFound();
    throw e;
  }
  return (
    <MixedRunner
      subject={{ name: batch.subject.name, code: batch.subject.code }}
      items={batch.items}
      stats={batch.stats}
      backHref={`/prep/student/subjects/${batch.subject.code.toLowerCase()}`}
    />
  );
}
