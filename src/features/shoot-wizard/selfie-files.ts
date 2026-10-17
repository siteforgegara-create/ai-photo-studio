"use client";

/**
 * Selfie files live in IndexedDB (not localStorage) until they are uploaded,
 * so a guest can sign in mid-wizard without losing them (06-shoot-flow §1).
 * They are deleted right after a successful checkout or when the user removes them.
 */
import { createStore, del, get, set, clear, type UseStore } from "idb-keyval";

let store: UseStore | null = null;
function db() {
  if (!store) store = createStore("aps-wizard", "selfies");
  return store;
}

export const saveSelfieFile = (localId: string, blob: Blob) => set(localId, blob, db());
export const loadSelfieFile = (localId: string) => get<Blob>(localId, db());
export const deleteSelfieFile = (localId: string) => del(localId, db());
export const clearSelfieFiles = () => clear(db());
