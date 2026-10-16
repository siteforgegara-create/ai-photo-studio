"use client";

import * as React from "react";
import { DropdownMenu as Primitive } from "radix-ui";
import { cn } from "@/lib/utils";

export const DropdownMenu = Primitive.Root;
export const DropdownMenuTrigger = Primitive.Trigger;
export const DropdownMenuGroup = Primitive.Group;
export const DropdownMenuSub = Primitive.Sub;

const surface =
  "z-50 min-w-56 overflow-hidden rounded-[12px] border border-border bg-surface p-1.5 text-text shadow-pop " +
  "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[.98] " +
  "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[side=bottom]:slide-in-from-top-1";

export function DropdownMenuContent({ className, sideOffset = 8, align = "end", ...props }: React.ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Portal>
      <Primitive.Content sideOffset={sideOffset} align={align} className={cn(surface, className)} {...props} />
    </Primitive.Portal>
  );
}

const item =
  "relative flex min-h-10 cursor-pointer items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-[14px] leading-5 font-medium outline-none select-none " +
  "data-[highlighted]:bg-surface-2 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:size-[18px] [&_svg]:shrink-0 [&_svg]:text-muted";

export function DropdownMenuItem({ className, ...props }: React.ComponentProps<typeof Primitive.Item>) {
  return <Primitive.Item className={cn(item, className)} {...props} />;
}

export function DropdownMenuSubTrigger({ className, children, ...props }: React.ComponentProps<typeof Primitive.SubTrigger>) {
  return (
    <Primitive.SubTrigger className={cn(item, "data-[state=open]:bg-surface-2", className)} {...props}>
      {children}
    </Primitive.SubTrigger>
  );
}

export function DropdownMenuSubContent({ className, ...props }: React.ComponentProps<typeof Primitive.SubContent>) {
  return (
    <Primitive.Portal>
      <Primitive.SubContent sideOffset={6} className={cn(surface, className)} {...props} />
    </Primitive.Portal>
  );
}

export function DropdownMenuLabel({ className, ...props }: React.ComponentProps<typeof Primitive.Label>) {
  return <Primitive.Label className={cn("px-2.5 pt-2 pb-1 text-overline text-muted", className)} {...props} />;
}

export function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<typeof Primitive.Separator>) {
  return <Primitive.Separator className={cn("-mx-1.5 my-1.5 h-px bg-border", className)} {...props} />;
}
