import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PrepCard } from "@/components/prep/ui";
import { requireRole } from "@/lib/prep/auth/current-user";
import { getSubjectPapers } from "@/lib/prep/practice/attempts";
import { getStore } from "@/lib/prep/store";
import { shortSubjectName } from "@/lib/prep/subjects";
import { StartPaperForm } from "./start-form";

export const metadata: Metadata = { title: "Past papers" };

export default async function SubjectPapersPage({ params }: { params: Promise<{ code: string }> }) {
  await requireRole("student");
  const { code } = await params;
  if (!/^[a-z0-9-]{1,16}$/i.test(code)) notFound();
  const found = await getSubjectPapers(getStore(), code);
  if (!found) notFound();
  const { subject, papers } = found;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-5">
      <div className="flex items-center gap-2">
        <Link
          href="/prep/student/academic/bece"
          aria-label="Back to subjects"
          className="-ml-3 flex size-11 items-center justify-center rounded-xl hover:bg-prep-primary-soft focus-visible:outline-2 focus-visible:outline-prep-primary"
        >
          <ChevronLeft className="size-[22px]" aria-hidden />
        </Link>
        <h1 className="text-xl font-bold">{shortSubjectName(subject)} past papers</h1>
      </div>

      {papers.length ? (
        <StartPaperForm papers={papers} theoryToTeacher={!subject.autoMarkTheory} />
      ) : (
        <PrepCard className="text-prep-muted">No {subject.name} papers yet. Your teachers are adding them.</PrepCard>
      )}
    </div>
  );
}
