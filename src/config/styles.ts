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
  /** Placeholder tile until a demo frame exists: backdrop colour/gradient in the style's mood. */
  mood: { background: string; ink: "light" | "dark" };
};

const catalogue: Omit<ShootStyle, "previewImage">[] = [
  { id: "corporate-gray", name: "Corporate Gray", category: "Corporate", description: "Clean mid-gray backdrop for a classic corporate look.", promptKey: null, mood: { background: "radial-gradient(120% 90% at 50% 25%, #c9cdd3 0%, #9aa0a8 55%, #6f757e 100%)", ink: "light" } },
  { id: "studio-white", name: "Studio White", category: "Studio", description: "Bright, even white backdrop with soft studio light.", promptKey: null, mood: { background: "radial-gradient(120% 90% at 50% 25%, #ffffff 0%, #f1f2f4 55%, #d9dce1 100%)", ink: "dark" } },
  { id: "studio-charcoal", name: "Executive Charcoal", category: "Studio", description: "Deep charcoal backdrop with confident, focused light.", promptKey: null, mood: { background: "radial-gradient(120% 90% at 50% 25%, #5a6069 0%, #363a41 55%, #1f2226 100%)", ink: "light" } },
  { id: "modern-office", name: "Modern Office", category: "Office", description: "Softly blurred contemporary office behind you.", promptKey: null, mood: { background: "linear-gradient(160deg, #eef1f4 0%, #c9d1da 45%, #8e9aa8 100%)", ink: "dark" } },
  { id: "glass-meeting-room", name: "Glass Meeting Room", category: "Office", description: "Bright meeting room with glass walls, gently out of focus.", promptKey: null, mood: { background: "linear-gradient(160deg, #f2f8fb 0%, #c7dce8 50%, #8fb1c6 100%)", ink: "dark" } },
  { id: "warm-library", name: "Warm Library", category: "Office", description: "Warm bookshelves for advisors, lawyers and academics.", promptKey: null, mood: { background: "linear-gradient(160deg, #a8714a 0%, #6e4429 50%, #3b2416 100%)", ink: "light" } },
  { id: "city-bokeh", name: "City Bokeh", category: "Outdoor", description: "Urban street with soft city lights in the background.", promptKey: null, mood: { background: "radial-gradient(circle at 22% 28%, rgba(255,196,120,.55) 0, transparent 9%), radial-gradient(circle at 74% 20%, rgba(255,232,170,.45) 0, transparent 8%), radial-gradient(circle at 62% 46%, rgba(140,180,255,.4) 0, transparent 10%), radial-gradient(circle at 38% 12%, rgba(255,170,140,.35) 0, transparent 7%), linear-gradient(170deg, #2b3a55 0%, #1b2436 100%)", ink: "light" } },
  { id: "outdoor-park", name: "Park Greenery", category: "Outdoor", description: "Natural greenery and daylight for an approachable feel.", promptKey: null, mood: { background: "radial-gradient(60% 45% at 25% 18%, rgba(232,246,196,.75) 0%, transparent 70%), linear-gradient(165deg, #a7c98b 0%, #6d9a52 55%, #3f6630 100%)", ink: "light" } },
  { id: "golden-hour", name: "Golden Hour", category: "Outdoor", description: "Warm late-afternoon light outdoors.", promptKey: null, mood: { background: "radial-gradient(110% 80% at 80% 15%, #ffe2a8 0%, #f5b46a 40%, #d77a4a 75%, #9c4f36 100%)", ink: "light" } },
  { id: "minimal-beige", name: "Minimal Beige", category: "Studio", description: "Warm neutral backdrop, calm and modern.", promptKey: null, mood: { background: "radial-gradient(120% 90% at 50% 25%, #f7f0e6 0%, #e6d9c6 55%, #cbb79c 100%)", ink: "dark" } },
  { id: "tech-startup", name: "Startup Casual", category: "Casual", description: "Relaxed, modern workspace look for founders and tech teams.", promptKey: null, mood: { background: "linear-gradient(160deg, #f0f2f5 0%, #cfd8e3 45%, #7f93ab 100%)", ink: "dark" } },
  { id: "creative-color", name: "Creative Color", category: "Creative", description: "Bold colored backdrop for creative professionals.", promptKey: null, mood: { background: "linear-gradient(150deg, #ff7a9a 0%, #c45cff 55%, #5b5cff 100%)", ink: "light" } },
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
