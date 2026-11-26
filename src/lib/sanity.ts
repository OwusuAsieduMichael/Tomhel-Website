import { createClient } from "@sanity/client";
import { fallbackNews } from "@/lib/constants";

/**
 * News for the public website. Posts written by admins in the portal (Admin → Website news) come first,
 * then Sanity articles when Sanity is set up, otherwise the school's built-in articles.
 * The website never fails because of the portal: if its data can't be read, the other articles still show.
 */

export type NewsArticle = {
  _id: string;
  title: string;
  excerpt: string;
  category: string;
  publishedAt: string;
  slug: string;
  image?: string;
  body?: string[];
  /** Events and dates: when it happens (ISO dates). */
  eventStart?: string;
  eventEnd?: string;
};

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";

function getClient() {
  if (!projectId) return null;
  return createClient({
    projectId,
    dataset,
    apiVersion: "2024-01-01",
    useCdn: true,
  });
}

/** Published portal posts as articles, or [] if the portal's data can't be read. */
async function portalArticles(): Promise<NewsArticle[]> {
  try {
    const [{ getStore }, { paragraphs, publishedNews }] = await Promise.all([import("@/lib/prep/store"), import("@/lib/prep/news")]);
    const posts = await publishedNews(getStore());
    return posts.map((p) => ({
      _id: p.id,
      title: p.title,
      excerpt: p.excerpt,
      category: p.category,
      publishedAt: (p.publishedAt ?? p.createdAt).toISOString(),
      slug: p.slug,
      body: paragraphs(p.body),
      eventStart: p.eventStart?.toISOString(),
      eventEnd: p.eventEnd?.toISOString(),
    }));
  } catch (e) {
    console.error("Website news: portal posts unavailable", e instanceof Error ? e.message : e);
    return [];
  }
}

async function otherArticles(): Promise<NewsArticle[]> {
  const client = getClient();
  if (!client) return fallbackNews;
  try {
    const articles = await client.fetch<NewsArticle[]>(
      `*[_type == "newsArticle"] | order(publishedAt desc)[0...12]{
        _id,
        title,
        excerpt,
        category,
        publishedAt,
        "slug": slug.current,
        "image": mainImage.asset->url
      }`
    );
    return articles.length > 0 ? articles : fallbackNews;
  } catch {
    return fallbackNews;
  }
}

export async function getNewsArticles(): Promise<NewsArticle[]> {
  const [portal, other] = await Promise.all([portalArticles(), otherArticles()]);
  const slugs = new Set(portal.map((a) => a.slug));
  return [...portal, ...other.filter((a) => !slugs.has(a.slug))];
}

export async function getNewsArticle(slug: string): Promise<NewsArticle | null> {
  const fromPortal = (await portalArticles()).find((a) => a.slug === slug);
  if (fromPortal) return fromPortal;

  const client = getClient();
  if (!client) {
    return fallbackNews.find((a) => a.slug === slug) ?? null;
  }

  try {
    return await client.fetch<NewsArticle | null>(
      `*[_type == "newsArticle" && slug.current == $slug][0]{
        _id,
        title,
        excerpt,
        category,
        publishedAt,
        "slug": slug.current,
        "image": mainImage.asset->url
      }`,
      { slug }
    );
  } catch {
    return fallbackNews.find((a) => a.slug === slug) ?? null;
  }
}

/** Events and dates that aren't over yet, soonest first (graduation, sports day, vacation...). */
export async function getUpcomingDates(now = new Date()): Promise<NewsArticle[]> {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return (await portalArticles())
    .filter((a) => a.eventStart && new Date(a.eventEnd ?? a.eventStart).getTime() >= today)
    .sort((a, b) => a.eventStart!.localeCompare(b.eventStart!));
}

export { formatEventDates } from "./news-dates";
