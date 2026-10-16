"use client";

import * as React from "react";
import { Dialog as Primitive } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = Primitive.Root;
export const DialogTrigger = Primitive.Trigger;
export const DialogClose = Primitive.Close;

export function DialogOverlay({ className, ...props }: React.ComponentProps<typeof Primitive.Overlay>) {
  return (
    <Primitive.Overlay
      className={cn(
        "fixed inset-0 z-50 bg-scrim backdrop-blur-[2px]",
        "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
        className,
      )}
      {...props}
    />
  );
}

export function DialogContent({
  className,
  children,
  hideClose = false,
  ...props
}: React.ComponentProps<typeof Primitive.Content> & { hideClose?: boolean }) {
  return (
    <Primitive.Portal>
      <DialogOverlay />
      <Primitive.Content
        className={cn(
          "fixed top-1/2 left-1/2 z-50 w-[calc(100%-32px)] max-w-[460px] -translate-x-1/2 -translate-y-1/2",
          "rounded-[16px] border border-border bg-surface p-6 text-text shadow-pop",
          "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[.98] data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
          className,
        )}
        {...props}
      >
        {children}
        {!hideClose && (
          <Primitive.Close className="absolute top-4 right-4 inline-flex size-8 items-center justify-center rounded-[8px] text-muted transition-colors hover:bg-surface-2 hover:text-text">
            <X className="size-[18px]" aria-hidden="true" />
            <span className="sr-only">Close</span>
          </Primitive.Close>
        )}
      </Primitive.Content>
    </Primitive.Portal>
  );
}

export function DialogTitle({ className, ...props }: React.ComponentProps<typeof Primitive.Title>) {
  return <Primitive.Title className={cn("pr-8 text-h3", className)} {...props} />;
}

export function DialogDescription({ className, ...props }: React.ComponentProps<typeof Primitive.Description>) {
  return <Primitive.Description className={cn("mt-2 text-body text-muted", className)} {...props} />;
}

export function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />;
}
