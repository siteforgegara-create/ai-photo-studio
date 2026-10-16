import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/legal-page";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      sections={[
        { id: "service", title: "The service" },
        { id: "shoots-credits-refunds", title: "Shoots, credits and refunds" },
        { id: "license", title: "License to your headshots" },
        { id: "acceptable-use", title: "Acceptable use" },
        { id: "disclaimers", title: "Disclaimers" },
        { id: "liability", title: "Limitation of liability" },
      ]}
    />
  );
}
