import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { brand } from "@/config/brand";

/**
 * Shared Open Graph card (1200×630): brand mark, overline, title, subtitle.
 * Inter static weights (OFL) from src/fonts/og — satori can't read the
 * variable woff2 the site uses.
 */
export const ogSize = { width: 1200, height: 630 };
export const ogContentType = "image/png";

const fonts = Promise.all([
  readFile(join(process.cwd(), "src/fonts/og/inter-latin-600-normal.woff")),
  readFile(join(process.cwd(), "src/fonts/og/inter-latin-800-normal.woff")),
]);

export async function renderOg({ overline, title, subtitle }: { overline: string; title: string; subtitle: string }) {
  const [w600, w800] = await fonts;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#F3F5F8",
          fontFamily: "Inter",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -160,
            right: -160,
            width: 520,
            height: 520,
            borderRadius: 520,
            background: "linear-gradient(135deg, #F94471, #FE824C)",
            opacity: 0.16,
            display: "flex",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: "linear-gradient(110deg, #F94471, #FE824C)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="40" height="40" viewBox="0 0 24 24">
              <path fill="#fff" d="M11 3.2c.7 4.9 3.2 7.5 8 8.3-4.8.8-7.3 3.4-8 8.3-.7-4.9-3.2-7.5-8-8.3 4.8-.8 7.3-3.4 8-8.3Z" />
            </svg>
          </div>
          <div style={{ fontSize: 34, fontWeight: 800, color: "#1E2431" }}>{brand.name}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 980 }}>
          <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: 3, color: "#C8372F" }}>{overline}</div>
          <div style={{ fontSize: 72, lineHeight: 1.05, fontWeight: 800, letterSpacing: -2, color: "#1E2431" }}>{title}</div>
          <div style={{ fontSize: 30, lineHeight: 1.35, fontWeight: 600, color: "#6B7588" }}>{subtitle}</div>
        </div>
        <div style={{ height: 10, width: 220, borderRadius: 10, background: "linear-gradient(100deg, #F94471, #FE824C)", display: "flex" }} />
      </div>
    ),
    {
      ...ogSize,
      fonts: [
        { name: "Inter", data: w600, weight: 600, style: "normal" },
        { name: "Inter", data: w800, weight: 800, style: "normal" },
      ],
    },
  );
}
