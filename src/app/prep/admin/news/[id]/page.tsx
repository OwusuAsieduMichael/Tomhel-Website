import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { PageHeading, PrepCard } from "@/components/prep/ui";
import { requireRole } from "@/lib/prep/auth/current-user";
import { getNewsPost } from "@/lib/prep/news";
import { getStore } from "@/lib/prep/store";
import { deleteNewsAction } from "../actions";
import { DeleteButton } from "./delete-button";
import { NewsForm } from "../news-form";

export const metadata: Metadata = { title: "Edit post" };

const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

export default async function EditNewsPostPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  await requireRole("admin");
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const post = await getNewsPost(getStore(), id);
  if (!post) notFound();
  const saved = (await searchParams).saved;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="space-y-1">
        <Link href="/prep/admin/news" className="text-sm font-semibold text-prep-primary hover:underline">
          ← Website news
        </Link>
        <PageHeading title="Edit post" description={post.status === "published" ? `On the website at /news/${post.slug}` : "Draft: only admins can see it."} />
      </div>
      <PrepCard>
        <NewsForm
          savedNote={saved === "published" ? "Published. It is on the website now." : saved === "draft" ? "Saved as a draft. Only admins can see it." : undefined}
          post={{
            id: post.id,
            title: post.title,
            category: post.category,
            excerpt: post.excerpt,
            body: post.body,
            eventStart: day(post.eventStart),
            eventEnd: day(post.eventEnd),
            status: post.status,
          }}
        />
      </PrepCard>
      <form action={deleteNewsAction}>
        <input type="hidden" name="id" value={post.id} />
        <DeleteButton title={post.title} />
      </form>
    </div>
  );
}
