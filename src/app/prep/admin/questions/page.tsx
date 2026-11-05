import type { Metadata } from "next";
import Link from "next/link";
import { DataTable } from "@/components/prep/data-table";
import { PageHeading, PrepCard } from "@/components/prep/ui";
import { requireRole } from "@/lib/prep/auth/current-user";
import { getStore } from "@/lib/prep/store";
import { listPapersWithCounts } from "@/lib/prep/queries";
import { ImportPaperForm } from "./import-paper-form";

export const metadata: Metadata = { title: "Questions" };

export default async function QuestionsPage() {
  await requireRole("admin");
  const rows = await listPapersWithCounts(getStore());

  return (
    <div className="space-y-8">
      <PageHeading title="Questions" description="Past papers in the question bank." />

      <PrepCard className="max-w-2xl">
        <h2 className="mb-4 text-lg font-bold">Import a paper</h2>
        <ImportPaperForm />
      </PrepCard>

      <section aria-labelledby="papers-heading" className="space-y-3">
        <h2 id="papers-heading" className="text-lg font-bold">
          Past papers
        </h2>
        <DataTable
          caption="Past papers"
          headers={["Subject", "Year", "Paper", "Questions", "Approved", ""]}
          rows={rows.map((p) => [
            p.subject,
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
      </section>
    </div>
  );
}
