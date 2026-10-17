import type { MetadataRoute } from "next";
import { brand } from "@/config/brand";

/** Indexable: marketing, SEO pages and free tools. Private app areas and auth are excluded. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/shoot/", "/settings", "/dev/", "/login", "/signup", "/forgot-password", "/reset-password"] }],
    sitemap: `${brand.url}/sitemap.xml`,
  };
}
