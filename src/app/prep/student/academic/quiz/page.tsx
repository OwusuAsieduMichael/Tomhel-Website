import type { Metadata } from "next";
import { ComingSoon } from "@/components/prep/ui";
import { requireRole } from "@/lib/prep/auth/current-user";

export const metadata: Metadata = { title: "Quiz" };

export default async function QuizPage() {
  await requireRole("student");
  return (
    <>
      <ComingSoon what="Topic quizzes" phase={6} />
    </>
  );
}
