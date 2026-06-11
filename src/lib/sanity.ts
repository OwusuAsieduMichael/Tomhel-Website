import { createClient } from "@sanity/client";
import { fallbackNews } from "@/lib/constants";

export type NewsArticle = {
  _id: string;
  title: string;
  excerpt: string;
  category: string;
  publishedAt: string;
  slug: string;
  image?: string;
  body?: string[];
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

export async function getNewsArticles(): Promise<NewsArticle[]> {
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

export async function getNewsArticle(slug: string): Promise<NewsArticle | null> {
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
