"use client";

import { AppHeader } from "@/components/layout/app-header";
import { useStudio } from "@/features/studio/store";
import { useSession } from "@/stores/session";

/** App header with `← Back to shoot` — the shoot of the photo being edited (falls back to the latest shoot). */
export function StudioHeader() {
  const shoots = useSession((s) => s.shoots);
  const studioShootId = useStudio((s) => s.shootId);
  const id = studioShootId && shoots.some((s) => s.id === studioShootId) ? studioShootId : shoots[0]?.id;
  return <AppHeader backHref={id ? `/shoot/${id}` : null} />;
}
