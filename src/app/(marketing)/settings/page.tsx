import type { Metadata } from "next";
import { RequireAuth } from "@/components/layout/require-auth";
import { SettingsView } from "@/features/settings/settings-view";

export const metadata: Metadata = { title: "Account Settings", robots: { index: false } };

/** `/settings` — signed-in only (03-pages §6). */
export default function SettingsPage() {
  return (
    <RequireAuth>
      <SettingsView />
    </RequireAuth>
  );
}
