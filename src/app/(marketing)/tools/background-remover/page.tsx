import type { Metadata } from "next";
import { PageHeading, StageNote } from "@/components/layout/page-stub";

export const metadata: Metadata = {
  title: "Free Background Remover",
  description: "Remove the background from any photo — right in your browser. Nothing is uploaded.",
};

/** `/tools/background-remover` — free, no sign-in, runs in the browser (P7). Built in Stage 4. */
export default function BackgroundRemoverPage() {
  return (
    <div className="container-page py-12 md:py-16">
      <PageHeading overline="FREE TOOL" title="Free Background Remover" lead="Remove the background from any photo — right in your browser. Nothing is uploaded." />
      <StageNote
        stage={4}
        className="mt-10"
        items={[
          "In-browser segmentation (WebGPU → WASM), commercial-licence model",
          "One-time model download with progress, Cache Storage",
          "Transparent / White / Color / Blur backgrounds, Before/After",
          "Download PNG / JPG, how-to + FAQ, headshot CTA",
        ]}
      />
    </div>
  );
}
