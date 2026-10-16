import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/legal-page";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      sections={[
        { id: "data-we-collect", title: "Data we collect" },
        { id: "biometric-processing", title: "Face comparison (likeness check)" },
        { id: "ai-providers", title: "AI providers" },
        { id: "retention", title: "How long we keep your photos" },
        { id: "free-tools", title: "Free tools run in your browser" },
        { id: "analytics", title: "Analytics" },
        { id: "your-rights", title: "Your rights and deletion" },
        { id: "contact", title: "Contact" },
      ]}
    />
  );
}
