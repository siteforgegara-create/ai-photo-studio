import type { LucideIcon } from "lucide-react";
import { Crop, Image as ImageIcon, MapPin, Palette, Shirt, SunMedium, Wand2 } from "lucide-react";
import type { EditToolId } from "@/services/types";
import { editCostPerVariant } from "./packs";

/** Studio edit tools — docs/02-studio.md §3. Prices per variant come from packs.ts (M4). */
export type EditOption = {
  id: string;
  name: string;
  /** Background → Brand → Solid color shows a colour picker. */
  kind?: "color";
  /** Plain backdrops: CSS background shown as the tile itself until a demo image exists. */
  swatch?: string;
};

export type EditCategory = {
  id: string;
  name: string;
  options: EditOption[];
};

export type EditToggle = { id: string; name: string };

export type EditTool = {
  id: EditToolId;
  name: string;
  icon: LucideIcon;
  subtitle: string;
  /** Credits per variant. 0 = free. */
  pricePerVariant: number;
  /** ✦ creative tools show a `2 cr` badge on tiles. */
  creative: boolean;
  categories: EditCategory[];
  toggles?: EditToggle[];
  custom?:
    | { type: "text"; maxLength: number; label: string }
    | { type: "scene"; label: string; placementLabel: string };
  /** Short tips shown under the Options tab. */
  tips: string[];
};

const opt = (id: string, name: string, extra?: Partial<EditOption>): EditOption => ({ id, name, ...extra });

