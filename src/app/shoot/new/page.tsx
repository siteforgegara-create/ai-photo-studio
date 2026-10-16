import type { Metadata } from "next";
import { Stepper } from "@/components/ui/stepper";
import { PageHeading, StageNote } from "@/components/layout/page-stub";

export const metadata: Metadata = { title: "New shoot", robots: { index: false } };

const WIZARD_STEPS = ["Selfies", "Your look", "Free preview", "Package", "Done"];

/** `/shoot/new` — wizard (06-shoot-flow §1). Built in Stage 2. */
export default function NewShootPage() {
  return (
    <div className="container-page py-8 md:py-12">
      <Stepper steps={WIZARD_STEPS} current={0} />
      <PageHeading className="mt-8" title="Upload 4–8 selfies" lead="Different angles and lighting help us capture the real you." />
      <StageNote
        stage={2}
        className="mt-10"
        items={[
          "Dropzone + Good / Avoid tips, in-browser selfie checks",
          "Consent checkbox, IndexedDB draft, sign-in mid-wizard",
          "Your look → Free preview (watermarked) → Package & styles",
          "Mock checkout → generation counter → Open my shoot",
        ]}
      />
    </div>
  );
}
