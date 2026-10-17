import { ogContentType, ogSize, renderOg } from "@/lib/og";

export const alt = "Consistent headshots for your whole team";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return renderOg({ overline: "COMING SOON", title: "Consistent headshots for your whole team", subtitle: "Join the Teams waitlist" });
}
