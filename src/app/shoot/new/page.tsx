import type { Metadata } from "next";
import { Suspense } from "react";
import { ShootWizard } from "@/features/shoot-wizard/wizard";

export const metadata: Metadata = { title: "New shoot", robots: { index: false } };

/** `/shoot/new` — wizard (06-shoot-flow §1). */
export default function NewShootPage() {
  return (
    <div className="container-page py-8 md:py-10">
      <Suspense fallback={<div className="h-64 w-full rounded-[16px] skeleton" aria-busy="true" />}>
        <ShootWizard />
      </Suspense>
    </div>
  );
}
