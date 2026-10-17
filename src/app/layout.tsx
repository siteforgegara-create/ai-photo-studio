import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { brand } from "@/config/brand";
import { Providers } from "@/components/providers";
import "./globals.css";

/** Inter (decision V1) — self-hosted variable font via next/font. */
const inter = localFont({
  src: [{ path: "../fonts/inter-latin-wght-normal.woff2", weight: "100 900", style: "normal" }],
  variable: "--font-inter",
  display: "swap",
  // The metric-matched Arial fallback comes from interExt, after both faces, so extended glyphs reach Inter first.
  adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD" }],
});

/**
 * Extended Latin (names like "Łukasz" or "Çelik") as a separate face with its
 * own unicode-range: not preloaded, downloaded only when such a glyph appears.
 */
const interExt = localFont({
  src: [{ path: "../fonts/inter-latin-ext-wght-normal.woff2", weight: "100 900", style: "normal" }],
  variable: "--font-inter-ext",
  display: "swap",
  preload: false,
  declarations: [{ prop: "unicode-range", value: "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF" }],
});

export const metadata: Metadata = {
  metadataBase: new URL(brand.url),
  title: { default: `${brand.name} — ${brand.tagline}`, template: `%s · ${brand.name}` },
  description: brand.description,
  applicationName: brand.name,
  openGraph: { type: "website", siteName: brand.name, locale: "en_US" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  // The on-screen keyboard shrinks the layout viewport (dvh), so Studio's bottom sheet and Custom fields stay visible.
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#18212b" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Dev panel: imported only when enabled, so production builds don't ship it (the condition is inlined at build time).
  const DevPanel =
    process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_ENABLE_DEV_TOOLS === "1"
      ? (await import("@/components/dev/dev-panel")).DevPanel
      : null;
  return (
    // next-themes sets the `dark` class before paint; suppressHydrationWarning covers that attribute only.
    <html lang="en" className={`${inter.variable} ${interExt.variable}`} suppressHydrationWarning>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="sr-only z-[70] rounded-[10px] bg-surface px-4 py-2 font-semibold text-text shadow-pop focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        <Providers>
          {children}
          {DevPanel && <DevPanel />}
        </Providers>
      </body>
    </html>
  );
}
