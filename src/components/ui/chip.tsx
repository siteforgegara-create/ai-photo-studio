import * as React from "react";
import { cn } from "@/lib/utils";

type ChipProps = React.ComponentProps<"button"> & { selected?: boolean };

/** Chip — selected: brand-soft fill + brand border/text; default: surface + border. */
export function Chip({ selected = false, className, type = "button", ...props }: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      data-selected={selected || undefined}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-[10px] border px-3.5 text-[13px] leading-[18px] font-semibold whitespace-nowrap",
        "transition-colors duration-[120ms] ease-out [&_svg]:size-4",
        selected
          ? "border-brand bg-brand-soft text-brand-text"
          : "border-border bg-surface text-text hover:bg-surface-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
