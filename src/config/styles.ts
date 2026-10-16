import { getStyleDemoImage } from "./demo-manifest";

/** Shoot style catalogue — docs/06-shoot-flow.md §0 (12 styles). */
export type StyleCategory = "Corporate" | "Studio" | "Office" | "Outdoor" | "Casual" | "Creative";

export type ShootStyle = {
  id: string;
  name: string;
  category: StyleCategory;
  description: string;
  /** Demo frame from demo-manifest, if one exists. */
  previewImage?: string;
  /** Filled in by the backend (B3) — maps to the generation prompt. */
  promptKey: string | null;
};

const catalogue: Omit<ShootStyle, "previewImage">[] = [
  { id: "corporate-gray", name: "Corporate Gray", category: "Corporate", description: "Clean mid-gray backdrop for a classic corporate look.", promptKey: null },
  { id: "studio-white", name: "Studio White", category: "Studio", description: "Bright, even white backdrop with soft studio light.", promptKey: null },
  { id: "studio-charcoal", name: "Executive Charcoal", category: "Studio", description: "Deep charcoal backdrop with confident, focused light.", promptKey: null },
  { id: "modern-office", name: "Modern Office", category: "Office", description: "Softly blurred contemporary office behind you.", promptKey: null },
  { id: "glass-meeting-room", name: "Glass Meeting Room", category: "Office", description: "Bright meeting room with glass walls, gently out of focus.", promptKey: null },
  { id: "warm-library", name: "Warm Library", category: "Office", description: "Warm bookshelves for advisors, lawyers and academics.", promptKey: null },
  { id: "city-bokeh", name: "City Bokeh", category: "Outdoor", description: "Urban street with soft city lights in the background.", promptKey: null },
  { id: "outdoor-park", name: "Park Greenery", category: "Outdoor", description: "Natural greenery and daylight for an approachable feel.", promptKey: null },
  { id: "golden-hour", name: "Golden Hour", category: "Outdoor", description: "Warm late-afternoon light outdoors.", promptKey: null },
  { id: "minimal-beige", name: "Minimal Beige", category: "Studio", description: "Warm neutral backdrop, calm and modern.", promptKey: null },
  { id: "tech-startup", name: "Startup Casual", category: "Casual", description: "Relaxed, modern workspace look for founders and tech teams.", promptKey: null },
  { id: "creative-color", name: "Creative Color", category: "Creative", description: "Bold coloured backdrop for creative professionals.", promptKey: null },
];

export const shootStyles: readonly ShootStyle[] = catalogue.map((s) => {
  const previewImage = getStyleDemoImage(s.id);
  return previewImage ? { ...s, previewImage } : s;
});

export const styleCategories: readonly StyleCategory[] = [
  "Corporate",
  "Studio",
  "Office",
  "Outdoor",
  "Casual",
  "Creative",
];

export function getStyle(id: string): ShootStyle | undefined {
  return shootStyles.find((s) => s.id === id);
}

/** Number of styles the free preview uses (M5: 4 frames, 2 per style). */
export const PREVIEW_STYLE_COUNT = 2;
