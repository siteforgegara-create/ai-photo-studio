import * as React from "react";
import { Check } from "lucide-react";
import type { ShootPack } from "@/services/types";
import { cn } from "@/lib/utils";

export function packFeatures(pack: ShootPack): string[] {
  return [
    `${pack.photos} photos`,
    pack.styles === "all" ? "All styles" : `${pack.styles} styles`,
    `${pack.editCredits} edit credits`,
    "4K · commercial license",
    "Likeness check",
    ...(pack.priority ? ["Priority processing"] : []),
  ];
}

/**
 * PackCard — tariff card from the Pricing reference. `highlighted` adds the
 * gradient strip on top, brand border and a badge. Used on /pricing and in
 * the wizard (step 4).
 */
export function PackCard({
  pack,
  highlighted = pack.popular ?? false,
  badge,
  selected = false,
  action,
  compact = false,
  showOverline = true,
  className,
}: {
  pack: ShootPack;
  highlighted?: boolean;
  badge?: string;
  selected?: boolean;
  action?: React.ReactNode;
  compact?: boolean;
  /** Hide the overline (e.g. in the wizard, where the badge carries `MOST POPULAR`). */
  showOverline?: boolean;
  className?: string;
}) {
  const titleId = `pack-${pack.id}-title`;
  return (
    <article
      aria-labelledby={titleId}
      data-highlighted={highlighted || undefined}
      className={cn(
        "relative flex flex-col overflow-hidden rounded-[16px] border bg-surface shadow-card",
        compact ? "p-5" : "p-6",
        highlighted ? "border-brand shadow-[0_18px_40px_-24px_rgba(249,68,113,.45)]" : "border-border",
        selected && "ring-2 ring-brand",
        className,
      )}
    >
      {highlighted && <span className="absolute inset-x-0 top-0 h-1.5 bg-brand-gradient" aria-hidden="true" />}
      <div className="flex min-h-7 items-center justify-between gap-2">
        {showOverline ? <p className="text-overline text-muted">{pack.overline}</p> : <span />}
        {highlighted && badge && (!showOverline || badge !== pack.overline) && (
          <span className="rounded-full bg-brand-soft px-2.5 py-1 text-[11px] leading-4 font-bold tracking-[.06em] text-brand-text uppercase">{badge}</span>
        )}
      </div>
      <h3 id={titleId} className={cn("mt-3 text-text", compact ? "text-[20px] leading-7 font-bold" : "text-h3")}>
        {pack.name}
      </h3>
      <p className="mt-4 flex items-baseline gap-1.5">
        <span className={cn("font-extrabold tracking-[-0.02em] text-text", compact ? "text-[32px] leading-9" : "text-[44px] leading-[48px]")}>${pack.priceUsd}</span>
        <span className="text-small text-muted">one-time</span>
      </p>
      <hr className="my-5 border-border" />
      <ul className="flex flex-1 flex-col gap-2.5">
        {packFeatures(pack).map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-[14px] leading-5 text-text">
            <Check className="mt-0.5 size-4 shrink-0 text-success" strokeWidth={2.5} aria-hidden="true" />
            {f}
          </li>
        ))}
      </ul>
      {action && <div className="mt-6">{action}</div>}
    </article>
  );
}
