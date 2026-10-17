import { brand } from "@/config/brand";
import { ogContentType, ogSize, renderOg } from "@/lib/og";

export const alt = `${brand.name} — professional headshots that actually look like you`;
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return renderOg({
    overline: "AI HEADSHOTS · STUDIO QUALITY",
    title: "Professional headshots that actually look like you",
    subtitle: "Free previews before you pay · Every photo checked for likeness · 4K on every plan",
  });
}
