import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeading, PrepCard } from "@/components/prep/ui";
import { requireRole } from "@/lib/prep/auth/current-user";
import { childrenOf } from "@/lib/prep/parents";
import { getStudentClass } from "@/lib/prep/queries";
import { fullReport } from "@/lib/prep/reports";
import { getStore } from "@/lib/prep/store";

export const metadata: Metadata = { title: "My children" };

export default async function ParentHomePage() {
  const user = await requireRole("parent");
  const store = getStore();
  const children = await childrenOf(store, user.id);
  const cards = await Promise.all(
    children.map(async (c) => {
      const [schoolClass, report] = await Promise.all([getStudentClass(store, c.classId), fullReport(store, c)]);
      return { child: c, className: schoolClass?.name ?? null, report };
    }),
  );

  return (
    <>
      <PageHeading title="My children" description="Their BECE Prep, quizzes and assignments. You can look, but not change anything." />
      {cards.length ? (
        <ul className="space-y-3">
          {cards.map(({ child, className, report }) => (
            <li key={child.id}>
              <Link
                href={`/prep/parent/${child.id}`}
                className="flex items-center gap-4 rounded-2xl border border-prep-line bg-prep-surface p-4 hover:border-prep-primary"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-bold">{child.name}</p>
                  <p className="text-sm text-prep-muted">
                    {child.loginId}
                    {className ? ` · ${className}` : ""}
                  </p>
                  <ul className="mt-2 space-y-0.5 text-sm">
                    <li>
                      BECE Prep: {report.bece.done} {report.bece.done === 1 ? "paper" : "papers"}
                      {report.bece.average !== null ? `, average ${report.bece.average}%` : ""}
                    </li>
                    <li>
                      Quizzes: {report.quizzes.done}/{report.quizzes.set} done
                      {report.quizzes.missed ? `, ${report.quizzes.missed} missed` : ""}
                    </li>
                    <li>
                      Assignments: {report.assignments.done}/{report.assignments.set} done
                      {report.assignments.missed ? `, ${report.assignments.missed} missed` : ""}
                    </li>
                  </ul>
                </div>
                <ChevronRight className="size-5 shrink-0 text-prep-muted" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <PrepCard className="text-prep-muted">No children are linked to your account yet. Please contact the school office.</PrepCard>
      )}
    </>
  );
}
