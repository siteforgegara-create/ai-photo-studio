import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/legal-page";
import { brand } from "@/config/brand";

export const metadata: Metadata = { title: "Terms of Service", alternates: { canonical: "/terms" } };

/** Terms — structure from 03-pages §8; points only from docs/00-decisions.md (M1–M8, P2, P9). */
export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      lead={`The rules for using ${brand.name}.`}
      sections={[
        { id: "service", title: "The service", points: ["AI headshots generated from your selfies, a free watermarked preview, and a Studio to edit your photos.", "Free tools that run in your browser."] },
        {
          id: "shoots-credits-refunds",
          title: "Shoots, credits and refunds",
          points: [
            "A shoot is a one-time purchase. There are no subscriptions.",
            "Full refund until your first download. Downloading any photo in any format, or the ZIP, ends refund eligibility; we ask you to confirm before the first download.",
            "Edit credits are shared across your account and don't expire. Unused credit packs can be refunded within 14 days.",
            "Edits that fail or are blocked are refunded automatically.",
          ],
        },
        { id: "license", title: "License to your headshots", points: ["Your headshots come in 4K with a commercial license: you can use them on LinkedIn, your website, in print and in ads."] },
        {
          id: "acceptable-use",
          title: "Acceptable use",
          points: [
            "Only upload photos of yourself, or of an adult who has given you explicit permission.",
            "No photos of minors, no sexual content, and no use intended to deceive or impersonate someone.",
            "We may block requests that break these rules; blocked edits are refunded.",
          ],
        },
        { id: "disclaimers", title: "Disclaimers" },
        { id: "liability", title: "Limitation of liability" },
      ]}
    />
  );
}
