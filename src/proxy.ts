import { NextResponse, type NextRequest } from "next/server";
import { useCases } from "@/config/use-cases";

/**
 * Strict 404 for unknown SEO pages: `/headshots/<slug>` renders with Partial
 * Prerendering, so a `notFound()` inside the page would arrive after the 200
 * status was sent. The slug list is static config, so we check it here, before
 * rendering, and rewrite to a path with no route → Next's 404 with status 404.
 */
const slugs = new Set(useCases.map((u) => u.slug));

export function proxy(request: NextRequest) {
  const slug = request.nextUrl.pathname.split("/")[2] ?? "";
  if (slugs.has(slug)) return NextResponse.next();
  return NextResponse.rewrite(new URL("/__not-found", request.url));
}

export const config = {
  matcher: "/headshots/:slug*",
};
