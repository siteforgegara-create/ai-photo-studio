import { ogContentType, ogSize, renderOg } from "@/lib/og";

export const alt = "Free Background Remover";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return renderOg({ overline: "FREE TOOL", title: "Free Background Remover", subtitle: "Runs in your browser · Nothing is uploaded · No sign-up" });
}
