import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, type = "text", ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-[10px] border border-border bg-surface-2 px-3.5 text-[15px] text-text placeholder:text-muted",
        "transition-[border-color,box-shadow] duration-[120ms] outline-none",
        "focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[color-mix(in_srgb,var(--brand)_35%,transparent)]",
        "aria-invalid:border-danger disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return <label className={cn("mb-1.5 block text-[13px] leading-[18px] font-semibold text-text", className)} {...props} />;
}

export function FieldError({ id, children }: { id: string; children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-[13px] leading-[18px] font-medium text-danger-text">
      {children}
    </p>
  );
}
