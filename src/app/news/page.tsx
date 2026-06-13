import type { Metadata } from "next";
import { Container, Section } from "@/components/layout/container";
import { BelowHeroShell } from "@/components/layout/below-hero-shell";
import { PageHeroVideo } from "@/components/layout/page-hero-video";
import { NewsList } from "./news-list";
import { getNewsArticles } from "@/lib/sanity";
import { schoolImages } from "@/lib/constants";
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
      <PageHeroVideo
        eyebrow="News & Events"
        title="Stay connected with Tomhel"
        description="Latest updates, upcoming events, important announcements, and student achievements."
        videoSrc={schoolImages.newsVideo}
      />

      <BelowHeroShell>
        <Section>
          <Container>
            <NewsList articles={articles} />
          </Container>
        </Section>
      </BelowHeroShell>
    </>
  );
}
