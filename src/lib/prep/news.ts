import { z } from "zod";
import { insert, NEWS_CATEGORIES, newId, remove, StoreConflictError, update, type NewsPost, type Store } from "@/lib/prep/store";

/**
 * Website news written by admins in the portal: news, announcements and dates (graduation, sports day,
 * vacation). Published posts appear on the public News & Events page; those with dates also under
 * "Upcoming dates" until they are over. Drafts are only seen by admins.
 */

export class NewsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NewsError";
  }
}

const optionalDate = z
  .string()
  .trim()
  .transform((s, ctx) => {
    if (!s) return null;
    const d = new Date(`${s}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Dates are written as day, month and year." });
      return z.NEVER;
    }
    return d;
  });

export const newsInputSchema = z
  .object({
    title: z.string().trim().min(3, "Give the post a title.").max(140, "Keep the title under 140 characters."),
    category: z.enum(NEWS_CATEGORIES, { errorMap: () => ({ message: "Choose a category." }) }),
    excerpt: z.string().trim().min(10, "Write a short summary (a sentence or two).").max(300, "Keep the summary under 300 characters."),
    body: z.string().trim().max(20_000, "That is too long for one post."),
    eventStart: optionalDate,
    eventEnd: optionalDate,
    publish: z.boolean(),
  })
  .refine((v) => !v.eventEnd || (v.eventStart && v.eventEnd.getTime() >= v.eventStart.getTime()), {
    message: "The end date must be on or after the start date.",
    path: ["eventEnd"],
  });

export type NewsInput = z.input<typeof newsInputSchema>;

/** "Sports Day 2026!" -> "sports-day-2026" */
export function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "post"
  );
}

/** Creates (no id) or updates a post. Publishing sets the publish date the first time. Returns the post's id and slug. */
export async function saveNewsPost(store: Store, adminId: string, raw: NewsInput, id?: string, now = new Date()) {
  const parsed = newsInputSchema.safeParse(raw);
  if (!parsed.success) throw new NewsError(parsed.error.issues[0].message);
  const v = parsed.data;
  const { newsPosts } = await store.read("newsPosts");
  const fields = {
    title: v.title,
    category: v.category,
    excerpt: v.excerpt,
    body: v.body,
    eventStart: v.eventStart,
    eventEnd: v.eventEnd ?? null,
    status: v.publish ? ("published" as const) : ("draft" as const),
    updatedAt: now,
  };
  if (id) {
    const post = newsPosts.find((p) => p.id === id);
    if (!post) throw new NewsError("That post no longer exists.");
    await store.write([update("newsPosts", id, { ...fields, publishedAt: v.publish ? (post.publishedAt ?? now) : post.publishedAt })]);
    return { id, slug: post.slug };
  }
  // A unique address: the title, then -2, -3 ... if another post already has it.
  const base = slugify(v.title);
  const taken = new Set(newsPosts.map((p) => p.slug));
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
  const post: NewsPost = { id: newId(), slug, ...fields, publishedAt: v.publish ? now : null, createdBy: adminId, createdAt: now };
  try {
    await store.write([insert("newsPosts", [post], { unique: ["slug"] })]);
  } catch (e) {
    if (e instanceof StoreConflictError) throw new NewsError("Another post with that title was saved just now. Change the title a little and save again.");
    throw e;
  }
  return { id: post.id, slug };
}

export async function deleteNewsPost(store: Store, id: string) {
  await store.write([remove("newsPosts", [id])]);
}

/** Every post for the admin list, newest first. */
export async function listNewsPosts(store: Store) {
  const { newsPosts } = await store.read("newsPosts");
  return [...newsPosts].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

export async function getNewsPost(store: Store, id: string) {
  const { newsPosts } = await store.read("newsPosts");
  return newsPosts.find((p) => p.id === id) ?? null;
}

/** Published posts for the website, newest first. */
export async function publishedNews(store: Store): Promise<NewsPost[]> {
  const { newsPosts } = await store.read("newsPosts");
  return newsPosts
    .filter((p) => p.status === "published")
    .sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0));
}

/** The body as paragraphs (blank lines between them in the editor). */
export const paragraphs = (body: string) =>
  body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
