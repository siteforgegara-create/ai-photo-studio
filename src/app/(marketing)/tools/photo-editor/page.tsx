import type { Metadata } from "next";
import { Crop, Download, ImageUp } from "lucide-react";
import { PageHeading } from "@/components/layout/page-stub";
import { CtaCard } from "@/components/marketing/cta-card";
import { FaqList } from "@/components/marketing/faq";
import { HowToSteps } from "@/components/marketing/how-to";
import { JsonLd } from "@/components/marketing/json-ld";
import { Section, SectionHeading } from "@/components/marketing/section";
import { brand } from "@/config/brand";
import { PhotoEditorClient } from "./client";

const title = "Free Photo Editor";
const description = "Crop, rotate, resize and adjust your photos online — free and private. Social sizes for LinkedIn, Instagram and X. Nothing is uploaded.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/tools/photo-editor" },
  openGraph: { title: `${title} · ${brand.name}`, description, url: "/tools/photo-editor" },
};

const steps = [
  { icon: ImageUp, title: "Open a photo", text: "JPEG, PNG, WebP or HEIC. The file stays on your device." },
  { icon: Crop, title: "Crop and adjust", text: "Pick a size preset, drag the frame, straighten, flip and fine-tune brightness, contrast, saturation and warmth." },
  { icon: Download, title: "Download", text: "Save as JPEG or PNG at the exact preset size. Location and camera data are removed." },
] as const;

const faq = [
  {
    q: "Is the photo editor free?",
    a: "Yes — no sign-up, no watermark and no limits. Everything runs in your browser.",
  },
  {
    q: "Are my photos uploaded?",
    a: "No. The photo is opened, edited and saved on your device. Nothing is sent to our servers.",
  },
  {
    q: "Which sizes are included?",
    a: "Free crop, 1:1, 4:5 and 16:9, plus fixed sizes: LinkedIn and X profile photo (400×400), LinkedIn banner (1584×396), Instagram portrait (1080×1350), a 600×600 square for passport-style photos and a round avatar. Platforms change their recommendations from time to time, so check the current guidance if a size matters.",
  },
  {
    q: "Will a 600×600 crop be accepted for my passport or visa?",
    a: "We can't promise that. Official photo rules differ by country and include lighting, background and expression requirements, so always check the official guidelines.",
  },
  {
    q: "Does the editor remove EXIF data?",
    a: "Yes. The exported file is re-encoded from the edited pixels, so camera details and GPS location are not included.",
  },
] as const;

/** `/tools/photo-editor` — the shared editor module (src/features/editor) on a local file. */
export default function PhotoEditorPage() {
  return (
    <div className="container-page pt-10 md:pt-14">
      <PageHeading overline="FREE TOOL" title={title} lead="Crop, rotate, resize and adjust your photos online — free and private." />
      <div className="mt-8">
        <PhotoEditorClient />
      </div>

      <Section aria-labelledby="howto-title">
        <SectionHeading id="howto-title" title="How to edit a photo" lead="Three steps, all on your device." />
        <HowToSteps steps={steps} className="mt-8" />
      </Section>

      <Section aria-labelledby="faq-title" className="pt-0 md:pt-0">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
          <SectionHeading className="self-start lg:sticky lg:top-[calc(var(--header-h)+24px)] md:items-start" id="faq-title" overline="FAQ" title="Questions about the photo editor" />
          <FaqList items={faq} jsonLd />
        </div>
      </Section>

      <div className="pb-16 md:pb-20">
        <CtaCard title="Want a studio-quality headshot?" lead="Upload a few selfies and get 4 free previews before you pay." label="Get free previews" />
      </div>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: title,
          applicationCategory: "MultimediaApplication",
          operatingSystem: "Any (runs in the browser)",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          url: `${brand.url}/tools/photo-editor`,
        }}
      />
    </div>
  );
}
