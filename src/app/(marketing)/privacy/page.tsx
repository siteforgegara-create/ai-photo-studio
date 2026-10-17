import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/legal-page";
import { brand } from "@/config/brand";

export const metadata: Metadata = { title: "Privacy Policy", alternates: { canonical: "/privacy" } };

/** Privacy — structure from 03-pages §8; points only from docs/00-decisions.md (P1, P4, P7, P8, P9). */
export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      lead={`How ${brand.name} handles your selfies, headshots and account data.`}
      sections={[
        {
          id: "data-we-collect",
          title: "Data we collect",
          points: [
            "Account details: your name and email address, or your Google sign-in.",
            "The 4–8 selfies you upload for a shoot. Before upload they are resized in your browser and their EXIF data, including location, is removed.",
            "The headshots, previews and edits we generate for you, and your credit and order history.",
          ],
        },
        {
          id: "biometric-processing",
          title: "Face comparison (likeness check)",
          points: [
            "Each generated photo is compared with your selfies to check that it looks like you. Photos that don't pass are discarded.",
            "Face comparison is used only for this likeness check. Face templates are not stored.",
          ],
        },
        { id: "ai-providers", title: "AI providers", points: ["Which providers process your photos to generate headshots and edits, and under what terms. TODO(owner): list providers after the benchmark."] },
        {
          id: "retention",
          title: "How long we keep your photos",
          points: [
            "Selfies are deleted 24 hours after your shoot is finished, or after your free preview if you don't buy a shoot.",
            "Headshots and edits are kept for 30 days from when they're ready. We email a reminder 2 days before they're deleted.",
            "You can delete a shoot, or all your photos, at any time with one click.",
            "There is no public gallery. Your photos are never shown to others.",
          ],
        },
        {
          id: "free-tools",
          title: "Free tools run in your browser",
          points: ["The Background Remover and Photo Editor process files on your device. The photos you open in them are never uploaded."],
        },
        { id: "analytics", title: "Analytics", points: ["What usage data we measure and how to opt out. TODO(owner): after analytics is chosen (B6)."] },
        {
          id: "your-rights",
          title: "Your rights and deletion",
          points: ["You can delete your photos or your whole account from Account Settings.", "How to request a copy of your data or ask a question about it."],
        },
        { id: "contact", title: "Contact", points: ["TODO(owner): support / privacy contact address."] },
      ]}
    />
  );
}
