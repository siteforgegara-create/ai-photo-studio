"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getShootPack } from "@/config/packs";
import { PREVIEW_STYLE_COUNT, shootStyles } from "@/config/styles";
import type { SelfieReason } from "@/config/selfie-check";
import type { GlassesChoice, OutfitChoice, PackId, SelfieCheck } from "@/services/types";

export const WIZARD_STEPS = ["Selfies", "Your look", "Free preview", "Package", "Done"] as const;
export type WizardStep = 0 | 1 | 2 | 3 | 4;

export type WizardSelfie = {
  localId: string;
  name: string;
  status: "checking" | "done" | "error";
  check?: SelfieCheck;
  reasonCodes?: SelfieReason[];
  hash?: string;
  error?: string;
  /** Set once uploaded through ShootsService (after sign-in). */
  uploadedId?: string;
};

type WizardState = {
  step: WizardStep;
  selfies: WizardSelfie[];
  consent: boolean;
  outfit: OutfitChoice | null;
  glasses: GlassesChoice;
  previewStyles: string[];
  pack: PackId;
  styles: string[];
  shootId?: string;
  /** What to do right after the user comes back from sign-in. */
  intent?: "preview";
  /** The free preview was skipped (already used on this account). */
  previewSkipped: boolean;

  setStep: (step: WizardStep) => void;
  addSelfie: (s: WizardSelfie) => void;
  updateSelfie: (localId: string, patch: Partial<WizardSelfie>) => void;
  removeSelfie: (localId: string) => void;
  setConsent: (v: boolean) => void;
  setOutfit: (v: OutfitChoice) => void;
  setGlasses: (v: GlassesChoice) => void;
  togglePreviewStyle: (id: string) => void;
  setPack: (id: PackId) => void;
  toggleStyle: (id: string) => void;
  patch: (p: Partial<WizardState>) => void;
  reset: () => void;
};

const initial = {
  step: 0 as WizardStep,
  selfies: [] as WizardSelfie[],
  consent: false,
  outfit: null as OutfitChoice | null,
  glasses: "keep" as GlassesChoice,
  previewStyles: [] as string[],
  pack: "professional" as PackId,
  styles: [] as string[],
  shootId: undefined as string | undefined,
  intent: undefined as "preview" | undefined,
  previewSkipped: false,
};

/** Number of styles a pack lets you pick; `all` → every style, no picker. */
export function styleLimit(pack: PackId): number | "all" {
  return getShootPack(pack).styles;
}

/** Keeps the selection valid for the pack: trims extras, Executive = all styles. */
export function normalizeStyles(pack: PackId, styles: string[], seed: string[] = []): string[] {
  const limit = styleLimit(pack);
  if (limit === "all") return shootStyles.map((s) => s.id);
  const merged = [...new Set([...seed, ...styles])];
  return merged.slice(0, limit);
}

export function togglePick(list: string[], id: string, max: number): string[] {
  if (list.includes(id)) return list.filter((x) => x !== id);
  if (list.length >= max) return list;
  return [...list, id];
}

export const useWizard = create<WizardState>()(
  persist(
    (set, get) => ({
      ...initial,
      setStep: (step) => set({ step }),
      addSelfie: (s) => set({ selfies: [...get().selfies, s] }),
      updateSelfie: (localId, patch) => set({ selfies: get().selfies.map((s) => (s.localId === localId ? { ...s, ...patch } : s)) }),
      removeSelfie: (localId) => set({ selfies: get().selfies.filter((s) => s.localId !== localId) }),
      setConsent: (consent) => set({ consent }),
      setOutfit: (outfit) => set({ outfit }),
      setGlasses: (glasses) => set({ glasses }),
      togglePreviewStyle: (id) => set({ previewStyles: togglePick(get().previewStyles, id, PREVIEW_STYLE_COUNT) }),
      setPack: (pack) => {
        const wasAll = styleLimit(get().pack) === "all";
        set({ pack, styles: normalizeStyles(pack, wasAll ? [] : get().styles, get().previewStyles) });
      },
      toggleStyle: (id) => {
        const limit = styleLimit(get().pack);
        if (limit === "all") return;
        set({ styles: togglePick(get().styles, id, limit) });
      },
      patch: (p) => set(p),
      reset: () => set({ ...initial }),
    }),
    {
      name: "aps.wizard",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Files are NOT here — only metadata (IndexedDB holds the blobs).
      partialize: ({ step, selfies, consent, outfit, glasses, previewStyles, pack, styles, shootId, intent, previewSkipped }) => ({
        step,
        selfies,
        consent,
        outfit,
        glasses,
        previewStyles,
        pack,
        styles,
        shootId,
        intent,
        previewSkipped,
      }),
    },
  ),
);
