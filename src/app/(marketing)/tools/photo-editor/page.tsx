import type { Metadata } from "next";
import { PageHeading, StageNote } from "@/components/layout/page-stub";

export const metadata: Metadata = {
  title: "Free Photo Editor",
  description: "Crop, rotate, resize and adjust your photos online — free and private.",
};

/** `/tools/photo-editor` — shares src/features/editor/ with Studio Crop & Export (Stage 3/4). */
export default function PhotoEditorPage() {
  return (
    <div className="container-page py-12 md:py-16">
      <PageHeading overline="FREE TOOL" title="Free Photo Editor" lead="Crop, rotate, resize and adjust your photos online — free and private." />
      <StageNote
        stage={4}
        className="mt-10"
        items={["Shared editor module with Studio Crop & Export", "Social presets (LinkedIn, Instagram, X/Twitter, Passport-like)", "Brightness / Contrast / Saturation / Warmth, Undo/Redo", "How-to + FAQ, headshot CTA"]}
      />
    </div>
  );
}
