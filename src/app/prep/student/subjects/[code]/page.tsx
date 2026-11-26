import { ChevronLeft, ClipboardCheck, Shuffle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PrepCard } from "@/components/prep/ui";
import { requireRole } from "@/lib/prep/auth/current-user";
import { getSubjectPapers } from "@/lib/prep/practice/attempts";
import { getStore } from "@/lib/prep/store";
import { shortSubjectName } from "@/lib/prep/subjects";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Past papers" };

/** A subject's two ways to prepare, side by side: Practice mode (every year mixed) and Test mode (one paper). */
export default async function SubjectPapersPage({ params }: { params: Promise<{ code: string }> }) {
  await requireRole("student");
  const { code } = await params;
  if (!/^[a-z0-9-]{1,16}$/i.test(code)) notFound();
  const found = await getSubjectPapers(getStore(), code);
  if (!found) notFound();
  const { subject, papers } = found;
  const years = [...new Set(papers.map((p) => p.year))];
  const span = years.length ? (years.length === 1 ? String(years[0]) : `${Math.min(...years)}–${Math.max(...years)}`) : "";

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
          <ModeCard
            id="practice-mode"
            tone="green"
            icon={<Shuffle aria-hidden />}
            title="Practice mode"
            text="Questions from every year, mixed. No timer. See the answer straight away, and anything you get wrong comes back until you get it right."
            href={`/prep/practice/mixed/${subject.code.toLowerCase()}`}
            action="Start practising"
          />
          <ModeCard
            id="test-mode"
            tone="dark"
            icon={<ClipboardCheck aria-hidden />}
            title="Test mode"
            text={`Choose one year's paper${span ? ` (${span})` : ""} and do it the way you would in the exam: timed if you like, with your score at the end.`}
            href={`/prep/student/subjects/${subject.code.toLowerCase()}/test`}
            action="Choose a paper"
          />
        </>
      ) : (
        <PrepCard className="text-prep-muted">No {subject.name} papers yet. Your teachers are adding them.</PrepCard>
      )}
    </div>
  );
}

function ModeCard({
  id,
  tone,
  icon,
  title,
  text,
  href,
  action,
}: {
  id: string;
  tone: "green" | "dark";
  icon: React.ReactNode;
  title: string;
  text: string;
  href: string;
  action: string;
}) {
  return (
    <section aria-labelledby={id} className={cn("flex flex-col gap-2 rounded-2xl p-4 text-white", tone === "green" ? "bg-prep-primary" : "bg-prep-ink")}>
      <h2 id={id} className="flex items-center gap-2 text-[17px] font-bold [&_svg]:size-5">
        {icon}
        {title}
      </h2>
      <p className="text-sm opacity-90">{text}</p>
      <Link
        href={href}
        className={cn(
          "mt-1 flex min-h-12 items-center justify-center rounded-xl bg-white text-[15px] font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
          tone === "green" ? "text-prep-primary" : "text-prep-ink",
        )}
      >
        {action}
      </Link>
    </section>
  );
}