export const editTools: readonly EditTool[] = [
  {
    id: "background",
    name: "Background",
    icon: ImageIcon,
    subtitle: "Replace the backdrop, keep everything else.",
    pricePerVariant: editCostPerVariant.background,
    creative: false,
    categories: [
      { id: "studio", name: "Studio", options: [
          opt("studio-white", "White", { swatch: "#ffffff" }),
          opt("studio-light-gray", "Light Gray", { swatch: "#d9dce1" }),
          opt("studio-charcoal", "Charcoal", { swatch: "#3b4049" }),
          opt("studio-gradient", "Gradient", { swatch: "radial-gradient(120% 90% at 50% 30%, #f1f3f6 0%, #c3c8d0 60%, #8f96a1 100%)" }),
        ], },
      { id: "office", name: "Office", options: [opt("modern-office", "Modern Office"), opt("glass-meeting-room", "Glass Meeting Room"), opt("library", "Library")] },
      { id: "outdoor", name: "Outdoor", options: [opt("city-bokeh", "City Bokeh"), opt("park", "Park"), opt("golden-hour", "Golden Hour")] },
      { id: "brand", name: "Brand", options: [opt("solid-color", "Solid color", { kind: "color" })] },
    ],
    custom: { type: "text", maxLength: 300, label: "Describe your background" },
    tips: ["Pick a backdrop that suits where the photo will be used — plain studio tones for CVs, an office or city for LinkedIn and websites.", "Brand color works best when it is calm and not too saturated."],
  },
  {
    id: "outfit",
    name: "Outfit",
    icon: Shirt,
    subtitle: "Try a different outfit in seconds.",
    pricePerVariant: editCostPerVariant.outfit,
    creative: false,
    categories: [
      { id: "business", name: "Business", options: [opt("navy-suit", "Navy Suit"), opt("charcoal-suit", "Charcoal Suit"), opt("blazer-shirt", "Blazer + Shirt")] },
      { id: "smart-casual", name: "Smart Casual", options: [opt("knit-sweater", "Knit Sweater"), opt("oxford-shirt", "Oxford Shirt"), opt("turtleneck", "Turtleneck")] },
      { id: "industry", name: "Industry", options: [opt("medical-white-coat", "Medical White Coat"), opt("scrubs", "Scrubs")] },
    ],
    tips: ["Choose what you would actually wear to work in your field — it reads as more authentic.", "Generate a couple of variants and keep the one where the collar and fit look most natural."],
  },
  {
    id: "retouch",
    name: "Retouch",
    icon: Wand2,
    subtitle: "Natural touch-ups that keep you recognizable.",
    pricePerVariant: editCostPerVariant.retouch,
    creative: false,
    categories: [{ id: "level", name: "Level", options: [opt("subtle", "Subtle"), opt("balanced", "Balanced")] }],
    toggles: [
      { id: "even-skin-tone", name: "Even skin tone" },
      { id: "reduce-shine", name: "Reduce shine" },
      { id: "soften-under-eyes", name: "Soften under-eyes" },
    ],
    tips: ["Start with Subtle — you can always go further, but heavy smoothing makes you look less like yourself.", "Turn on only the touch-ups you need; each one is applied gently."],
  },
  {
    id: "relight",
    name: "Relight",
    icon: SunMedium,
    subtitle: "Fix flat or harsh lighting.",
    pricePerVariant: editCostPerVariant.relight,
    creative: false,
    categories: [
      {
        id: "light",
        name: "Light",
        options: [opt("soft-studio", "Soft Studio"), opt("window-light", "Window Light"), opt("warm-golden", "Warm Golden"), opt("dramatic-side", "Dramatic Side")],
      },
    ],
    tips: ["Soft Studio suits most headshots; Window Light gives a warmer, more relaxed feel.", "Dramatic Side works best on plain backgrounds."],
  },
  {
    id: "creative",
    name: "Creative Style",
    icon: Palette,
    subtitle: "Go beyond the corporate look.",
    pricePerVariant: editCostPerVariant.creative,
    creative: true,
    categories: [
      {
        id: "style",
        name: "Style",
        options: [opt("editorial-bw", "Editorial B&W"), opt("cinematic", "Cinematic"), opt("magazine-cover", "Magazine Cover"), opt("color-studio", "Color Studio"), opt("film-look", "Film Look")],
      },
    ],
    custom: { type: "text", maxLength: 300, label: "Describe your style" },
    tips: ["Creative styles are for portfolios, speaker pages and social profiles rather than formal documents.", "Describe the mood you want in Custom — colors, light, era — rather than a specific person."],
  },
  {
    id: "place",
    name: "Place Me Here",
    icon: MapPin,
    subtitle: "Put yourself into any place from a photo.",
    pricePerVariant: editCostPerVariant.place,
    creative: true,
    categories: [
      {
        id: "scenes",
        name: "Scenes",
        options: [opt("conference-stage", "Conference Stage"), opt("coworking", "Coworking"), opt("cafe", "Café"), opt("city-street", "City Street"), opt("bookshelf", "Bookshelf")],
      },
    ],
    custom: { type: "scene", label: "Scene Photo", placementLabel: "Describe placement" },
    tips: ["Choose a scene photo with light that matches yours — similar direction and brightness blend best.", "Leave room in the scene where you want to appear and describe the spot in Describe placement."],
  },
  {
    id: "crop",
    name: "Crop & Export",
    icon: Crop,
    subtitle: "Crop, straighten and export — free and private.",
    pricePerVariant: editCostPerVariant.crop,
    creative: false,
    categories: [],
    tips: ["Use 1:1 for LinkedIn and avatars, 3:4 for CVs.", "Everything here runs in your browser and is free — nothing is uploaded."],
  },
] as const;

/** Crop & Export presets — 02-studio.md §3.1. */
export const cropPresets = [
  { id: "free", name: "Free", ratio: null },
  { id: "1:1", name: "1:1 (LinkedIn)", ratio: 1 },
  { id: "4:5", name: "4:5", ratio: 4 / 5 },
  { id: "3:4", name: "3:4 (Resume)", ratio: 3 / 4 },
  { id: "16:9", name: "16:9", ratio: 16 / 9 },
  { id: "9:16", name: "9:16", ratio: 9 / 16 },
  { id: "circle", name: "Circle", ratio: 1 },
] as const;

/** Download formats — shoot lightbox and Studio (06-shoot-flow.md §2). */
export const downloadFormats = [
  { id: "original", name: "Original 4K (JPG)" },
  { id: "linkedin", name: "LinkedIn (1:1, 1080px)" },
  { id: "resume", name: "Resume (3:4)" },
  { id: "avatar", name: "Round avatar (PNG)" },
  { id: "website", name: "Website (16:9 with space)" },
] as const;

export function getEditTool(id: EditToolId): EditTool {
  const tool = editTools.find((t) => t.id === id);
  if (!tool) throw new Error(`Unknown edit tool: ${id}`);
  return tool;
}

export function formatToolPrice(pricePerVariant: number): string {
  return pricePerVariant === 0 ? "Free" : `${pricePerVariant} cr`;
}
