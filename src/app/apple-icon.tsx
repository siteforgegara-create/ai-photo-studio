import { ImageResponse } from "next/og";

/** Apple touch icon (180×180) — the same mark as icon.svg, on an opaque square (iOS adds its own mask). */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(110deg, #F94471, #FE824C)" }}>
        <svg width="112" height="112" viewBox="0 0 22.6 23" fill="#fff">
          <path d="M11 3.2c.7 4.9 3.2 7.5 8 8.3-4.8.8-7.3 3.4-8 8.3-.7-4.9-3.2-7.5-8-8.3 4.8-.8 7.3-3.4 8-8.3Z" />
          <path d="M19 2.6c.25 1.6 1 2.4 2.5 2.65-1.5.25-2.25 1.05-2.5 2.65-.25-1.6-1-2.4-2.5-2.65 1.5-.25 2.25-1.05 2.5-2.65Z" />
        </svg>
      </div>
    ),
    size,
  );
}
