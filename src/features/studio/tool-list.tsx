"use client";

import * as React from "react";
import Link from "next/link";
import { editTools, formatToolPrice } from "@/config/edit-tools";
import type { EditToolId } from "@/services/types";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type Props = { active: EditToolId; onSelect: (id: EditToolId) => void };

/** Desktop left column (220 px): EDIT TOOLS + credits card (02-studio §1.1). */
export function ToolColumn({ active, onSelect, credits }: Props & { credits: React.ReactNode }) {
  return (
    <nav aria-label="Edit tools" className="flex h-full flex-col rounded-[16px] border border-border bg-surface p-3 shadow-card">
      <p className="px-3 pt-2 pb-3 text-overline text-muted">EDIT TOOLS</p>
      <ul className="flex flex-col gap-1">
        {editTools.map((t) => {
          const selected = t.id === active;
          return (
            <li key={t.id}>
              <button
                type="button"
                aria-current={selected ? "true" : undefined}
                onClick={() => onSelect(t.id)}
                className={cn(
                  "flex h-11 w-full items-center gap-3 rounded-[10px] px-3 text-left text-[14px] font-semibold transition-colors duration-[120ms]",
                  selected ? "bg-brand-soft text-brand-text" : "text-text hover:bg-surface-2",
                )}
              >
                <t.icon className={cn("size-[18px] shrink-0", selected ? "text-brand" : "text-muted")} aria-hidden="true" />
                <span className="flex-1 truncate">{t.name}</span>
                <span className={cn("text-[11px] font-medium", selected ? "text-brand-text" : "text-muted")}>{formatToolPrice(t.pricePerVariant)}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-auto pt-4">{credits}</div>
    </nav>
  );
}

/** Tablet: 64 px icon column, names in tooltips (02-studio §7). */
export function ToolIcons({ active, onSelect }: Props) {
  return (
    <nav aria-label="Edit tools" className="flex h-full flex-col items-center gap-1 rounded-[16px] border border-border bg-surface py-3 shadow-card">
      {editTools.map((t) => {
        const selected = t.id === active;
        return (
          <Tooltip key={t.id} content={`${t.name} · ${formatToolPrice(t.pricePerVariant)}`} side="right">
            <button
              type="button"
              aria-label={t.name}
              aria-current={selected ? "true" : undefined}
              onClick={() => onSelect(t.id)}
              className={cn("flex size-11 items-center justify-center rounded-[10px] transition-colors", selected ? "bg-brand-soft text-brand" : "text-muted hover:bg-surface-2 hover:text-text")}
            >
              <t.icon className="size-5" aria-hidden="true" />
            </button>
          </Tooltip>
        );
      })}
    </nav>
  );
}

/** Mobile: horizontal strip of tool tiles with scroll-snap (02-studio §6). */
export function ToolStrip({ active, onSelect }: Props) {
  return (
    <nav aria-label="Edit tools" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none]">
      <ul className="flex snap-x snap-mandatory gap-2 pb-1">
        {editTools.map((t) => {
          const selected = t.id === active;
          return (
            <li key={t.id} className="snap-start">
              <button
                type="button"
                aria-current={selected ? "true" : undefined}
                onClick={() => onSelect(t.id)}
                className={cn(
                  "flex h-[76px] w-[92px] flex-col items-center justify-center gap-1 rounded-[12px] border bg-surface px-1 text-center transition-colors",
                  selected ? "border-brand bg-brand-soft" : "border-border",
                )}
              >
                <t.icon className={cn("size-5", selected ? "text-brand" : "text-muted")} aria-hidden="true" />
                <span className={cn("w-full truncate text-[12px] font-semibold", selected ? "text-brand-text" : "text-text")}>{t.name}</span>
                <span className="text-[10px] font-medium text-muted">{formatToolPrice(t.pricePerVariant)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Credits card at the bottom of the left column. */
export function CreditsCard({ credits, guest }: { credits: number; guest: boolean }) {
  if (guest) {
    return (
      <div className="rounded-[12px] border border-[color-mix(in_srgb,var(--brand)_25%,var(--border))] bg-brand-soft p-3.5">
        <p className="text-[13px] leading-[18px] font-semibold text-text">Edits are included with every shoot.</p>
        <Link href="/pricing" className="mt-1 inline-block text-[13px] font-semibold text-brand-text hover:underline">
          See pricing
        </Link>
      </div>
    );
  }
  return (
    <div className="rounded-[12px] border border-border bg-surface-2 p-3.5">
      <p className="text-[15px] font-bold text-text">{credits} edit credits available</p>
      <p className="mt-0.5 text-[12px] text-muted">Credits never expire</p>
      <Link href="/pricing#credits" className="mt-1.5 inline-block text-[13px] font-semibold text-brand-text hover:underline">
        Buy more
      </Link>
    </div>
  );
}
