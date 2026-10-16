"use client";

import * as React from "react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** Checkbox (also used for `Show Demo Image`, decision V5). */
export function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border border-[color-mix(in_srgb,var(--border)_50%,var(--text-muted))] bg-surface",
        "transition-colors duration-[120ms] data-[state=checked]:border-brand data-[state=checked]:bg-brand data-[state=checked]:text-white",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator>
        <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
