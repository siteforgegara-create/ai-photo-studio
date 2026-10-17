"use client";

import * as React from "react";
import { create } from "zustand";
import { loadSelfieFile } from "./selfie-files";

/** Object URLs for selfie previews (memory only — never persisted). */
const useUrls = create<{ urls: Record<string, string>; set: (id: string, url: string) => void; drop: (id: string) => void }>()((set, get) => ({
  urls: {},
  set: (id, url) => set({ urls: { ...get().urls, [id]: url } }),
  drop: (id) => {
    const url = get().urls[id];
    if (url) URL.revokeObjectURL(url);
    const next = { ...get().urls };
    delete next[id];
    set({ urls: next });
  },
}));

export function registerSelfieUrl(localId: string, blob: Blob) {
  useUrls.getState().set(localId, URL.createObjectURL(blob));
}

export function dropSelfieUrl(localId: string) {
  useUrls.getState().drop(localId);
}

/** Returns the preview URL; after a reload it is rebuilt from IndexedDB. */
export function useSelfieUrl(localId: string): string | undefined {
  const url = useUrls((s) => s.urls[localId]);
  React.useEffect(() => {
    if (url) return;
    let alive = true;
    void loadSelfieFile(localId).then((blob) => {
      if (alive && blob && !useUrls.getState().urls[localId]) registerSelfieUrl(localId, blob);
    });
    return () => {
      alive = false;
    };
  }, [localId, url]);
  return url;
}
