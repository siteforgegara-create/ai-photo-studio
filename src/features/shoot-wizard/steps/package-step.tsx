"use client";

import * as React from "react";
import { ArrowLeft, ArrowRight, Check, ShieldCheck } from "lucide-react";
import { getShootPack, shootPacks } from "@/config/packs";
import { getStyle, shootStyles } from "@/config/styles";
import { Button } from "@/components/ui/button";
import { PackCard } from "@/components/ui/pack-card";
import { ThumbTile } from "@/components/ui/thumb-tile";
import { cn } from "@/lib/utils";
import { normalizeStyles, styleLimit, useWizard } from "../store";

const GUARANTEE = "Full refund until your first download.";

/** Step 4 — Package and styles (06-shoot-flow §1). */
export function PackageStep({ busy, error, onBack, onCheckout }: { busy: boolean; error: string | null; onBack: () => void; onCheckout: () => void }) {
  const { pack, setPack, styles, toggleStyle, previewStyles, patch } = useWizard();
  const selectedPack = getShootPack(pack);
  const limit = styleLimit(pack);

  // Preview styles are pre-selected; Executive = all styles.
  React.useEffect(() => {
    const next = normalizeStyles(pack, styles, previewStyles);
    if (next.join() !== styles.join()) patch({ styles: next });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pack]);

  const complete = limit === "all" || styles.length === limit;
  const groupLabel = React.useId();

  return (
    <div className="flex flex-col gap-10">
      <header>
        <h1 className="text-h1 text-text">Choose your package</h1>
        <p className="mt-2 text-[17px] leading-7 text-muted">One-time payment. 4K, commercial license and likeness check on every plan.</p>
      </header>

      <div role="radiogroup" aria-labelledby={groupLabel} className="grid gap-4 md:grid-cols-3">
        <span id={groupLabel} className="sr-only">
          Package
        </span>
        {shootPacks.map((p) => {
          const selected = p.id === pack;
          return (
            <div
              key={p.id}
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => setPack(p.id)}
              onKeyDown={(e) => {
                const i = shootPacks.findIndex((x) => x.id === pack);
                if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                  e.preventDefault();
                  setPack(shootPacks[(i + 1) % shootPacks.length]!.id);
                } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                  e.preventDefault();
                  setPack(shootPacks[(i - 1 + shootPacks.length) % shootPacks.length]!.id);
                } else if (e.key === " " || e.key === "Enter") {
                  e.preventDefault();
                  setPack(p.id);
                }
              }}
              className="cursor-pointer rounded-[16px] focus-visible:outline-2"
              aria-label={`${p.name}, $${p.priceUsd}`}
            >
              <PackCard
                pack={p}
                compact
                showOverline={false}
                badge={p.popular ? "MOST POPULAR" : undefined}
                selected={selected}
                className="h-full"
                action={
                  <span
                    className={cn(
                      "flex h-10 w-full items-center justify-center gap-2 rounded-[10px] border text-[14px] font-semibold",
                      selected ? "border-brand bg-brand-soft text-brand-text" : "border-border text-text",
                    )}
                    aria-hidden="true"
                  >
                    {selected && <Check className="size-4" strokeWidth={3} />}
                    {selected ? "Selected" : `Select ${p.name}`}
                  </span>
                }
              />
            </div>
          );
        })}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <section aria-labelledby="styles-title">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="styles-title" className="text-h3 text-text">
              Styles
            </h2>
            {limit !== "all" && (
              <p className="text-[14px] font-semibold text-muted" aria-live="polite">
                {styles.length} of {limit} selected
              </p>
            )}
          </div>
          {limit === "all" ? (
            <p className="mt-2 rounded-[12px] bg-success-soft px-4 py-3 text-[14px] font-medium text-success-text">
              Executive includes all {shootStyles.length} styles — nothing to choose.
            </p>
          ) : (
            <>
              <p className="mt-1 text-body text-muted">Pick {limit} styles. Your preview styles are already selected.</p>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {shootStyles.map((s) => {
                  const selected = styles.includes(s.id);
                  const full = !selected && styles.length >= limit;
                  return (
                    <ThumbTile
                      key={s.id}
                      src={s.previewImage}
                      alt={s.previewImage ? `${s.name} — example` : s.name}
                      label={s.name}
                      meta={previewStyles.includes(s.id) ? "Preview" : s.category}
                      selected={selected}
                      aria-disabled={full || undefined}
                      className={cn(full && "opacity-60")}
                      onClick={() => toggleStyle(s.id)}
                      sizes="(min-width: 1024px) 180px, 45vw"
                      placeholder={
                        <>
                          <span className="font-semibold text-text">{s.name}</span>
                          <span>Example coming soon</span>
                        </>
                      }
                    />
                  );
                })}
              </div>
            </>
          )}
        </section>

        <aside
          aria-label="Order summary"
          className="sticky bottom-0 z-20 -mx-4 border-t border-border bg-surface px-4 pt-4 pb-[max(16px,env(safe-area-inset-bottom))] shadow-pop md:-mx-6 md:px-6 lg:top-[calc(var(--header-h)+24px)] lg:bottom-auto lg:mx-0 lg:self-start lg:rounded-[16px] lg:border lg:p-6 lg:shadow-card"
        >
          <h2 className="text-overline text-muted max-lg:sr-only">Summary</h2>
          <p className="flex items-baseline justify-between gap-3 text-[14px] lg:hidden">
            <span className="font-semibold text-text">
              {selectedPack.name} · {limit === "all" ? "All styles" : `${styles.length} of ${limit} styles`}
            </span>
            <span className="text-[20px] font-extrabold text-text">${selectedPack.priceUsd}</span>
          </p>
          <dl className="mt-3 flex flex-col gap-2 text-[14px] max-lg:hidden">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Package</dt>
              <dd className="font-semibold text-text">{selectedPack.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Styles</dt>
              <dd className="text-right font-semibold text-text">
                {limit === "all" ? "All styles" : `${styles.length} of ${limit}`}
                <span className="hidden text-[12px] font-medium text-muted lg:block">
                  {limit !== "all" && styles.map((id) => getStyle(id)?.name).join(", ")}
                </span>
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-t border-border pt-2">
              <dt className="text-muted">Total</dt>
              <dd className="text-[24px] leading-8 font-extrabold text-text">${selectedPack.priceUsd}</dd>
            </div>
          </dl>
          <p className="mt-2 flex items-start gap-2 text-small text-muted lg:mt-3">
            <ShieldCheck className="mt-px size-4 shrink-0 text-success" aria-hidden="true" />
            {GUARANTEE}
          </p>
          {error && (
            <p role="alert" className="mt-3 text-[13px] font-medium text-danger-text">
              {error}
            </p>
          )}
          <Button variant="primary" size="lg" className="mt-3 w-full lg:mt-4" disabled={!complete} loading={busy} onClick={onCheckout}>
            Continue to secure checkout
            <ArrowRight aria-hidden="true" />
          </Button>
          {!complete && typeof limit === "number" && (
            <p className="mt-2 text-center text-small text-muted">
              Select {limit - styles.length} more style{limit - styles.length === 1 ? "" : "s"}
            </p>
          )}
        </aside>
      </div>

      <div>
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft aria-hidden="true" />
          Back
        </Button>
      </div>
    </div>
  );
}
