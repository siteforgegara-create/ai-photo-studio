import type { ShootStyle } from "@/config/styles";
import { cn } from "@/lib/utils";

/**
 * Stand-in for a style without a demo frame yet: the style's backdrop mood
 * (colour / gradient from styles.ts), a soft generic head-and-shoulders
 * outline and the style name. Decorative — the caption next to it carries
 * the accessible name. A frame added to demo-manifest replaces it automatically.
 */
export function StylePlaceholder({ style, className }: { style: Pick<ShootStyle, "name" | "mood">; className?: string }) {
  const light = style.mood.ink === "light";
  return (
    <span className={cn("absolute inset-0 overflow-hidden", className)} style={{ background: style.mood.background }} aria-hidden="true">
      <svg viewBox="0 0 100 125" preserveAspectRatio="xMidYMax meet" className={cn("absolute inset-x-0 bottom-0 h-[78%] w-full", light ? "text-white/18" : "text-black/10")}>
        <ellipse cx="50" cy="52" rx="17" ry="21" fill="currentColor" />
        <path d="M10 125 C12 96 28 82 50 82 C72 82 88 96 90 125 Z" fill="currentColor" />
      </svg>
      <span
        className={cn(
          "absolute inset-x-0 top-0 px-3 pt-3 text-[12px] leading-4 font-semibold tracking-[0.02em]",
          light ? "text-white/90" : "text-[#1e2431]/75",
        )}
      >
        {style.name}
      </span>
    </span>
  );
}
