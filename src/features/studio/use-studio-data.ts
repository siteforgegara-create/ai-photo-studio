"use client";

import * as React from "react";
import { shootsService, type Shoot, type ShootPhoto } from "@/services";
import { useSession } from "@/stores/session";
import { useStudio } from "./store";

export type StudioData =
  | { status: "loading" }
  | { status: "demo"; reason: "guest" | "no-shoots" | "user-choice"; hasOwn: boolean }
  | { status: "real"; shoot: Shoot; photo: ShootPhoto; photos: ShootPhoto[]; shoots: Shoot[] };

/**
 * Resolves what Studio shows (02-studio §2):
 * guest / no shoots → demo; `?photo=id` → that photo; no param → last edited
 * photo, else the first photo of the latest ready shoot. `Show Demo Image`
 * switches a user with photos to the demo without losing their place.
 */
export function useStudioData(photoParam: string | null): StudioData & { reload: () => void } {
  const status = useSession((s) => s.status);
  const shoots = useSession((s) => s.shoots);
  const showDemo = useStudio((s) => s.showDemo);
  const lastPhotoId = useStudio((s) => s.lastPhotoId);
  const [resolved, setResolved] = React.useState<{ shoot: Shoot; photo: ShootPhoto; photos: ShootPhoto[] } | null | undefined>(undefined);
  const [tick, setTick] = React.useState(0);

  const ready = shoots.filter((s) => s.status === "ready" || s.status === "generating");
  const hasOwn = status === "authenticated" && ready.length > 0;

  React.useEffect(() => {
    if (status !== "authenticated" || ready.length === 0) return;
    let alive = true;
    void (async () => {
      const wanted = photoParam ?? lastPhotoId ?? null;
      let photo = wanted ? await shootsService.getPhoto(wanted) : null;
      let shoot = photo ? ready.find((s) => s.id === photo!.shootId) : undefined;
      if (!photo || !shoot) {
        shoot = ready[0]!;
        const list = await shootsService.listPhotos(shoot.id);
        photo = list.find((p) => p.kind === "generated") ?? null;
      }
      if (!photo || !shoot) {
        if (alive) setResolved(null);
        return;
      }
      const photos = await shootsService.listPhotos(shoot.id);
      if (!alive) return;
      setResolved({ shoot, photo, photos });
      useStudio.getState().patch({ shootId: shoot.id, photoId: photo.id, lastPhotoId: photo.id });
    })();
    return () => {
      alive = false;
    };
    // `ready` is derived from `shoots`; ids are enough to refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, photoParam, ready.map((s) => s.id).join(), tick]);

  const reload = React.useCallback(() => setTick((t) => t + 1), []);

  if (status === "loading") return { status: "loading", reload };
  if (status === "guest") return { status: "demo", reason: "guest", hasOwn: false, reload };
  if (!hasOwn) return { status: "demo", reason: "no-shoots", hasOwn: false, reload };
  if (showDemo) return { status: "demo", reason: "user-choice", hasOwn: true, reload };
  if (resolved === undefined) return { status: "loading", reload };
  if (resolved === null) return { status: "demo", reason: "no-shoots", hasOwn: false, reload };
  return { status: "real", ...resolved, shoots: ready, reload };
}

/** Selecting another photo (Shoot tab) — keeps the URL in sync without a navigation. */
export function selectPhoto(photoId: string) {
  const url = new URL(window.location.href);
  url.searchParams.set("photo", photoId);
  window.history.replaceState(null, "", url.toString());
}
