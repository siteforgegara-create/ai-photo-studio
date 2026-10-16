/**
 * Product name is a WORKING name (decision P12). Use it only through this file
 * and <Logo />; the final name and domain are chosen before launch.
 */
export const brand = {
  name: "AI Photo Studio",
  /** Short form for tight spaces (mobile header, tab titles). */
  shortName: "AI Photo Studio",
  tagline: "Headshots that actually look like you.",
  description:
    "Premium AI headshots that look like you. Upload a few selfies, see free previews, and get studio-quality 4K headshots — every photo checked for likeness.",
  // TODO(owner): final domain before launch (B6).
  url: "https://example.com",
  // TODO(owner): support / contact address for Legal pages and emails.
  supportEmail: null as string | null,
  copyrightYear: 2026,
} as const;

export type Brand = typeof brand;
