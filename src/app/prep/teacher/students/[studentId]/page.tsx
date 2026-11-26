import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { PrintButton } from "@/components/prep/print-button";
import { ProgressReport } from "@/components/prep/progress-report";
import { requireRole } from "@/lib/prep/auth/current-user";
import { studentReportFor } from "@/lib/prep/reports";
import { getStore } from "@/lib/prep/store";

export const metadata: Metadata = { title: "Progress report" };

/** One student's report, in the subjects this teacher teaches them. Other students are refused. */
export default async function TeacherStudentReportPage({ params }: { params: Promise<{ studentId: string }> }) {
  const user = await requireRole("teacher");
  const { studentId } = await params;
  if (!z.string().uuid().safeParse(studentId).success) notFound();
  const found = await studentReportFor(getStore(), user, studentId);
  if (!found) notFound();
  const { student, schoolClass, report, subjectNames } = found;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            href={schoolClass ? `/prep/teacher/students?class=${schoolClass.id}` : "/prep/teacher/students"}
            aria-label="Back to the class"
            className="-ml-3 flex size-11 items-center justify-center rounded-xl hover:bg-prep-primary-soft print:hidden"
          >
            <ChevronLeft className="size-[22px]" aria-hidden />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{student.name}</h1>
            <p className="text-sm text-prep-muted">
              Progress report · {student.loginId}
              {schoolClass ? ` · ${schoolClass.name}` : ""}
              {subjectNames ? ` · ${subjectNames.join(", ")}` : ""}
            </p>
          </div>
        </div>
        <PrintButton />
      </div>
      <ProgressReport report={report} who="other" attemptHref={(id) => `/prep/teacher/attempts/${id}`} />
    </div>
  );
}
