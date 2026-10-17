"use client";

import * as React from "react";
import Image from "next/image";
import { ArrowRight, CircleAlert } from "lucide-react";
import { getStyle } from "@/config/styles";
import { shootsService, type Preview, type Shoot } from "@/services";
import { Button } from "@/components/ui/button";
import { Lightbox } from "@/components/ui/lightbox";
import { Watermark } from "@/components/ui/watermark";

/** Step 3 — Free preview (06-shoot-flow §1). No percentages, no timers. */
export function PreviewStep({ shootId, onRetrySelfies, onContinue, onFailed }: { shootId: string; onRetrySelfies: () => void; onContinue: () => void; onFailed: () => void }) {
  const [shoot, setShoot] = React.useState<Shoot | null>(null);
  const [previews, setPreviews] = React.useState<Preview[]>([]);
  const [open, setOpen] = React.useState<number | null>(null);
  const failed = shoot?.status === "draft";

  React.useEffect(() => {
    const off = shootsService.subscribe(shootId, ({ shoot: s, previews: p }) => {
      setShoot(s);
      if (p) setPreviews(p);
    });
    return off;
  }, [shootId]);

  const ready = shoot?.status === "preview_ready" && previews.length > 0;

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-h1 text-text">{ready ? "Your free previews" : failed ? "We couldn't create your previews" : "Creating your previews…"}</h1>
        <p className="mt-2 text-[17px] leading-7 text-muted" aria-live="polite">
          {ready
            ? "Watermarked 512 px previews in two styles. Your full set comes without the watermark."
            : failed
              ? "Something went wrong on our side. Your free preview wasn't used — you can try again." // TODO(owner): confirm copy
              : "This usually takes a few minutes. We'll also email you."}
        </p>
      </header>

      {failed ? (
        <div className="flex flex-col items-start gap-4 rounded-[16px] border border-border bg-surface p-6 shadow-card">
          <CircleAlert className="size-6 text-danger-text" aria-hidden="true" />
          <Button variant="primary" onClick={onFailed}>
            Try again
          </Button>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-busy={!ready}>
          {(ready ? previews : Array.from({ length: 4 })).map((p, i) => (
            <li key={ready ? (p as Preview).id : i}>
              {ready ? (
                <button
                  type="button"
                  onClick={() => setOpen(i)}
                  className="group relative block aspect-[4/5] w-full overflow-hidden rounded-[12px] border border-border bg-surface-2 animate-in fade-in-0 slide-in-from-bottom-1 duration-200"
                  aria-label={`Open preview ${i + 1} — ${getStyle((p as Preview).styleId)?.name ?? ""}`}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  <Image src={(p as Preview).url} alt="" fill sizes="(min-width: 1024px) 280px, 45vw" className="object-cover" draggable={false} />
                  <Watermark />
                  <span className="absolute bottom-2 left-2 rounded-[6px] bg-overlay-chip px-2 py-0.5 text-[12px] font-semibold text-white">
                    {getStyle((p as Preview).styleId)?.name}
                  </span>
                </button>
              ) : (
                <div className="skeleton aspect-[4/5] w-full rounded-[12px]" aria-hidden="true" />
              )}
            </li>
          ))}
        </ul>
      )}

      {ready && (
        <>
          <p className="rounded-[12px] bg-surface-2 px-4 py-3 text-[14px] font-medium text-text">
            Full set: up to 100 photos · 4K · no watermark · every photo checked for likeness
          </p>
          <div className="flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-xl">
              <button type="button" onClick={onRetrySelfies} className="text-[14px] font-semibold text-brand-text underline-offset-2 hover:underline">
                Not quite you? Try different selfies
              </button>
              <p className="mt-1 text-small text-muted">
                Your free preview has been used, but packages are fully refundable until your first full-size download.
              </p>
            </div>
            <Button variant="primary" size="lg" onClick={onContinue}>
              Choose a package
              <ArrowRight aria-hidden="true" />
            </Button>
          </div>
        </>
      )}

      <Lightbox
        items={previews.map((p) => ({ id: p.id, src: p.url, alt: `Preview — ${getStyle(p.styleId)?.name ?? p.styleId}` }))}
        index={open}
        onIndexChange={setOpen}
        overlay={<Watermark />}
        protect
      />
    </div>
  );
}
