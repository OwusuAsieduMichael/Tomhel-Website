import type { Metadata } from "next";
import { GalleryContent } from "./gallery-content";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Gallery",
  description: "Browse photos of Tomhel Preparatory School: campus, academics, events, sports, and graduation.",
  path: "/gallery",
});

export default function GalleryPage() {
  return <GalleryContent />;
}
