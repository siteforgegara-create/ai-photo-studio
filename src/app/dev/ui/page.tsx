import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { devToolsEnabled } from "@/lib/env";
import { UiGallery } from "./ui-gallery";

export const metadata: Metadata = { title: "UI kit (dev)", robots: { index: false, follow: false } };

/** `/dev/ui` — every base component in every variant, Light and Dark side by side. Development only. */
export default function DevUiPage() {
  if (!devToolsEnabled) notFound();
  return <UiGallery />;
}
