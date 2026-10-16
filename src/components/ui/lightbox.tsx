"use client";

import * as React from "react";
import Image from "next/image";
import { Dialog as Primitive } from "radix-ui";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type LightboxItem = { id: string; src: string; alt: string; width?: number; height?: number };

type LightboxProps = {
  items: LightboxItem[];
  /** Index of the open item, or null when closed. */
  index: number | null;
  onIndexChange: (index: number | null) => void;
  /** Action bar under the photo (Download ▾, ★ Favorite, Edit in Studio →). */
  actions?: (item: LightboxItem, index: number) => React.ReactNode;
  /** Overlay rendered on top of the photo (e.g. <Watermark />). */
  overlay?: React.ReactNode;
  /** Disables the browser's "save image" context menu (previews). */
  protect?: boolean;
};

const SWIPE_THRESHOLD = 48;

/** Full-screen viewer: arrows, ← → keys, Esc, swipe, action bar. */
export function Lightbox({ items, index, onIndexChange, actions, overlay, protect = false }: LightboxProps) {
  const open = index !== null && items.length > 0;
  const current = open ? items[index] : undefined;
  const startX = React.useRef<number | null>(null);

  const go = React.useCallback(
    (delta: number) => {
      if (index === null || items.length === 0) return;
      onIndexChange((index + delta + items.length) % items.length);
    },
    [index, items.length, onIndexChange],
  );

  return (
    <Primitive.Root open={open} onOpenChange={(o) => !o && onIndexChange(null)}>
      <Primitive.Portal>
        <Primitive.Overlay className="fixed inset-0 z-50 bg-[rgba(8,12,18,.92)] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Primitive.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-50 flex flex-col text-white outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0"
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") {
              e.preventDefault();
              go(1);
            } else if (e.key === "ArrowLeft") {
              e.preventDefault();
              go(-1);
            }
          }}
        >
          <div className="flex h-14 shrink-0 items-center justify-between px-4">
            <Primitive.Title className="text-[14px] font-semibold text-white/80">
              {current ? `${(index ?? 0) + 1} of ${items.length}` : ""}
              <span className="sr-only"> — {current?.alt}</span>
            </Primitive.Title>
            <Primitive.Close className="inline-flex size-10 items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white">
              <X className="size-5" aria-hidden="true" />
              <span className="sr-only">Close</span>
            </Primitive.Close>
          </div>

          <div
            className="relative min-h-0 flex-1 touch-pan-y"
            onPointerDown={(e) => {
              startX.current = e.clientX;
            }}
            onPointerUp={(e) => {
              if (startX.current === null) return;
              const dx = e.clientX - startX.current;
              startX.current = null;
              if (Math.abs(dx) > SWIPE_THRESHOLD) go(dx < 0 ? 1 : -1);
            }}
            onContextMenu={protect ? (e) => e.preventDefault() : undefined}
          >
            {current && (
              <div className="absolute inset-4 md:inset-x-20">
                <div className="relative h-full w-full">
                  <Image key={current.id} src={current.src} alt={current.alt} fill sizes="100vw" className="object-contain" draggable={false} priority />
                  {overlay && <div className="pointer-events-none absolute inset-0 mx-auto aspect-[4/5] h-full max-w-full">{overlay}</div>}
                </div>
              </div>
            )}
            {items.length > 1 && (
              <>
                <NavButton side="left" onClick={() => go(-1)} />
                <NavButton side="right" onClick={() => go(1)} />
              </>
            )}
          </div>

          {current && actions && (
            <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]">
              {actions(current, index ?? 0)}
            </div>
          )}
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  );
}

function NavButton({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "absolute top-1/2 hidden size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20 md:flex",
        side === "left" ? "left-4" : "right-4",
      )}
      aria-label={side === "left" ? "Previous photo" : "Next photo"}
    >
      <Icon className="size-6" aria-hidden="true" />
    </button>
  );
}
