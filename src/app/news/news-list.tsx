"use client";

import Image from "next/image";
import Link from "next/link";
import { FadeIn } from "@/components/motion/fade-in";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { NewsArticle } from "@/lib/sanity";

const categories = ["All", "Events", "Announcements", "Achievements"];

interface NewsListProps {
  articles: NewsArticle[];
}

export function NewsList({ articles }: NewsListProps) {
  return (
    <Tabs defaultValue="All">
      <TabsList className="mb-10 flex h-auto flex-wrap justify-start gap-1">
        {categories.map((cat) => (
          <TabsTrigger key={cat} value={cat}>
            {cat}
          </TabsTrigger>
        ))}
      </TabsList>

      {categories.map((category) => {
        const filtered =
          category === "All"
            ? articles
            : articles.filter((a) => a.category === category);

        return (
          <TabsContent key={category} value={category}>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((article, index) => (
                <FadeIn key={article._id} delay={index * 0.05}>
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
                      <h2 className="text-lg font-semibold text-primary group-hover:text-accent">{article.title}</h2>
                      <p className="mt-2 line-clamp-3 text-sm text-muted">{article.excerpt}</p>
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
            {filtered.length === 0 && (
              <p className="text-center text-muted">No articles in this category yet.</p>
            )}
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
