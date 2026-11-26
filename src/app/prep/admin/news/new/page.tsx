import type { Metadata } from "next";
import { PageHeading, PrepCard } from "@/components/prep/ui";
import { requireRole } from "@/lib/prep/auth/current-user";
import { NewsForm } from "../news-form";

export const metadata: Metadata = { title: "Write a post" };

export default async function NewNewsPostPage() {
  await requireRole("admin");
  return (
    <div className="max-w-2xl space-y-6">
      <PageHeading title="Write a post" description="For the public website's News & Events page." />
      <PrepCard>
        <NewsForm />
      </PrepCard>
    </div>
  );
}
