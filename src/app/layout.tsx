import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { brand } from "@/config/brand";
import { Providers } from "@/components/providers";
import { DevPanel } from "@/components/dev/dev-panel";
import { devToolsEnabled } from "@/lib/env";
import "./globals.css";

/** Inter (decision V1) — self-hosted variable font via next/font. */
const inter = localFont({
  src: [
    { path: "../fonts/inter-latin-wght-normal.woff2", weight: "100 900", style: "normal" },
    { path: "../fonts/inter-latin-ext-wght-normal.woff2", weight: "100 900", style: "normal" },
  ],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(brand.url),
  title: { default: `${brand.name} — ${brand.tagline}`, template: `%s · ${brand.name}` },
  description: brand.description,
};

export const viewport: Viewport = {
  // The on-screen keyboard shrinks the layout viewport (dvh), so Studio's bottom sheet and Custom fields stay visible.
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#18212b" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // next-themes sets the `dark` class before paint; suppressHydrationWarning covers that attribute only.
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="sr-only z-[70] rounded-[10px] bg-surface px-4 py-2 font-semibold text-text shadow-pop focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        <Providers>
          {children}
          {devToolsEnabled && <DevPanel />}
        </Providers>
      </body>
    </html>
  );
}
