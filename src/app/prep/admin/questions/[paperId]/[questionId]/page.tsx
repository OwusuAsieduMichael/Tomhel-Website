import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { PageHeading } from "@/components/prep/ui";
import { getQuestionForEdit } from "@/lib/prep/admin/question-bank";
import { requireRole } from "@/lib/prep/auth/current-user";
import { getStore } from "@/lib/prep/store";
import { QuestionEditor } from "./question-editor";

export const metadata: Metadata = { title: "Edit question" };

export default async function EditQuestionPage({ params }: { params: Promise<{ paperId: string; questionId: string }> }) {
  await requireRole("admin");
  const { paperId, questionId } = await params;
  const uuid = z.string().uuid();
  if (!uuid.safeParse(paperId).success || !uuid.safeParse(questionId).success) notFound();

  const question = await getQuestionForEdit(getStore(), questionId);
  if (!question || question.paperId !== paperId) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <Link
        href={`/prep/admin/questions/${paperId}`}
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-prep-muted hover:text-prep-ink"
      >
        <ArrowLeft className="size-4" aria-hidden /> Back to the paper
      </Link>
      <PageHeading title={`Edit question ${question.numberLabel}`} description={question.code} />
      <QuestionEditor paperId={paperId} question={question} />
    </div>
  );
}
