import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badge = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] leading-4 font-bold uppercase tracking-[.06em] whitespace-nowrap [&_svg]:size-3.5",
  {
    variants: {
      tone: {
        /** DEMO MODE · 0 CREDITS, Ready, +100 */
        success: "bg-success-soft text-success-text",
        demo: "bg-success-soft text-success-text",
        info: "bg-brand-soft text-brand-text",
        warning: "bg-warning-soft text-warning-text",
        neutral: "bg-surface-2 text-muted border border-border",
        danger: "bg-[color-mix(in_srgb,var(--danger)_12%,var(--surface))] text-danger-text",
      },
      casing: { upper: "", normal: "normal-case tracking-normal text-[12px] font-semibold" },
    },
    defaultVariants: { tone: "neutral", casing: "upper" },
  },
);

export type StatusBadgeProps = React.ComponentProps<"span"> & VariantProps<typeof badge> & { dot?: boolean };

export function StatusBadge({ tone, casing, dot = false, className, children, ...props }: StatusBadgeProps) {
  return (
    <span className={cn(badge({ tone, casing }), className)} {...props}>
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />}
      {children}
    </span>
  );
}
