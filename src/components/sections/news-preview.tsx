import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container, Section } from "@/components/layout/container";
import { FadeIn } from "@/components/motion/fade-in";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getNewsArticles } from "@/lib/sanity";

export async function NewsPreview() {
  const articles = await getNewsArticles();
  const preview = articles.slice(0, 3);

  return (
    <Section surface>
      <Container>
        <FadeIn>
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent">News & Events</p>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-primary md:text-4xl">
                Latest from Tomhel
              </h2>
            </div>
            <Button variant="secondary" asChild>
              <Link href="/news">
                View all news
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          </div>
        </FadeIn>

        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {preview.map((article, index) => (
            <FadeIn key={article._id} delay={index * 0.1}>
              <Link
                href={`/news/${article.slug}`}
                className="group block overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-1 hover:shadow-md"
              >
                {article.image && (
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <Image
                      src={article.image}
                      alt=""
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  </div>
                )}
                <div className="p-6">
                  <Badge className="mb-3">{article.category}</Badge>
                  <h3 className="text-lg font-semibold text-primary group-hover:text-accent">{article.title}</h3>
                  <p className="mt-2 line-clamp-2 text-sm text-muted">{article.excerpt}</p>
                  <time className="mt-4 block text-xs text-muted" dateTime={article.publishedAt}>
                    {new Date(article.publishedAt).toLocaleDateString("en-GH", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </time>
                </div>
              </Link>
            </FadeIn>
          ))}
        </div>
      </Container>
    </Section>
  );
}
