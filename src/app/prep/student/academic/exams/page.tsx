import type { Metadata } from "next";
import { ComingSoon } from "@/components/prep/ui";
import { requireRole } from "@/lib/prep/auth/current-user";

export const metadata: Metadata = { title: "Exams" };

export default async function ExamsPage() {
  await requireRole("student");
  return (
    <>
      <ComingSoon what="Work assigned by your teachers" phase={5} />
    </>
  );
}
