/**
 * Studio demo resolution — pure, imports ONLY the demo manifest and tool config.
 * It must never import EditsService / ShootsService (CLAUDE.md §3.4), so the
 * demo is structurally unable to make generation requests.
 */
import { demoManifest, getDemoPair, type DemoPair } from "@/config/demo-manifest";
import { editTools, type EditTool } from "@/config/edit-tools";
import type { EditToolId } from "@/services/types";

/** Image used by Crop & Export in demo mode. */
export const DEMO_EDITOR_IMAGE = demoManifest.auth.after;

export function demoPairFor(tool: EditToolId, optionId: string | undefined): DemoPair | null {
  if (!optionId) return null;
  return getDemoPair(tool, optionId);
}

/** Thumbnail for an option tile: the demo "after" frame if one exists. */
export function demoThumbFor(tool: EditToolId, optionId: string): string | null {
  return getDemoPair(tool, optionId)?.after ?? null;
}

/** Default option when a tool opens: the first one with a demo pair, else the first option. */
export function defaultOptionFor(tool: EditTool): string | undefined {
  const all = tool.categories.flatMap((c) => c.options);
  return all.find((o) => getDemoPair(tool.id, o.id))?.id ?? all[0]?.id;
}

export function toolById(id: EditToolId): EditTool {
  return editTools.find((t) => t.id === id)!;
}
