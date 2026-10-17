"use client";

import * as React from "react";
import { ImageUp } from "lucide-react";
import { cn } from "@/lib/utils";

type DropzoneProps = {
  title: string;
  hint: string;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  onFiles: (files: File[]) => void;
  className?: string;
  icon?: React.ReactNode;
  /** Extra content under the hint (e.g. a secondary button). */
  children?: React.ReactNode;
};

/**
 * Dropzone — dashed border, icon, title, format hint. Click / Enter / Space
 * opens the file picker; drag & drop highlights the area. Files never leave
 * the component — the caller decides what to do with them.
 */
export function Dropzone({
  title,
  hint,
  accept,
  multiple = true,
  disabled = false,
  onFiles,
  className,
  icon,
  children,
}: DropzoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const hintId = React.useId();

  const take = (list: FileList | null) => {
    if (!list || disabled) return;
    const files = Array.from(list);
    if (files.length) onFiles(multiple ? files : files.slice(0, 1));
  };

  // The file input sits next to the button (not inside it): no nested interactive controls (axe).
  return (
    <div className="relative">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || undefined}
        aria-describedby={hintId}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          take(e.dataTransfer.files);
        }}
        data-dragging={dragging || undefined}
        className={cn(
          "flex min-h-56 cursor-pointer flex-col items-center justify-center gap-3 rounded-[16px] border-2 border-dashed border-border bg-surface-2 px-6 py-10 text-center",
          "transition-colors duration-[120ms] hover:border-[color-mix(in_srgb,var(--brand)_50%,var(--border))]",
          "data-[dragging]:border-brand data-[dragging]:bg-brand-soft",
          disabled && "cursor-not-allowed opacity-50",
          className,
        )}
      >
        <span
          className="flex size-14 items-center justify-center rounded-[14px] border border-border bg-surface text-muted [&_svg]:size-6"
          aria-hidden="true"
        >
          {icon ?? <ImageUp />}
        </span>
        <span className="text-[17px] leading-6 font-bold text-text">
          {title}
        </span>
        <span id={hintId} className="text-small text-muted">
          {hint}
        </span>
        {children}
      </div>
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        tabIndex={-1}
        aria-label={title}
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={(e) => {
          take(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
