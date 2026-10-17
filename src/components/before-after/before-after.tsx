"use client";

import * as React from "react";
import Image from "next/image";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type BeforeAfterProps = {
  before: string;
  after: string;
  /** Accessible description of the comparison. */
  alt: string;
  beforeLabel?: string;
  afterLabel?: string;
  /** `slider` (interactive) or `diagonal` (static, auth panel / hero). */
  variant?: "slider" | "diagonal";
  /** Controlled split in %, 0–100. */
  split?: number;
  defaultSplit?: number;
  onSplitChange?: (split: number) => void;
  /** Zoom 0.5–3 applied to both layers in sync. */
  zoom?: number;
  /** Pan offset in % of the frame (−50…50), applied to both layers in sync. Only used when zoom > 1. */
  pan?: { x: number; y: number };
  onPanChange?: (pan: { x: number; y: number }) => void;
  /** Chip in the top-left corner under the labels, e.g. `Example`. */
  badge?: React.ReactNode;
  /** Caption at the bottom (slider: `Drag to compare`). */
  caption?: React.ReactNode;
  showLabels?: boolean;
  priority?: boolean;
  sizes?: string;
  className?: string;
  /** Rounded corners (default 16px). */
  rounded?: boolean;
  /** How both layers fill the frame (slider variant). `contain` never crops the photo. */
  fit?: "cover" | "contain";
  /** Extra classes for the After layer (e.g. a checkerboard behind a transparent cut-out). */
  afterLayerClassName?: string;
};

const clamp = (v: number, min = 0, max = 100) => Math.min(max, Math.max(min, v));

/**
 * Before/After — docs/02-studio.md §4. Two layers of the same size; the top
 * (After) layer is clipped with `clip-path: inset(0 0 0 X%)`. Drag anywhere on
 * the image; the handle is a `role="slider"` with arrows ±2, Shift ±10, Home/End.
 * No animation while dragging — the divider follows the pointer exactly.
 */
export function BeforeAfter(props: BeforeAfterProps) {
  if (props.variant === "diagonal") return <DiagonalBeforeAfter {...props} />;
  return <SliderBeforeAfter {...props} />;
}

