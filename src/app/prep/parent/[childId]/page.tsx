import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { PrintButton } from "@/components/prep/print-button";
import { ProgressReport } from "@/components/prep/progress-report";
import { requireRole } from "@/lib/prep/auth/current-user";
import { childOf, ParentError } from "@/lib/prep/parents";
import { getStudentClass } from "@/lib/prep/queries";
import { fullReport } from "@/lib/prep/reports";
import { getStore } from "@/lib/prep/store";

export const metadata: Metadata = { title: "Progress report" };

export default async function ChildPage({ params }: { params: Promise<{ childId: string }> }) {
  const user = await requireRole("parent");
  const { childId } = await params;
  if (!z.string().uuid().safeParse(childId).success) notFound();
  const store = getStore();
  let child;
  try {
    child = await childOf(store, user.id, childId);
  } catch (e) {
    if (e instanceof ParentError) notFound();
    throw e;
  }
  const [schoolClass, report] = await Promise.all([getStudentClass(store, child.classId), fullReport(store, child)]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href="/prep/parent" aria-label="Back to my children" className="-ml-3 flex size-11 items-center justify-center rounded-xl hover:bg-prep-primary-soft print:hidden">
            <ChevronLeft className="size-[22px]" aria-hidden />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{child.name}</h1>
            <p className="text-sm text-prep-muted">
              Progress report · {child.loginId}
              {schoolClass ? ` · ${schoolClass.name}` : ""}
            </p>
          </div>
        </div>
        <PrintButton />
      </div>
      <ProgressReport report={report} who="other" attemptHref={(id) => `/prep/practice/${id}/results`} />
    </div>
  );
}
