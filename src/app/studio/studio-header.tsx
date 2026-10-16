"use client";

import { AppHeader } from "@/components/layout/app-header";
import { useSession } from "@/stores/session";

/** App header with `← Back to shoot` pointing at the user's latest shoot (Stage 3: the shoot of the open photo). */
export function StudioHeader() {
  const shoots = useSession((s) => s.shoots);
  const latest = shoots[0];
  return <AppHeader backHref={latest ? `/shoot/${latest.id}` : null} />;
}
