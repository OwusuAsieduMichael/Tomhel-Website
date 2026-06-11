import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/layout/back-link";
import { Container, Section } from "@/components/layout/container";
import { Badge } from "@/components/ui/badge";
import { getNewsArticle, getNewsArticles } from "@/lib/sanity";
import { siteConfig } from "@/lib/constants";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const articles = await getNewsArticles();
  return articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getNewsArticle(slug);
  if (!article) return { title: "Article Not Found" };

  return {
    title: article.title,
    description: article.excerpt,
    openGraph: {
      title: article.title,
      description: article.excerpt,
      url: `${siteConfig.url}/news/${slug}`,
      images: article.image ? [{ url: article.image }] : [],
    },
  };
}

export default async function NewsArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = await getNewsArticle(slug);
  if (!article) notFound();

  return (
    <Section className="pt-32">
      <Container className="max-w-3xl">
        <BackLink href="/news" label="Back to News" />

        <Badge className="mt-8">{article.category}</Badge>
        <h1 className="mt-4 text-balance text-3xl font-bold tracking-tight text-primary md:text-4xl lg:text-5xl">
          {article.title}
        </h1>
        <time className="mt-4 block text-sm text-muted" dateTime={article.publishedAt}>
          {new Date(article.publishedAt).toLocaleDateString("en-GH", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </time>

        {article.image && (
          <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-2xl">
            <Image src={article.image} alt="" fill className="object-cover" sizes="768px" priority />
          </div>
        )}

        <div className="prose prose-lg mt-10 max-w-none text-muted">
          <p className="text-lg leading-relaxed">{article.excerpt}</p>
          <p className="mt-6 leading-relaxed">
            This article is managed through Sanity CMS. Connect your Sanity project to publish full article content
            with rich text, images, and embedded media. Visit the Sanity Studio to add complete body content for
            this story.
          </p>
        </div>
      </Container>
    </Section>
  );
}
