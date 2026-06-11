"use client";

import Image from "next/image";
import { useState } from "react";
import { Container, Section } from "@/components/layout/container";
import { BelowHeroShell } from "@/components/layout/below-hero-shell";
import { PageHero } from "@/components/layout/page-hero";
import { FadeIn } from "@/components/motion/fade-in";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { galleryCategories } from "@/lib/constants";

export function GalleryContent() {
  const [activeTab, setActiveTab] = useState(galleryCategories[0].id);

  return (
    <>
      <PageHero
        eyebrow="Gallery"
        title="Life at Tomhel"
        description="Explore our campus, classrooms, events, sports, and graduation moments through the eyes of our community."
      />

      <BelowHeroShell>
      <Section>
        <Container>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <FadeIn>
              <TabsList className="mb-8 flex h-auto w-full flex-wrap justify-start gap-1">
                {galleryCategories.map((cat) => (
                  <TabsTrigger key={cat.id} value={cat.id} className="px-4">
                    {cat.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </FadeIn>

            {galleryCategories.map((category) => (
              <TabsContent key={category.id} value={category.id}>
                <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
                  {category.images.map((src, index) => (
                    <FadeIn key={src} delay={index * 0.05}>
                      <div className="mb-4 break-inside-avoid overflow-hidden rounded-2xl">
                        <div
                          className={`relative w-full overflow-hidden ${
                            index % 3 === 0 ? "aspect-[3/4]" : index % 3 === 1 ? "aspect-square" : "aspect-[4/3]"
                          }`}
                        >
                          <Image
                            src={src}
                            alt={`${category.label} photo ${index + 1}`}
                            fill
                            className="object-cover transition-transform duration-500 hover:scale-105"
                            sizes="(max-width: 768px) 100vw, 33vw"
                          />
                        </div>
                      </div>
                    </FadeIn>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </Container>
      </Section>
      </BelowHeroShell>
    </>
  );
}
