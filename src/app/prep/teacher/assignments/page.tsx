import type { Metadata } from "next";
import { ComingSoon, PageHeading } from "@/components/prep/ui";
import { requireRole } from "@/lib/prep/auth/current-user";

export const metadata: Metadata = { title: "Assignments" };

export default async function AssignmentsPage() {
  await requireRole("teacher");
  return (
    <>
      <PageHeading title="Assignments" />
      <ComingSoon what="Creating assignments and the submission tracker" phase={5} />
    </>
  );
}
