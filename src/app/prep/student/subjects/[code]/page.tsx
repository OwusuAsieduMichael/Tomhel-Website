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
        <>
          <section aria-labelledby="practice-mode" className="flex flex-col gap-2 rounded-2xl bg-prep-primary p-4 text-white">
            <h2 id="practice-mode" className="text-[17px] font-bold">
              Practice mode
            </h2>
            <p className="text-sm opacity-90">
              Questions from every year, mixed. No timer. See the answer straight away, and anything you get wrong comes back until you get it right.
            </p>
            <Link
              href={`/prep/practice/mixed/${subject.code.toLowerCase()}`}
              className="mt-1 flex min-h-12 items-center justify-center rounded-xl bg-white text-[15px] font-bold text-prep-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Start practising
            </Link>
          </section>
          <section aria-labelledby="test-mode" className="flex flex-col gap-3">
            <div>
              <h2 id="test-mode" className="text-[17px] font-bold">
                Test mode
              </h2>
              <p className="text-sm text-prep-muted">Choose one year&apos;s paper and do it the way you would in the exam.</p>
            </div>
            <StartPaperForm papers={papers} theoryToTeacher={!subject.autoMarkTheory} />
          </section>
        </>
      ) : (
        <PrepCard className="text-prep-muted">No {subject.name} papers yet. Your teachers are adding them.</PrepCard>
      )}
    </div>
  );
}
