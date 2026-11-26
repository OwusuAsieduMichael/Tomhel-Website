"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/prep/auth/current-user";
import { sheetProblemMessage } from "@/lib/prep/errors";
import { deleteNewsPost, getNewsPost, NewsError, saveNewsPost } from "@/lib/prep/news";
import { getStore } from "@/lib/prep/store";

export type NewsFormState = { error?: string; saved?: string };

/** The website pages that show news: refreshed at once, so a saved post shows without waiting. */
function refreshWebsite(slug?: string) {
  revalidatePath("/news");
  revalidatePath("/");
  if (slug) revalidatePath(`/news/${slug}`);
  revalidatePath("/prep/admin/news", "layout");
}

export async function saveNewsAction(_prev: NewsFormState, formData: FormData): Promise<NewsFormState> {
  const admin = await requireRole("admin");
  const id = z.string().uuid().optional().safeParse(formData.get("id") || undefined);
  if (!id.success) return { error: "Unknown post." };
  const publish = formData.get("intent") === "publish";
  let result;
  try {
    result = await saveNewsPost(
      getStore(),
      admin.id,
      {
        title: String(formData.get("title") ?? ""),
        category: String(formData.get("category") ?? "") as never,
        excerpt: String(formData.get("excerpt") ?? ""),
        body: String(formData.get("body") ?? ""),
        eventStart: String(formData.get("eventStart") ?? ""),
        eventEnd: String(formData.get("eventEnd") ?? ""),
        publish,
      },
      id.data,
    );
  } catch (e) {
    if (e instanceof NewsError) return { error: e.message };
    const problem = sheetProblemMessage(e);
    if (problem) return { error: problem };
    throw e;
  }
  refreshWebsite(result.slug);
  if (!id.data) redirect(`/prep/admin/news/${result.id}?saved=${publish ? "published" : "draft"}`);
  return { saved: publish ? "Published. It is on the website now." : "Saved as a draft. Only admins can see it." };
}

export async function deleteNewsAction(formData: FormData) {
  await requireRole("admin");
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  const store = getStore();
  const post = await getNewsPost(store, id.data);
  await deleteNewsPost(store, id.data);
  refreshWebsite(post?.slug);
  redirect("/prep/admin/news");
}
