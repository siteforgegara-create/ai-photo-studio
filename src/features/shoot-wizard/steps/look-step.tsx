"use client";

import * as React from "react";
import { StylePlaceholder } from "@/components/marketing/style-placeholder";
import { ArrowLeft, ArrowRight, Briefcase, Shirt, Sparkles, UserRound, Wand2 } from "lucide-react";
import { PREVIEW_STYLE_COUNT, shootStyles } from "@/config/styles";
import type { GlassesChoice, OutfitChoice } from "@/services/types";
import { Button } from "@/components/ui/button";
import { ThumbTile } from "@/components/ui/thumb-tile";
import { cn } from "@/lib/utils";
import { useWizard } from "../store";

export const outfitOptions: { id: OutfitChoice; label: string; icon: typeof Shirt }[] = [
  { id: "keep", label: "Keep my outfit", icon: UserRound },
  { id: "suit", label: "Suit", icon: Briefcase },
  { id: "blazer", label: "Blazer", icon: Shirt },
  { id: "smart-casual", label: "Smart casual", icon: Sparkles },
  { id: "auto", label: "Let us choose", icon: Wand2 },
];

/** Step 2 — Your look (06-shoot-flow §1). */
export function LookStep({ previewUsed, busy, onBack, onContinue }: { previewUsed: boolean; busy: boolean; onBack: () => void; onContinue: () => void }) {
  const { outfit, setOutfit, glasses, setGlasses, previewStyles, togglePreviewStyle } = useWizard();
  const ready = outfit !== null && (previewUsed || previewStyles.length === PREVIEW_STYLE_COUNT);

  return (
    <div className="flex flex-col gap-10">
      <header>
        <h1 className="text-h1 text-text">Your look</h1>
        <p className="mt-2 text-[17px] leading-7 text-muted">Tell us what to wear and pick two styles for your free preview.</p>
      </header>

      <fieldset>
        <legend className="text-h3 text-text">Outfit</legend>
        <div role="radiogroup" aria-label="Outfit" className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {outfitOptions.map((o) => {
            const selected = outfit === o.id;
            return (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setOutfit(o.id)}
                className={cn(
                  "flex min-h-24 flex-col items-start justify-between gap-3 rounded-[12px] border bg-surface p-4 text-left transition-colors duration-[120ms]",
                  selected ? "border-brand bg-brand-soft ring-1 ring-brand" : "border-border hover:bg-surface-2",
                )}
              >
                <o.icon className={cn("size-5", selected ? "text-brand" : "text-muted")} aria-hidden="true" />
                <span className={cn("text-[14px] font-semibold", selected ? "text-brand-text" : "text-text")}>{o.label}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Mock stage: shown always. With real detection it is shown only if glasses appear on a selfie. */}
      <fieldset>
        <legend className="text-h3 text-text">Glasses</legend>
        <div role="radiogroup" aria-label="Glasses" className="mt-4 inline-flex rounded-[10px] border border-border bg-surface-2 p-[3px]">
          {(["keep", "remove"] as GlassesChoice[]).map((g) => (
            <button
              key={g}
              type="button"
              role="radio"
              aria-checked={glasses === g}
              onClick={() => setGlasses(g)}
              className={cn(
                "h-9 rounded-[8px] px-5 text-[14px] font-semibold transition-colors",
                glasses === g ? "bg-surface text-text shadow-card ring-1 ring-border" : "text-muted hover:text-text",
              )}
            >
              {g === "keep" ? "Keep" : "Remove"}
            </button>
          ))}
        </div>
      </fieldset>

      {!previewUsed && (
        <fieldset>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <legend className="text-h3 text-text">Preview styles</legend>
            <p className="text-[14px] font-semibold text-muted" aria-live="polite">
              {previewStyles.length} of {PREVIEW_STYLE_COUNT} selected
            </p>
          </div>
          <p className="mt-1 text-body text-muted">Choose 2 styles for your free preview.</p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {shootStyles.map((s) => {
              const index = previewStyles.indexOf(s.id);
              const selected = index >= 0;
              const full = !selected && previewStyles.length >= PREVIEW_STYLE_COUNT;
              return (
                <ThumbTile
                  key={s.id}
                  src={s.previewImage}
                  alt={s.previewImage ? `${s.name} — example` : s.name}
                  label={s.name}
                  meta={s.category}
                  selected={selected}
                  aria-disabled={full || undefined}
                  className={cn(full && "opacity-60")}
                  onClick={() => togglePreviewStyle(s.id)}
                  sizes="(min-width: 1024px) 180px, 45vw"
                  badge={
                    selected ? (
                      <span className="flex size-6 items-center justify-center rounded-full bg-brand text-[12px] font-bold text-white">{index + 1}</span>
                    ) : s.previewImage ? (
                      <span className="rounded-[6px] bg-overlay-chip px-1.5 py-0.5 text-[10px] font-semibold text-white">Example</span>
                    ) : undefined
                  }
                  placeholder={<StylePlaceholder style={s} />}
                />
              );
            })}
          </div>
        </fieldset>
      )}

      <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft aria-hidden="true" />
          Back
        </Button>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          {previewUsed && <p className="text-small text-muted">You&apos;ve already used your free preview.</p>}
          <Button variant="primary" size="lg" disabled={!ready} loading={busy} onClick={onContinue}>
            {previewUsed ? "Continue to packages" : "See my free previews"}
            <ArrowRight aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}
