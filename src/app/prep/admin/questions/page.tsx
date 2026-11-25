import { ChevronDown } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { DataTable } from "@/components/prep/data-table";
import { PageHeading, PrepCard } from "@/components/prep/ui";
import { requireRole } from "@/lib/prep/auth/current-user";
import { getStore } from "@/lib/prep/store";
import { listPapersWithCounts } from "@/lib/prep/queries";
import { approveSubjectAction } from "../actions";
import { ApproveSubjectButton } from "./approve-subject-button";
import { ImportPaperForm } from "./import-paper-form";

export const metadata: Metadata = { title: "Questions" };

const fmt = (n: number) => n.toLocaleString("en-GB");

export default async function QuestionsPage() {
  await requireRole("admin");
  const rows = await listPapersWithCounts(getStore());

  // One card per subject (rows arrive sorted by subject, then newest year first).
  const subjects: { id: string; name: string; papers: typeof rows }[] = [];
  for (const r of rows) {
    const last = subjects.at(-1);
    if (last?.id === r.subjectId) last.papers.push(r);
    else subjects.push({ id: r.subjectId, name: r.subject, papers: [r] });
  }

  return (
    <div className="space-y-8">
      <PageHeading title="Questions" description="Past papers in the question bank. Students only see approved questions." />

      <section aria-labelledby="subjects-heading" className="space-y-3">
        <h2 id="subjects-heading" className="text-lg font-bold">
          Subjects
        </h2>
        {subjects.length ? null : <p className="text-prep-muted">No papers yet. Import one below.</p>}
        <ul className="space-y-3">
          {subjects.map((s) => {
            const questions = s.papers.reduce((n, p) => n + p.questions, 0);
            const approved = s.papers.reduce((n, p) => n + p.approved, 0);
            const drafts = questions - approved;
            const years = s.papers.map((p) => p.year);
            return (
              <li key={s.id}>
                <PrepCard className="p-0">
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-3 p-5">
                    <div className="min-w-48 flex-1">
                      <h3 className="text-base font-bold">{s.name}</h3>
                      <p className="text-sm text-prep-muted">
                        {s.papers.length} papers · {Math.min(...years)}–{Math.max(...years)} · {fmt(questions)} questions
                      </p>
                      <p className="mt-1 text-sm font-semibold">
                        {drafts ? (
                          <span className="text-prep-misspelt">
                            {fmt(approved)} approved · {fmt(drafts)} draft
                          </span>
                        ) : (
                          <span className="text-prep-awarded">All {fmt(questions)} approved</span>
                        )}
                      </p>
                    </div>
                    {drafts ? (
                      <form action={approveSubjectAction}>
                        <input type="hidden" name="subjectId" value={s.id} />
                        <ApproveSubjectButton drafts={drafts} subject={s.name} />
                      </form>
                    ) : null}
                  </div>

                  <details className="group border-t border-prep-line">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-5 py-3 text-sm font-semibold text-prep-primary [&::-webkit-details-marker]:hidden">
                      <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
                      Show papers
                    </summary>
                    <div className="px-5 pb-5">
                      <DataTable
                        caption={`${s.name} papers`}
                        headers={["Year", "Paper", "Questions", "Approved", ""]}
                        rows={s.papers.map((p) => [
                          p.year,
                          `Paper ${p.paperNo}`,
                          p.questions,
                          p.approved < p.questions ? (
                            <span key="a" className="font-semibold text-prep-misspelt">
                              {p.approved} of {p.questions}
                            </span>
                          ) : (
                            p.approved
                          ),
                          <Link key="l" href={`/prep/admin/questions/${p.id}`} className="font-semibold text-prep-primary underline">
                            Open
                          </Link>,
                        ])}
                      />
                    </div>
                  </details>
                </PrepCard>
              </li>
            );
          })}
        </ul>
      </section>

      <PrepCard className="max-w-2xl">
        <h2 className="mb-4 text-lg font-bold">Import a paper</h2>
        <ImportPaperForm />
      </PrepCard>
    </div>
  );
}
