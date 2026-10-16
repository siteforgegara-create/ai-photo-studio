import { Eraser, SlidersHorizontal } from "lucide-react";

export const marketingNav = [
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/#examples", label: "Examples" },
] as const;

export const freeTools = [
  { href: "/tools/background-remover", label: "Background Remover", description: "Free, runs in your browser", icon: Eraser },
  { href: "/tools/photo-editor", label: "Photo Editor", description: "Crop, resize, adjust", icon: SlidersHorizontal },
] as const;
