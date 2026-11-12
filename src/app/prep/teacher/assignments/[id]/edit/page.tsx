import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { AssignmentError, getAssignmentForEdit, getAssignmentFormOptions, toSchoolDateTimeInput } from "@/lib/prep/assignments";
import { requireRole } from "@/lib/prep/auth/current-user";
import { getStore } from "@/lib/prep/store";
import { AssignmentForm } from "../../assignment-form";

export const metadata: Metadata = { title: "Edit assignment" };

export default async function EditAssignmentPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("teacher");
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const store = getStore();
  let loaded;
  try {
    loaded = await getAssignmentForEdit(store, user, id);
  } catch (e) {
    if (e instanceof AssignmentError) notFound();
    throw e;
  }
  const { assignment: a, started } = loaded;
  const options = await getAssignmentFormOptions(store, user);

  return (
    <>
      <div className="mb-6">
        <Link href={`/prep/teacher/assignments/${a.id}`} className="text-sm font-semibold text-prep-primary hover:underline">
          {a.title}
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">{a.category === "quiz" ? "Edit quiz" : "Edit assignment"}</h1>
      </div>
      <AssignmentForm
        options={options}
        started={started}
        defaults={{
          id: a.id,
          category: a.category,
          subjectId: a.subjectId,
          source: a.source,
          kind: a.kind,
          paperId: a.paperId ?? "",
          topicIds: a.topicIds,
          questionIds: a.questionIds,
          // A topic quiz that drew fewer questions than its topics hold keeps that number.
          questionLimit: a.source === "topic" ? a.questionIds.length : null,
          title: a.title,
          classIds: a.classIds,
          timeLimitMinutes: a.timeLimitMinutes,
          opensAt: toSchoolDateTimeInput(a.opensAt),
          closesAt: toSchoolDateTimeInput(a.closesAt),
          attemptPolicy: a.attemptPolicy,
          solutions: a.solutions,
          status: a.status,
        }}
      />
    </>
  );
}
