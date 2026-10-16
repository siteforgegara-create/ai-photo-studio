"use client";

import * as React from "react";
import { Tabs as Primitive } from "radix-ui";
import { cn } from "@/lib/utils";

/** Tabs — 2px brand underline on the active tab (Studio right panel, mobile sheet). */
export const Tabs = Primitive.Root;

export function TabsList({ className, ...props }: React.ComponentProps<typeof Primitive.List>) {
  return <Primitive.List className={cn("flex items-stretch border-b border-border", className)} {...props} />;
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof Primitive.Trigger>) {
  return (
    <Primitive.Trigger
      className={cn(
        "relative -mb-px inline-flex h-11 flex-1 items-center justify-center gap-1.5 px-3 text-[13px] font-semibold text-muted",
        "border-b-2 border-transparent transition-colors duration-[120ms] hover:text-text",
        "data-[state=active]:border-brand data-[state=active]:text-brand-text",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Content fades in over 160 ms (01-design-system §5). `forceMount` keeps
 * inactive panels mounted (state + scroll survive) — they are just hidden.
 */
export function TabsContent({ className, ...props }: React.ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Content
      className={cn(
        "outline-none data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:duration-[160ms] data-[state=inactive]:hidden",
        className,
      )}
      {...props}
    />
  );
}
