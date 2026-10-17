import { ogContentType, ogSize, renderOg } from "@/lib/og";

export const alt = "Free Photo Editor";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return renderOg({ overline: "FREE TOOL", title: "Free Photo Editor", subtitle: "Crop, rotate, resize and adjust · Nothing is uploaded" });
}
