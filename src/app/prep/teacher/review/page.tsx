import type { Metadata } from "next";
import { ComingSoon, PageHeading } from "@/components/prep/ui";
import { requireRole } from "@/lib/prep/auth/current-user";

export const metadata: Metadata = { title: "Review queue" };

export default async function ReviewPage() {
  await requireRole("teacher");
  return (
    <>
      <PageHeading title="Review queue" description="French and Twi theory, mark queries and low-confidence AI marks." />
      <ComingSoon what="The theory review queue" phase={5} />
    </>
  );
}
