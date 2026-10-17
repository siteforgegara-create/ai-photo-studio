import type { Metadata } from "next";
import { Suspense } from "react";
import { StudioShell } from "@/features/studio/studio-shell";

export const metadata: Metadata = { title: "Studio" };

/** `/studio` — single-photo editor (02-studio.md). `?photo=<id>` opens a shoot photo; guests see the demo. */
export default function StudioPage() {
  return (
    <Suspense fallback={<div className="h-[calc(100dvh-var(--header-h))] p-4"><div className="h-full rounded-[16px] skeleton" /></div>}>
      <StudioShell />
    </Suspense>
  );
}
