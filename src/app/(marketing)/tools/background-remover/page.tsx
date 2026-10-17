import type { Metadata } from "next";
import { Download, ImageUp, Palette } from "lucide-react";
import { PageHeading } from "@/components/layout/page-stub";
import { CtaCard } from "@/components/marketing/cta-card";
import { FaqList } from "@/components/marketing/faq";
import { HowToSteps } from "@/components/marketing/how-to";
import { JsonLd } from "@/components/marketing/json-ld";
import { Section, SectionHeading } from "@/components/marketing/section";
import { BackgroundRemoverClient } from "./client";
import { brand } from "@/config/brand";
import { BG_MODEL } from "@/features/bg-remover/model";

const title = "Free Background Remover";
const description = "Remove the background from portraits and photos of people — right in your browser. Nothing is uploaded, no sign-up.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/tools/background-remover" },
  openGraph: { title: `${title} · ${brand.name}`, description, url: "/tools/background-remover" },
};

const steps = [
  { icon: ImageUp, title: "Add a photo", text: "Drop a JPEG, PNG, WebP or HEIC photo. It opens on this device — nothing is sent anywhere." },
  { icon: Palette, title: "Pick a background", text: "Keep it transparent, switch to white or a brand color, or blur the original scene." },
  { icon: Download, title: "Download", text: "Save a PNG with transparency or a JPG. No watermark, no account." },
] as const;

const faq = [
  {
    q: "Is it really free?",
    a: "Yes. There is no sign-up, no watermark and no limit on how many photos you process. The tool runs on your own device, so it costs us nothing per photo.",
  },
  {
    q: "Is my photo uploaded?",
    a: "No. The photo is decoded, processed and saved entirely in your browser. The only thing your browser downloads is the AI model itself, once.",
  },
  {
    q: "What kind of photos work best?",
    a: "Portraits and photos of people: headshots, selfies, team photos. The model is trained for people, so objects without a person — products, pets, furniture — may not be cut out cleanly.",
  },
  {
    q: "Why is the first photo slower?",
    a: `The first time, your browser downloads the AI model (about ${BG_MODEL.approxMb} MB) and keeps it in its cache. After that, photos are processed straight away, even on later visits.`,
  },
  {
    q: "Can I get a professional headshot instead?",
    a: "Yes. Upload 4–8 selfies and we'll show you 4 free watermarked previews before you pay. Every photo in your shoot is checked for likeness.",
  },
] as const;

/** `/tools/background-remover` — free, no sign-in, runs in the browser (P7, 03-pages §4.1). */
export default function BackgroundRemoverPage() {
  return (
    <div className="container-page pt-10 md:pt-14">
      <PageHeading overline="FREE TOOL" title={title} lead="Remove the background from portraits and photos of people — right in your browser. Nothing is uploaded." />
      <div className="mt-8">
        <BackgroundRemoverClient />
      </div>

      <Section aria-labelledby="howto-title">
        <SectionHeading id="howto-title" title="How to remove a background" lead="Three steps, all on your device." />
        <HowToSteps steps={steps} className="mt-8" />
      </Section>

      <Section aria-labelledby="faq-title" className="pt-0 md:pt-0">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
          <SectionHeading className="self-start lg:sticky lg:top-[calc(var(--header-h)+24px)] md:items-start" id="faq-title" overline="FAQ" title="Questions about the background remover" />
          <FaqList items={faq} jsonLd />
        </div>
      </Section>

      <div className="pb-16 md:pb-20">
        <CtaCard title="Need a professional headshot instead?" lead="Upload a few selfies and get 4 free previews before you pay." label="Get 4 free previews" />
      </div>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: title,
          applicationCategory: "MultimediaApplication",
          operatingSystem: "Any (runs in the browser)",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          url: `${brand.url}/tools/background-remover`,
        }}
      />
    </div>
  );
}
