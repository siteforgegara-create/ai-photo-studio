"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { defaultVariants } from "@/config/packs";
import { editTools } from "@/config/edit-tools";
import type { EditToolId, Variants } from "@/services/types";

/** Studio state — docs/02-studio.md §2. One store for desktop, tablet and mobile. */
export type Mode = "demo" | "real";
export type EditJobState = "idle" | "awaiting-confirmation" | "generating" | "completed" | "failed" | "insufficient-credits";
export type StudioTab = "options" | "shoot" | "edits";

export type CustomInput = { text?: string; sceneUploadId?: string; sceneUrl?: string; placement?: string; color?: string };

export type StudioState = {
  /** User preference: show the demo even though they have their own photos (persisted). */
  showDemo: boolean;
  tool: EditToolId;
  category: string;
  optionByTool: Partial<Record<EditToolId, string>>;
  customByTool: Partial<Record<EditToolId, CustomInput>>;
  /** Retouch switches. */
  toggles: Record<string, boolean>;
  variants: Variants;
  tab: StudioTab;
  panel: "open" | "closed";
  panelClosedByUser: boolean;
  /** New results arrived while the panel was closed by the user. */
  panelDot: boolean;
  shootId?: string;
  photoId?: string;
  /** Last photo opened in Studio — default when /studio has no ?photo= (persisted). */
  lastPhotoId?: string;
  selectedEditId?: string;
  job: { state: EditJobState; id?: string; error?: string; needed?: number; have?: number };
  view: { compare: boolean; zoom: number; split: number; panX: number; panY: number };
  skipConfirm: boolean;

  setTool: (tool: EditToolId) => void;
  setCategory: (c: string) => void;
  setOption: (optionId: string) => void;
  setCustom: (patch: CustomInput) => void;
  setToggle: (id: string, on: boolean) => void;
  setVariants: (v: Variants) => void;
  setTab: (t: StudioTab) => void;
  togglePanel: () => void;
  openPanel: () => void;
  setView: (patch: Partial<StudioState["view"]>) => void;
  resetView: () => void;
  patch: (p: Partial<StudioState>) => void;
};

const initialView = { compare: true, zoom: 1, split: 50, panX: 0, panY: 0 };

export const CUSTOM_OPTION = "custom";

export const useStudio = create<StudioState>()(
  persist(
    (set, get) => ({
      showDemo: false,
      tool: "background",
      category: "all",
      optionByTool: { background: "modern-office" },
      customByTool: {},
      toggles: {},
      variants: defaultVariants,
      tab: "options",
      panel: "open",
      panelClosedByUser: false,
      panelDot: false,
      job: { state: "idle" },
      view: initialView,
      skipConfirm: false,

      // Switching tools or options never costs anything (CLAUDE.md §3.3).
      setTool: (tool) => set({ tool, category: "all", job: { state: "idle" } }),
      setCategory: (category) => set({ category }),
      setOption: (optionId) => set({ optionByTool: { ...get().optionByTool, [get().tool]: optionId } }),
      setCustom: (patch) => {
        const tool = get().tool;
        set({ customByTool: { ...get().customByTool, [tool]: { ...get().customByTool[tool], ...patch } } });
      },
      setToggle: (id, on) => set({ toggles: { ...get().toggles, [id]: on } }),
      setVariants: (variants) => set({ variants }),
      setTab: (tab) => set({ tab }),
      togglePanel: () => {
        const closing = get().panel === "open";
        set({ panel: closing ? "closed" : "open", panelClosedByUser: closing, panelDot: closing ? get().panelDot : false });
      },
      openPanel: () => set({ panel: "open", panelClosedByUser: false, panelDot: false }),
      setView: (patch) => set({ view: { ...get().view, ...patch } }),
      resetView: () => set({ view: { ...initialView, compare: get().view.compare } }),
      patch: (p) => set(p),
    }),
    {
      name: "aps.studio",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // §2: persist only the demo flag, variants, the panel and the confirm preference (+ last photo).
      partialize: ({ showDemo, variants, panel, panelClosedByUser, skipConfirm, lastPhotoId }) => ({
        showDemo,
        variants,
        panel,
        panelClosedByUser,
        skipConfirm,
        lastPhotoId,
      }),
    },
  ),
);

export function currentTool(id: EditToolId) {
  return editTools.find((t) => t.id === id)!;
}
