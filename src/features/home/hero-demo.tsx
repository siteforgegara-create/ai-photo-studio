"use client";

import * as React from "react";
import Image from "next/image";
import { demoManifest } from "@/config/demo-manifest";
import { getStyle } from "@/config/styles";
import { BeforeAfter, ExampleBadge } from "@/components/before-after";
import { cn } from "@/lib/utils";

/** Hero styles (03-pages §1.1): a click on a thumbnail swaps the After frame. */
const heroStyles = ["corporate-gray", "minimal-beige", "modern-office", "city-bokeh"] as const;

export function HeroDemo() {
  const [styleId, setStyleId] = React.useState<(typeof heroStyles)[number]>("corporate-gray");
  const after = demoManifest.shoot[styleId] ?? demoManifest.hero.after;
  const name = getStyle(styleId)?.name ?? styleId;

  return (
    <div className="flex flex-col gap-3">
      <BeforeAfter
        before={demoManifest.hero.before}
        after={after}
        alt={`Example: a casual selfie and the same person as a ${name} headshot`}
        beforeLabel="Selfie"
        afterLabel={name}
        priority
        sizes="(min-width: 1024px) 520px, 100vw"
        badge={<ExampleBadge />}
        className="aspect-[4/5] shadow-card"
      />
      <div role="radiogroup" aria-label="Example styles" className="grid grid-cols-4 gap-2">
        {heroStyles.map((id) => {
          const src = demoManifest.shoot[id];
          const selected = id === styleId;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setStyleId(id)}
              className={cn(
                "group overflow-hidden rounded-[12px] border bg-surface text-left transition-[border-color,box-shadow] duration-[120ms]",
                selected ? "border-brand ring-1 ring-brand" : "border-border hover:border-[color-mix(in_srgb,var(--border)_50%,var(--text-muted))]",
              )}
            >
              <span className="relative block aspect-square bg-surface-2">
                {src && <Image src={src} alt="" fill sizes="120px" className="object-cover object-top" />}
              </span>
              <span className="block truncate px-2 py-1.5 text-[12px] leading-4 font-semibold text-text">{getStyle(id)?.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
