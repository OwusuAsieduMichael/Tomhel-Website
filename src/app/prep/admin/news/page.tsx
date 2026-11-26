import type { Metadata } from "next";
import Link from "next/link";
import { DataTable } from "@/components/prep/data-table";
import { PageHeading, PrepCard, prepButton } from "@/components/prep/ui";
import { requireRole } from "@/lib/prep/auth/current-user";
import { formatDayTime } from "@/lib/prep/format";
import { listNewsPosts } from "@/lib/prep/news";
import { formatEventDates } from "@/lib/news-dates";
import { getStore } from "@/lib/prep/store";

export const metadata: Metadata = { title: "Website news" };

export default async function AdminNewsPage() {
  await requireRole("admin");
  const posts = await listNewsPosts(getStore());

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeading title="Website news" description="News, announcements and dates on the public website (News & Events). Published posts show there within moments." />
        <Link href="/prep/admin/news/new" className={prepButton()}>
          Write a post
        </Link>
      </div>
      {posts.length ? (
        <DataTable
          caption="Website posts"
          headers={["Title", "Category", "Date of event", "Status", "Last changed"]}
          rows={posts.map((p) => [
            <Link key="t" href={`/prep/admin/news/${p.id}`} className="font-semibold text-prep-primary hover:underline">
              {p.title}
            </Link>,
            p.category,
            p.eventStart ? formatEventDates(p.eventStart.toISOString(), p.eventEnd?.toISOString()) : "—",
            p.status === "published" ? (
              <a key="s" href={`/news/${p.slug}`} target="_blank" rel="noreferrer" className="text-prep-awarded underline">
                On the website
              </a>
            ) : (
              "Draft"
            ),
            formatDayTime(p.updatedAt),
          ])}
        />
      ) : (
        <PrepCard className="text-prep-muted">
          No posts yet. The website shows the school&apos;s earlier articles until you publish one; yours appear first.
        </PrepCard>
      )}
    </div>
  );
}
