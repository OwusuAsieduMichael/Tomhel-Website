import { ArrowLeft, Check, Download } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { PageHeading, PrepCard, prepButton } from "@/components/prep/ui";
import { getPaperOverview } from "@/lib/prep/admin/question-bank";
import { requireRole } from "@/lib/prep/auth/current-user";
import { getStore } from "@/lib/prep/store";
import { cn } from "@/lib/utils";
import { approveAllAction, setQuestionStatusAction } from "../../actions";

export const metadata: Metadata = { title: "Paper" };

const strictnessLabel = { exact: "Exact", key_term: "Key term", meaning: "Meaning", rubric: "Rubric" } as const;

function StatusBadge({ status }: { status: "draft" | "approved" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        status === "approved" ? "bg-prep-primary-soft text-prep-awarded" : "bg-prep-misspelt-bg text-prep-misspelt",
      )}
    >
      {status === "approved" ? "Approved" : "Draft"}
    </span>
  );
}

export default async function PaperPage({ params }: { params: Promise<{ paperId: string }> }) {
  await requireRole("admin");
  const { paperId } = await params;
  if (!z.string().uuid().safeParse(paperId).success) notFound();
  const overview = await getPaperOverview(getStore(), paperId);
  if (!overview) notFound();
  const { paper, questions } = overview;
  const drafts = questions.filter((q) => q.status === "draft").length;
  const totalMarks = questions.reduce((s, q) => s + q.marks, 0);

  return (
    <div className="space-y-6">
      <Link href="/prep/admin/questions" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-prep-muted hover:text-prep-ink">
        <ArrowLeft className="size-4" aria-hidden /> All papers
      </Link>
      <PageHeading
        title={`${paper.subjectName} ${paper.year}, Paper ${paper.paperNo}`}
        description={`${questions.length} questions · ${totalMarks} marks${paper.durationMinutes ? ` · ${paper.durationMinutes} minutes` : ""} · ${drafts} draft`}
      />

      <div className="flex flex-wrap gap-3">
        {drafts ? (
          <form action={approveAllAction}>
            <input type="hidden" name="paperId" value={paper.id} />
            <button type="submit" className={prepButton()}>
              <Check aria-hidden /> Approve all {drafts} drafts
            </button>
          </form>
        ) : null}
        <a href={`/prep/admin/questions/${paper.id}/export`} className={prepButton({ variant: "secondary" })} download>
          <Download aria-hidden /> Export (JSON)
        </a>
      </div>

      {paper.instructions ? (
        <PrepCard className="bg-prep-ground text-sm">
          <p className="font-semibold">Instructions</p>
          <p className="mt-1 whitespace-pre-line text-prep-muted">{paper.instructions}</p>
        </PrepCard>
      ) : null}

      <ol className="space-y-4">
        {questions.map((q) => (
          <li key={q.id}>
            <PrepCard className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold">{q.numberLabel}</h2>
                <StatusBadge status={q.status} />
                <span className="text-sm text-prep-muted">
                  {q.type === "mcq" ? "Multiple choice" : q.type} · {q.marks} {q.marks === 1 ? "mark" : "marks"} · {q.code}
                  {q.topic ? ` · ${q.topic.strand}${q.topic.subStrand ? ` / ${q.topic.subStrand}` : ""}` : ""}
                </span>
              </div>
              <p className="whitespace-pre-line">{q.text}</p>
              {q.imageUrls.length ? <p className="text-sm text-prep-muted">{q.imageUrls.length} image(s) attached</p> : null}

              {q.options.length ? (
                <ul className="space-y-1 text-sm">
                  {q.options.map((o) => (
                    <li key={o.label} className={cn(o.isCorrect && "font-semibold text-prep-awarded")}>
                      {o.label}. {o.text}
                      {o.isCorrect ? " ✓ correct" : ""}
                    </li>
                  ))}
                </ul>
              ) : null}

              {q.markingPoints.length ? (
                <div className="text-sm">
                  <p className="font-semibold">Marking scheme</p>
                  <ol className="mt-1 list-decimal space-y-1 pl-5">
                    {q.markingPoints.map((mp, i) => (
                      <li key={i}>
                        {mp.description} <span className="text-prep-muted">({mp.marks}, {strictnessLabel[mp.strictness]})</span>
                        {mp.keyTerms.length ? <span className="text-prep-muted"> · key terms: {mp.keyTerms.join(", ")}</span> : null}
                        {mp.acceptedAlternatives.length ? (
                          <span className="text-prep-muted"> · also accept: {mp.acceptedAlternatives.join("; ")}</span>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}

              {q.modelAnswer ? (
                <p className="text-sm">
                  <span className="font-semibold">Model answer: </span>
                  <span className="text-prep-muted">{q.modelAnswer}</span>
                </p>
              ) : null}

              <div className="flex flex-wrap gap-2 pt-1">
                <Link href={`/prep/admin/questions/${paper.id}/${q.id}`} className={prepButton({ variant: "secondary" })}>
                  Edit
                </Link>
                <form action={setQuestionStatusAction}>
                  <input type="hidden" name="questionId" value={q.id} />
                  <input type="hidden" name="status" value={q.status === "approved" ? "draft" : "approved"} />
                  <button type="submit" className={prepButton({ variant: q.status === "approved" ? "ghost" : "primary" })}>
                    {q.status === "approved" ? "Back to draft" : "Approve"}
                  </button>
                </form>
              </div>
            </PrepCard>
          </li>
        ))}
      </ol>
    </div>
  );
}
