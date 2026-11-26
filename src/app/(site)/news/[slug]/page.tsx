import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/layout/back-link";
import { BelowHeroShell } from "@/components/layout/below-hero-shell";
import { Container, Section } from "@/components/layout/container";
import { Badge } from "@/components/ui/badge";
import { formatEventDates, getNewsArticle, getNewsArticles } from "@/lib/sanity";
import { siteConfig } from "@/lib/constants";

/** Posts written in the portal appear within five minutes (at once after saving, which refreshes the page). */
export const revalidate = 300;

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
    <BelowHeroShell>
    <Section className="pt-32">
      <Container className="max-w-3xl">
        <BackLink href="/news" label="Back to News" />

        <Badge className="mt-8">{article.category}</Badge>
        <h1 className="mt-4 text-balance text-3xl font-bold tracking-tight text-primary md:text-4xl lg:text-5xl">
          {article.title}
        </h1>
        <time className="mt-4 block text-sm text-deep" dateTime={article.publishedAt}>
          {new Date(article.publishedAt).toLocaleDateString("en-GH", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </time>
        {article.eventStart ? (
          <p className="mt-3 inline-flex rounded-full bg-accent/10 px-4 py-1.5 text-sm font-semibold text-primary">
            When: {formatEventDates(article.eventStart, article.eventEnd)}
          </p>
        ) : null}

        {article.image && (
          <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-2xl">
            <Image src={article.image} alt="" fill className="object-cover" sizes="768px" priority />
          </div>
        )}

        <div className="surface-card mt-10 max-w-none px-8 py-8 md:px-10">
        <div className="prose prose-lg max-w-none text-deep">
          <p className="text-lg leading-relaxed">{article.excerpt}</p>
          {article.body?.map((paragraph) => (
            <p key={paragraph.slice(0, 40)} className="mt-6 leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>
        </div>
      </Container>
    </Section>
    </BelowHeroShell>
  );
}
