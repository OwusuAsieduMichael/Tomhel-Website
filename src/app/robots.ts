import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/constants";

export default function robots(): MetadataRoute.Robots {
  return {
    // /prep is the signed-in BECE Prep app; keep it out of search results.
    rules: { userAgent: "*", allow: "/", disallow: "/prep" },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
