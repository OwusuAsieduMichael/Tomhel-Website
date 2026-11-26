import type { Metadata } from "next";
import Link from "next/link";
import { Container, Section } from "@/components/layout/container";
import { BelowHeroShell } from "@/components/layout/below-hero-shell";
import { PageHeroVideo } from "@/components/layout/page-hero-video";
import { NewsList } from "./news-list";
import { formatEventDates, getNewsArticles, getUpcomingDates } from "@/lib/sanity";
import { schoolImages } from "@/lib/constants";
import { createPageMetadata } from "@/lib/seo";

/** Posts written in the portal appear within five minutes (at once after saving, which refreshes the page). */
export const revalidate = 300;

export const metadata: Metadata = createPageMetadata({
  title: "News & Events",
  description: "Stay updated with the latest news, events, announcements, and achievements from Tomhel Preparatory School.",
  path: "/news",
});

export default async function NewsPage() {
  const [articles, dates] = await Promise.all([getNewsArticles(), getUpcomingDates()]);

  return (
    <>
      <PageHeroVideo
        eyebrow="News & Events"
        title="Stay connected with Tomhel"
        description="Latest updates, upcoming events, important announcements, and student achievements."
        videoSrc={schoolImages.newsVideo}
      />

      <BelowHeroShell>
        {dates.length ? (
          <Section>
            <Container>
              <section aria-labelledby="upcoming-dates" className="surface-card p-6 md:p-8">
                <h2 id="upcoming-dates" className="text-2xl font-bold tracking-tight text-primary">
                  Upcoming dates
                </h2>
                <ul className="mt-5 divide-y divide-black/10">
                  {dates.map((d) => (
                    <li key={d._id} className="flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:gap-6">
                      <span className="shrink-0 text-sm font-semibold text-accent sm:w-56">{formatEventDates(d.eventStart!, d.eventEnd)}</span>
                      <span className="min-w-0">
                        <Link href={`/news/${d.slug}`} className="font-semibold text-primary hover:text-accent">
                          {d.title}
                        </Link>
                        <span className="block text-sm text-deep">{d.excerpt}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            </Container>
          </Section>
        ) : null}
        <Section>
          <Container>
            <NewsList articles={articles} />
          </Container>
        </Section>
      </BelowHeroShell>
    </>
  );
}
