import * as React from "react";
import Image from "next/image";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type ThumbTileProps = Omit<React.ComponentProps<"button">, "children"> & {
  src?: string | null;
  alt: string;
  label: React.ReactNode;
  meta?: React.ReactNode;
  selected?: boolean;
  /** Badge in the top-right corner, e.g. `2 cr` or a selection number. */
  badge?: React.ReactNode;
  /** Shown when there is no image (neutral placeholder). */
  placeholder?: React.ReactNode;
  sizes?: string;
};

/** ThumbTile — 4:5 image, caption below; selected = 2px brand border + check badge. */
export function ThumbTile({ src, alt, label, meta, selected = false, badge, placeholder, sizes = "160px", className, type = "button", ...props }: ThumbTileProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(
        "group relative flex w-full flex-col overflow-hidden rounded-[12px] border bg-surface text-left",
        "transition-[border-color,box-shadow] duration-[120ms] ease-out",
        selected ? "border-brand ring-1 ring-brand" : "border-border hover:border-[color-mix(in_srgb,var(--border)_50%,var(--text-muted))]",
        className,
      )}
      {...props}
    >
      <span className="relative block aspect-[4/5] w-full overflow-hidden bg-surface-2">
        {src ? (
          <Image src={src} alt={alt} fill sizes={sizes} className="object-cover transition-transform duration-200 group-hover:scale-[1.02]" />
        ) : (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-3 text-center text-small text-muted">
            {placeholder ?? alt}
          </span>
        )}
        {selected && (
          <span className="absolute top-2 left-2 flex size-6 items-center justify-center rounded-[7px] bg-brand text-white shadow-sm" aria-hidden="true">
            <Check className="size-4" strokeWidth={3} />
          </span>
        )}
        {badge && <span className="absolute top-2 right-2">{badge}</span>}
      </span>
      {/* Names wrap (max two lines) instead of being cut with an ellipsis on narrow tiles; meta sits underneath. */}
      <span className="flex flex-col gap-0.5 px-2.5 py-2">
        <span className="line-clamp-2 text-[13px] leading-[18px] font-semibold break-words text-text">{label}</span>
        {meta && <span className="text-[12px] leading-4 text-muted">{meta}</span>}
      </span>
    </button>
  );
}
