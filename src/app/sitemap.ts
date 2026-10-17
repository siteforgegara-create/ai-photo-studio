import type { MetadataRoute } from "next";
import { brand } from "@/config/brand";
import { useCases } from "@/config/use-cases";

/** Public, indexable pages only (no /studio, /shoot, /settings, auth). */
export default function sitemap(): MetadataRoute.Sitemap {
  const pages: { path: string; priority: number }[] = [
    { path: "/", priority: 1 },
    { path: "/pricing", priority: 0.9 },
    ...useCases.map((u) => ({ path: `/headshots/${u.slug}`, priority: 0.8 })),
    { path: "/tools/background-remover", priority: 0.7 },
    { path: "/tools/photo-editor", priority: 0.7 },
    { path: "/teams", priority: 0.5 },
    { path: "/privacy", priority: 0.3 },
    { path: "/terms", priority: 0.3 },
    { path: "/licenses", priority: 0.2 },
  ];
  return pages.map((p) => ({ url: `${brand.url}${p.path}`, changeFrequency: "monthly", priority: p.priority }));
}
