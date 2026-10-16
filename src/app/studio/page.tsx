import type { Metadata } from "next";
import { PageHeading, StageNote } from "@/components/layout/page-stub";

export const metadata: Metadata = { title: "Studio" };

/** `/studio` — single-photo editor (02-studio.md). Built in Stage 3. */
export default function StudioPage() {
  return (
    <div className="px-4 py-8 md:px-6 md:py-10">
      <PageHeading overline="EDIT TOOLS" title="Studio" lead="Background, outfit, retouch, relight, creative styles, Place Me Here, crop & export." />
      <StageNote
        stage={3}
        className="mt-10"
        items={[
          "3-column layout 220 / flex / 300↔48, tablet + mobile",
          "Options / Shoot / Edits tabs, collapsible panel",
          "Before/After with zoom & pan, demo mode (0 requests)",
          "Generate · N credits + confirmation (M7), Crop & Export",
        ]}
      />
    </div>
  );
}
