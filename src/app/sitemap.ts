import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/constants";

const routes = [
  "",
  "/about",
  "/academics",
  "/admissions",
  "/student-life",
  "/gallery",
  "/news",
  "/contact",
  "/portal",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({
    url: `${siteConfig.url}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" || route === "/news" ? "weekly" : "monthly",
    priority: route === "" ? 1 : route === "/admissions" ? 0.9 : 0.7,
  }));
}
