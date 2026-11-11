import type { Metadata } from "next";
import Link from "next/link";
import { PageHeading, PrepCard } from "@/components/prep/ui";
import { requireRole } from "@/lib/prep/auth/current-user";
import { formatAgo } from "@/lib/prep/format";
import { listReviewQueue } from "@/lib/prep/review";
import { getStore } from "@/lib/prep/store";
import { cn } from "@/lib/utils";
import { MarkingForm } from "./marking-form";
import { QueryForm } from "./query-form";

export const metadata: Metadata = { title: "Review queue" };
export const dynamic = "force-dynamic";

const hrefFor = (key: string) => `/prep/teacher/review?item=${encodeURIComponent(key)}`;

export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ item?: string }> }) {
  const user = await requireRole("teacher");
  const { item: wanted } = await searchParams;
  const queue = await listReviewQueue(getStore(), user);
  const now = new Date();

  if (queue.length === 0) {
    return (
      <>
        <PageHeading title="Review queue" description="Written answers waiting for you to mark." />
        <PrepCard className="text-prep-muted">Nothing to mark. French and Twi theory answers, answers the website can&apos;t mark by itself, and students&apos; mark queries appear here.</PrepCard>
      </>
    );
  }

  const index = Math.max(0, queue.findIndex((i) => i.key === wanted));
  const current = queue[index];
  const after = queue[index + 1] ?? null;
  // After returning a mark this item leaves the queue, so "next" is whatever follows it, or the top of the queue.
  const nextHref = after ? hrefFor(after.key) : "/prep/teacher/review";
  const subjects = [...new Set(queue.map((i) => i.subjectName))];

  return (
    <>
      <PageHeading title="Review queue" description={`Written answers waiting for you to mark · ${subjects.join(", ")}`} />
      <div className="grid items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        <section aria-labelledby="waiting" className="flex flex-col overflow-hidden rounded-2xl border border-prep-line bg-prep-surface">
          <h2 id="waiting" className="border-b border-prep-line px-4 py-3 text-xs font-bold tracking-wide text-prep-muted">
            {queue.length} WAITING · OLDEST FIRST
          </h2>
          <ul className="max-h-[70vh] overflow-y-auto">
            {queue.map((i) => (
              <li key={i.key}>
                <Link
                  href={hrefFor(i.key)}
                  aria-current={i.key === current.key ? "true" : undefined}
                  className={cn(
                    "flex flex-col gap-0.5 border-b border-prep-line px-4 py-3 last:border-b-0 hover:bg-prep-ground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-prep-primary",
                    i.key === current.key && "border-l-4 border-l-prep-primary bg-prep-primary-soft pl-3 hover:bg-prep-primary-soft",
                  )}
                >
                  <span className="text-sm font-bold">
                    {i.studentName} · {i.className.replace(/^JHS\s*/, "")}
                  </span>
                  <span className="text-[13px] text-prep-muted">
                    {i.kind === "query" ? "Mark query · " : ""}
                    {i.source}, Q{i.questionLabel} · {formatAgo(i.waitingSince, now)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {current.kind === "query" ? (
          <QueryForm
            key={current.key}
            item={{
              queryId: current.queryId!,
              attemptId: current.attemptId,
              heading: `${current.studentName} · ${current.className} · ${current.source}, Q${current.questionLabel}`,
              questionText: current.questionText,
              answer: current.answer,
              message: current.message ?? "",
              awarded: current.awarded ?? 0,
              marks: current.marks,
            }}
            nextHref={nextHref}
            skipHref={after ? hrefFor(after.key) : index > 0 ? hrefFor(queue[0].key) : null}
          />
        ) : (
        <MarkingForm
          key={current.key}
          item={{
            attemptId: current.attemptId,
            questionId: current.questionId,
            heading: `${current.studentName} · ${current.className} · ${current.source}, Q${current.questionLabel}`,
            questionText: current.questionText,
            marks: current.marks,
            answer: current.answer,
            markingPoints: current.markingPoints,
          }}
          nextHref={nextHref}
          skipHref={after ? hrefFor(after.key) : index > 0 ? hrefFor(queue[0].key) : null}
        />
        )}
      </div>
    </>
  );
}
