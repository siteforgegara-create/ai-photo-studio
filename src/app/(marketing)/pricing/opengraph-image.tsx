import { ogContentType, ogSize, renderOg } from "@/lib/og";

export const alt = "Studio headshots. Pay once.";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return renderOg({ overline: "PRICING", title: "Studio headshots. Pay once.", subtitle: "See free previews first · No subscriptions · 4K on every plan" });
}
