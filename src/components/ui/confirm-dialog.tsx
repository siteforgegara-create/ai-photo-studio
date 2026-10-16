"use client";

import * as React from "react";
import { Button } from "./button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "./dialog";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "primary" | "danger";
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  /** Extra content (e.g. `Don't ask again`, `Type DELETE`). */
  children?: React.ReactNode;
  confirmDisabled?: boolean;
};

/** Radix Dialog; focus lands on the main button, Esc closes. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  tone = "primary",
  loading = false,
  onConfirm,
  children,
  confirmDisabled = false,
}: ConfirmDialogProps) {
  const confirmRef = React.useRef<HTMLButtonElement>(null);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onOpenAutoFocus={(e) => {
          if (confirmRef.current && !confirmDisabled) {
            e.preventDefault();
            confirmRef.current.focus();
          }
        }}
      >
        <DialogTitle>{title}</DialogTitle>
        {description && <DialogDescription>{description}</DialogDescription>}
        {children && <div className="mt-4">{children}</div>}
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            ref={confirmRef}
            variant={tone === "danger" ? "danger-outline" : "primary"}
            loading={loading}
            disabled={confirmDisabled}
            onClick={() => void onConfirm()}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
