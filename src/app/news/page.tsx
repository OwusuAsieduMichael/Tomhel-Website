import type { Metadata } from "next";
import { Container, Section } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { NewsList } from "./news-list";
import { getNewsArticles } from "@/lib/sanity";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "News & Events",
  description: "Stay updated with the latest news, events, announcements, and achievements from Tomhel Preparatory School.",
  path: "/news",
});

export default async function NewsPage() {
  const articles = await getNewsArticles();

  return (
    <>
      <PageHero
        eyebrow="News & Events"
        title="Stay connected with Tomhel"
        description="Latest updates, upcoming events, important announcements, and student achievements."
      />

      <Section>
        <Container>
          <NewsList articles={articles} />
        </Container>
      </Section>
    </>
  );
}
