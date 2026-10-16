import type { Metadata } from "next";
import { Suspense } from "react";
import { ShootPageStub } from "./shoot-page-stub";

export const metadata: Metadata = { title: "My shoot", robots: { index: false } };

/** `/shoot/[id]` — owner-only shoot page (06-shoot-flow §2). Built in Stage 2. */
export default function ShootPage({ params }: PageProps<"/shoot/[id]">) {
  return (
    <Suspense fallback={<div className="container-page py-12"><div className="h-10 w-72 rounded skeleton" /></div>}>
      <ShootPageContent params={params} />
    </Suspense>
  );
}

async function ShootPageContent({ params }: { params: PageProps<"/shoot/[id]">["params"] }) {
  const { id } = await params;
  return <ShootPageStub id={id} />;
}
