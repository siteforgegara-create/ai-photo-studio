"use client";

import * as React from "react";
import { Accordion as Primitive } from "radix-ui";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/** Accordion (Radix): FAQ lists. `+` turns into `×` when open; content fades in. */
export function Accordion(props: React.ComponentProps<typeof Primitive.Root>) {
  return <Primitive.Root {...props} />;
}

export function AccordionItem({ className, ...props }: React.ComponentProps<typeof Primitive.Item>) {
  return <Primitive.Item className={cn("border-b border-border last:border-b-0", className)} {...props} />;
}

export function AccordionTrigger({ className, children, ...props }: React.ComponentProps<typeof Primitive.Trigger>) {
  return (
    <Primitive.Header className="flex">
      <Primitive.Trigger
        className={cn(
          "group flex min-h-14 flex-1 items-center gap-3 py-3 text-left text-[15px] leading-6 font-semibold text-text transition-colors hover:text-brand-text",
          className,
        )}
        {...props}
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-surface-2 text-muted transition-transform duration-[160ms] group-data-[state=open]:rotate-45 group-data-[state=open]:text-brand-text">
          <Plus className="size-4" aria-hidden="true" />
        </span>
        {children}
      </Primitive.Trigger>
    </Primitive.Header>
  );
}

export function AccordionContent({ className, children, ...props }: React.ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Content className="overflow-hidden data-[state=open]:animate-in data-[state=open]:fade-in-0" {...props}>
      <div className={cn("pr-2 pb-4 pl-10 text-[15px] leading-6 text-muted", className)}>{children}</div>
    </Primitive.Content>
  );
}
