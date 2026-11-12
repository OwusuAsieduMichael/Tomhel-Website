import type { Metadata } from "next";
import Link from "next/link";
import { getAssignmentFormOptions, toSchoolDateTimeInput } from "@/lib/prep/assignments";
import { requireRole } from "@/lib/prep/auth/current-user";
import { getStore } from "@/lib/prep/store";
import { AssignmentForm } from "../assignment-form";

export const metadata: Metadata = { title: "New assignment" };

export default async function NewAssignmentPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const user = await requireRole("teacher");
  const category = (await searchParams).category === "quiz" ? "quiz" : "assignment";
  const options = await getAssignmentFormOptions(getStore(), user);
  const first = options.find((s) => s.papers.length) ?? options[0];

  // Opens at the next whole hour; closes two days later at 6 pm.
  const opens = new Date();
  opens.setUTCMinutes(0, 0, 0);
  opens.setUTCHours(opens.getUTCHours() + 1);
  const closes = new Date(opens.getTime() + 2 * 86_400_000);
  closes.setUTCHours(18, 0, 0, 0);

  return (
    <>
      <div className="mb-6">
        <Link href="/prep/teacher/assignments" className="text-sm font-semibold text-prep-primary hover:underline">
          Quizzes & assignments
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">{category === "quiz" ? "New quiz" : "New assignment"}</h1>
      </div>
      <AssignmentForm
        options={options}
        started={false}
        defaults={{
          category,
          subjectId: first?.id ?? "",
          source: "paper",
          kind: "objective",
          paperId: first?.papers[0]?.id ?? "",
          topicIds: [],
          questionIds: [],
          questionLimit: null,
          title: "",
          classIds: first?.classes.map((c) => c.id) ?? [],
          timeLimitMinutes: first?.papers[0]?.durationMinutes ?? 30,
          opensAt: toSchoolDateTimeInput(opens),
          closesAt: toSchoolDateTimeInput(closes),
          attemptPolicy: "single",
          solutions: "after_close",
          status: "draft",
        }}
      />
    </>
  );
}
