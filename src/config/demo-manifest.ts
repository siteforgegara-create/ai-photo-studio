/**
 * Demo content — docs/02-studio.md §5.
 *
 * All demo images are labelled `Example` in the UI. Code that renders demo
 * content must NOT import EditsService or ShootsService (CLAUDE.md §3.4): the
 * demo is structurally unable to make generation requests.
 *
 * The 5 files in public/demo/headshot/ are one synthetic model, aligned by
 * face (1080×1350, 4:5). The final demo set will replace them with the same
 * file names and new manifest rows.
 */
import type { EditToolId } from "@/services/types";

export type DemoPair = {
  before: string;
  after: string;
  alt: string;
  /** Faces are aligned, so the Before/After slider does not "jump". */
  aligned: boolean;
};

export const DEMO_IMAGE_SIZE = { width: 1080, height: 1350 } as const;

export const demoManifest = {
  /** Homepage + style previews: styleId → frame. */
  shoot: {
    "corporate-gray": "/demo/headshot/studio.webp",
    "minimal-beige": "/demo/headshot/professional.webp",
    "modern-office": "/demo/headshot/office.webp",
    "city-bokeh": "/demo/headshot/city.webp",
  } as Partial<Record<string, string>>,
  selfie: "/demo/headshot/before.webp",
  /** Studio demo: tool → option → pair. Missing pair → `Example not available yet`. */
  edits: {
    background: {
      "modern-office": {
        before: "/demo/headshot/professional.webp",
        after: "/demo/headshot/office.webp",
        alt: "Example: the same headshot with a modern office background",
        aligned: true,
      },
      "city-bokeh": {
        before: "/demo/headshot/professional.webp",
        after: "/demo/headshot/city.webp",
        alt: "Example: the same headshot with a blurred city background",
        aligned: true,
      },
    },
  } as Partial<Record<EditToolId, Partial<Record<string, DemoPair>>>>,
  /** Hero / auth art panel. */
  hero: {
    before: "/demo/headshot/before.webp",
    after: "/demo/headshot/studio.webp",
    alt: "Example: a casual selfie turned into a studio headshot",
    aligned: true,
  } satisfies DemoPair,
  auth: {
    before: "/demo/headshot/before.webp",
    after: "/demo/headshot/professional.webp",
    alt: "Example: a casual selfie turned into a professional headshot",
    aligned: true,
  } satisfies DemoPair,
} as const;

export function getDemoPair(tool: EditToolId, optionId: string): DemoPair | null {
  return demoManifest.edits[tool]?.[optionId] ?? null;
}

export function getStyleDemoImage(styleId: string): string | null {
  return demoManifest.shoot[styleId] ?? null;
}

/** Every demo asset, for preloading neighbours (01-design-system §5). */
export function allDemoAssets(): string[] {
  const set = new Set<string>([demoManifest.selfie]);
  Object.values(demoManifest.shoot).forEach((s) => s && set.add(s));
  Object.values(demoManifest.edits).forEach((byOption) =>
    Object.values(byOption ?? {}).forEach((pair) => {
      if (pair) {
        set.add(pair.before);
        set.add(pair.after);
      }
    }),
  );
  return [...set];
}
