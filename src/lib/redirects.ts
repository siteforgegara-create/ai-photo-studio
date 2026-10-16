import type { Shoot } from "@/services/types";

/**
 * Where to go after sign-in (CLAUDE.md §6):
 * explicit safe `next` → latest shoot → /shoot/new.
 */
export function getPostLoginRedirect(shoots: Pick<Shoot, "id" | "createdAt" | "status">[], next?: string | null): string {
  const safeNext = sanitizeNext(next);
  if (safeNext) return safeNext;
  const latest = [...shoots]
    .filter((s) => s.status !== "draft" && s.status !== "refunded")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  return latest ? `/shoot/${latest.id}` : "/shoot/new";
}

/** Only same-origin absolute paths are allowed (prevents open redirects). */
export function sanitizeNext(next?: string | null): string | null {
  if (!next) return null;
  let value = next;
  try {
    value = decodeURIComponent(next);
  } catch {
    return null;
  }
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return null;
  if (/^\/(login|signup|forgot-password|reset-password)(\/|$|\?)/.test(value)) return null;
  return value;
}

export function loginHref(next: string): string {
  return `/login?next=${encodeURIComponent(next)}`;
}