function SliderBeforeAfter({
  before,
  after,
  alt,
  beforeLabel = "Before",
  afterLabel = "After",
  split: controlled,
  defaultSplit = 50,
  onSplitChange,
  zoom = 1,
  pan = { x: 0, y: 0 },
  onPanChange,
  badge,
  caption = "Drag to compare",
  showLabels = true,
  priority = false,
  sizes = "(min-width: 1200px) 760px, 100vw",
  className,
  rounded = true,
  fit = "cover",
  afterLayerClassName,
}: BeforeAfterProps) {
  const [internal, setInternal] = React.useState(defaultSplit);
  const split = controlled ?? internal;
  const areaRef = React.useRef<HTMLDivElement>(null);
  const drag = React.useRef<null | { mode: "split" } | { mode: "pan"; x: number; y: number; start: { x: number; y: number } }>(null);
  const zoomed = zoom > 1.001;

  const setSplit = React.useCallback(
    (v: number) => {
      const next = Math.round(clamp(v) * 10) / 10;
      if (controlled === undefined) setInternal(next);
      onSplitChange?.(next);
    },
    [controlled, onSplitChange],
  );

  const fromPointer = (clientX: number) => {
    const rect = areaRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    setSplit(((clientX - rect.left) / rect.width) * 100);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 2;
    let next: number | null = null;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = split - step;
    else if (e.key === "ArrowRight" || e.key === "ArrowUp") next = split + step;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = 100;
    else if (e.key === "PageDown") next = split - 10;
    else if (e.key === "PageUp") next = split + 10;
    if (next !== null) {
      e.preventDefault();
      setSplit(next);
    }
  };

  // Both layers share one transform; the clip lives on an unscaled wrapper so the divider stays aligned.
  const maxPan = zoomed ? ((zoom - 1) / (2 * zoom)) * 100 : 0;
  const px = clamp(pan.x, -maxPan, maxPan);
  const py = clamp(pan.y, -maxPan, maxPan);
  const layerStyle: React.CSSProperties = zoom !== 1 ? { transform: `scale(${zoom}) translate(${px}%, ${py}%)`, transformOrigin: "center" } : {};

  const startDrag = (e: React.PointerEvent, mode: "split" | "pan") => {
    if (e.button !== 0) return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    if (mode === "split") {
      drag.current = { mode: "split" };
      fromPointer(e.clientX);
    } else {
      drag.current = { mode: "pan", x: e.clientX, y: e.clientY, start: { x: px, y: py } };
    }
  };
  const moveDrag = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    if (d.mode === "split") return fromPointer(e.clientX);
    const rect = areaRef.current?.getBoundingClientRect();
    if (!rect) return;
    // Movement in screen px → % of the (scaled) layer.
    const nx = clamp(d.start.x + ((e.clientX - d.x) / rect.width / zoom) * 100, -maxPan, maxPan);
    const ny = clamp(d.start.y + ((e.clientY - d.y) / rect.height / zoom) * 100, -maxPan, maxPan);
    onPanChange?.({ x: nx, y: ny });
  };
  const endDrag = () => {
    drag.current = null;
  };

  return (
    <figure
      className={cn("relative isolate w-full overflow-hidden bg-surface-2 select-none", rounded && "rounded-[16px]", className)}
      style={{ aspectRatio: "4 / 5" }}
    >
      <div
        ref={areaRef}
        data-zoomed={zoomed || undefined}
        className={cn("absolute inset-0", zoomed ? "cursor-grab touch-none active:cursor-grabbing" : "cursor-ew-resize touch-pan-y")}
        onPointerDown={(e) => startDrag(e, zoomed ? "pan" : "split")}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0" style={layerStyle} data-layer="before">
            <Image src={before} alt="" fill sizes={sizes} priority={priority} className={fit === "contain" ? "object-contain" : "object-cover"} draggable={false} />
          </div>
        </div>
        <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 0 0 ${split}%)` }}>
          <div className={cn("absolute inset-0", afterLayerClassName)} style={layerStyle} data-layer="after">
            <Image src={after} alt="" fill sizes={sizes} priority={priority} className={fit === "contain" ? "object-contain" : "object-cover"} draggable={false} />
          </div>
        </div>

        <div className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white/90 shadow-[0_0_0_1px_rgba(0,0,0,.08)]" style={{ left: `${split}%` }} aria-hidden="true" />
        <div
          role="slider"
          tabIndex={0}
          aria-label="Compare before and after"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(split)}
          aria-valuetext={`${Math.round(split)}% ${beforeLabel.toLowerCase()}`}
          onKeyDown={onKeyDown}
          onPointerDown={(e) => startDrag(e, "split")}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="absolute top-1/2 cursor-ew-resize touch-none flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-overlay-chip text-white shadow-lg backdrop-blur-sm"
          style={{ left: `${split}%` }}
        >
          <ChevronLeft className="-mr-1 size-4" aria-hidden="true" />
          <ChevronRight className="-ml-1 size-4" aria-hidden="true" />
        </div>
      </div>

      {showLabels && (
        <>
          <Chip className="top-3 left-3">{beforeLabel}</Chip>
          <Chip className="top-3 right-3">{afterLabel}</Chip>
        </>
      )}
      {badge && <div className="pointer-events-none absolute top-14 left-3">{badge}</div>}
      {caption && <Chip className="bottom-3 left-3 font-medium">{caption}</Chip>}
      <figcaption className="sr-only">{alt}</figcaption>
    </figure>
  );
}

function DiagonalBeforeAfter({ before, after, alt, beforeLabel = "Before", afterLabel = "After", badge, caption, priority = false, sizes = "50vw", className, rounded = true }: BeforeAfterProps) {
  // After occupies the right side of a diagonal running from 62% at the top to 38% at the bottom.
  const clip = "polygon(62% 0, 100% 0, 100% 100%, 38% 100%)";
  return (
    <figure className={cn("relative isolate h-full w-full overflow-hidden bg-surface-2", rounded && "rounded-[16px]", className)}>
      <Image src={before} alt="" fill sizes={sizes} priority={priority} className="object-cover" />
      <div className="absolute inset-0" style={{ clipPath: clip }}>
        <Image src={after} alt="" fill sizes={sizes} priority={priority} className="object-cover" />
      </div>
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <line x1="62" y1="0" x2="38" y2="100" stroke="white" strokeWidth="0.6" vectorEffect="non-scaling-stroke" style={{ strokeWidth: 3 }} />
      </svg>
      <span
        aria-hidden="true"
        className="absolute top-1/2 left-1/2 flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white/90 bg-brand-gradient text-white shadow-[0_0_0_6px_rgba(255,255,255,.18),0_10px_30px_-8px_rgba(249,68,113,.7)]"
      >
        <ArrowRight className="size-6" />
      </span>
      <Chip className="top-4 left-4">{beforeLabel}</Chip>
      <span className="absolute top-4 right-4 rounded-full bg-cta-gradient px-3.5 py-1.5 text-[13px] leading-[18px] font-semibold text-white shadow">{afterLabel}</span>
      {badge && <div className="absolute top-16 left-4">{badge}</div>}
      {caption && (
        <div className="absolute inset-x-4 bottom-4 rounded-[10px] bg-overlay-chip px-4 py-2.5 text-center text-[13px] leading-[18px] font-medium text-white backdrop-blur-sm">{caption}</div>
      )}
      <figcaption className="sr-only">{alt}</figcaption>
    </figure>
  );
}

function Chip({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("pointer-events-none absolute rounded-[8px] bg-overlay-chip px-2.5 py-1 text-[12px] leading-[18px] font-semibold text-white backdrop-blur-sm", className)}>
      {children}
    </span>
  );
}

/** `Example` chip used on every demo image (CLAUDE.md §3.4). */
export function ExampleBadge({ label = "Example" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-[8px] bg-overlay-chip px-2.5 py-1 text-[12px] leading-[18px] font-semibold text-white backdrop-blur-sm">
      <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
      {label}
    </span>
  );
}
