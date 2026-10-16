import type { Metadata } from "next";
import { RequireAuth } from "@/components/layout/require-auth";
import { PageHeading, StageNote } from "@/components/layout/page-stub";

export const metadata: Metadata = { title: "Account Settings", robots: { index: false } };

/** `/settings` — signed-in only (03-pages §6). Built in Stage 4. */
export default function SettingsPage() {
  return (
    <RequireAuth>
      <div className="container-page py-12 md:py-16">
        <PageHeading overline="ACCOUNT / PREFERENCES" title="Account Settings" lead="Manage your profile, photo privacy and credit activity — all in one place." />
        <StageNote
          stage={4}
          className="mt-10"
          items={["My Account", "Privacy & Data (Selfies · Headshots & edits · Free tools) + Delete all my photos", "Credits & Activity with ledger", "Delete Account (type DELETE)"]}
        />
      </div>
    </RequireAuth>
  );
}
