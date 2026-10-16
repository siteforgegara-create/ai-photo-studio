import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  [
    "relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[10px] text-button font-semibold select-none",
    "transition-[background-color,border-color,color,opacity,box-shadow,transform] duration-[120ms] ease-out",
    "active:translate-y-px disabled:pointer-events-none aria-disabled:pointer-events-none",
    "[&_svg]:pointer-events-none [&_svg]:size-[18px] [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        /** Main CTA only — one per screen (01-design-system §1). */
        primary:
          "bg-brand-gradient text-white shadow-[0_6px_16px_-6px_rgba(249,68,113,.55)] hover:brightness-[1.04] disabled:opacity-35 disabled:shadow-none aria-disabled:opacity-35",
        secondary:
          "bg-surface text-text border border-border hover:bg-surface-2 hover:border-[color-mix(in_srgb,var(--border)_60%,var(--text-muted))] disabled:opacity-50",
        ghost: "text-text hover:bg-surface-2 disabled:opacity-50",
        "danger-outline":
          "bg-surface text-danger-text border border-[color-mix(in_srgb,var(--danger)_45%,var(--border))] hover:bg-[color-mix(in_srgb,var(--danger)_8%,var(--surface))] disabled:opacity-50",
        link: "text-brand-text underline-offset-4 hover:underline h-auto! px-0!",
      },
      size: {
        sm: "h-8 px-3 text-[13px]",
        md: "h-10 px-4",
        lg: "h-12 px-6 text-[15px]",
        icon: "size-10",
        "icon-sm": "size-8 [&_svg]:size-4",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    loading?: boolean;
  };

export function Button({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  const isDisabled = disabled || loading;
  return (
    <Comp
      data-slot="button"
      data-variant={variant ?? "secondary"}
      className={cn(buttonVariants({ variant, size }), loading && "cursor-wait", className)}
      {...(asChild ? { "aria-disabled": isDisabled || undefined } : { disabled: isDisabled })}
      aria-busy={loading || undefined}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading && <LoaderCircle className="animate-spin" aria-hidden="true" />}
          {children}
        </>
      )}
    </Comp>
  );
}
