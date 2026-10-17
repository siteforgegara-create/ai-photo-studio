"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Download, Eraser, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { BeforeAfter } from "@/components/before-after";
import { Button } from "@/components/ui/button";
import { Dropzone } from "@/components/ui/dropzone";
import { cn } from "@/lib/utils";
import type { BackgroundChoice } from "./composite";
import { BG_MODEL } from "./model";
import { useBackgroundRemover } from "./use-bg-remover";

const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif";

const choices: { id: BackgroundChoice["kind"]; label: string }[] = [
  { id: "transparent", label: "Transparent" },
  { id: "white", label: "White" },
  { id: "color", label: "Color" },
  { id: "blur", label: "Blur original" },
];

const mb = (bytes: number) => (bytes / (1024 * 1024)).toFixed(1);

/** /tools/background-remover workspace (03-pages §4.1). The photo never leaves the browser. */
export function BackgroundRemover() {
  const r = useBackgroundRemover();
  const [color, setColor] = React.useState("#2f6fde");
  const busy = r.status.kind === "model" || r.status.kind === "processing";
  const statusRef = React.useRef<HTMLDivElement>(null);

  const pick = (kind: BackgroundChoice["kind"]) => r.setBackground(kind === "color" ? { kind, color } : ({ kind } as BackgroundChoice));

  if (!r.source) {
    return (
      <div className="flex flex-col gap-3">
        <Dropzone
          title="Drop a photo here or click to upload"
          hint="JPEG, PNG, WebP or HEIC · up to 15 MB · works best with photos of people"
          accept={ACCEPT}
          multiple={false}
          icon={<Eraser />}
          onFiles={([file]) => file && void r.open(file)}
          className="min-h-72"
        />
        <PrivacyNote />
        {r.status.kind === "error" && (
          <p role="alert" className="text-[14px] font-medium text-danger-text">
            {r.status.message}
          </p>
        )}
      </div>
    );
  }

  const aspect = r.source.canvas.width / r.source.canvas.height;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex min-w-0 flex-col items-center gap-3 rounded-[16px] border border-border bg-surface p-3 shadow-card md:p-4">
        <div className="relative max-w-full" style={{ aspectRatio: String(aspect), width: `min(100%, 640px, calc(70dvh * ${aspect.toFixed(4)}))` }}>
          {r.ready && r.resultUrl ? (
            <BeforeAfter
              key={r.resultUrl}
              before={r.source.url}
              after={r.resultUrl}
              alt="Your photo before and after removing the background"
              beforeLabel="Original"
              afterLabel="Result"
              fit="contain"
              afterLayerClassName={r.background.kind === "transparent" ? "bg-checker" : undefined}
              sizes="(min-width: 1024px) 640px, 100vw"
              className="h-full"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- local blob: preview
            <img src={r.source.url} alt="Your photo" className="h-full w-full rounded-[16px] bg-surface-2 object-contain" />
          )}
          {busy && (
            <div className="absolute inset-0 flex items-center justify-center rounded-[16px] bg-scrim p-6">
              <div ref={statusRef} role="status" aria-live="polite" className="w-full max-w-72 rounded-[14px] bg-surface p-4 text-center shadow-pop">
                <Loader2 className="mx-auto size-6 animate-spin text-brand" aria-hidden="true" />
                {r.status.kind === "model" ? (
                  <>
                    <p className="mt-2 text-[14px] font-semibold text-text">Loading the AI model (one-time, ~{BG_MODEL.approxMb} MB)…</p>
                    {r.status.progress.total ? (
                      <>
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
                          <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${Math.min(100, (r.status.progress.loaded / r.status.progress.total) * 100)}%` }} />
                        </div>
                        <p className="mt-1.5 text-[12px] text-muted tabular-nums">
                          {mb(r.status.progress.loaded)} of {mb(r.status.progress.total)} MB
                        </p>
                      </>
                    ) : null}
                  </>
                ) : (
                  <p className="mt-2 text-[14px] font-semibold text-text">Removing the background…</p>
                )}
              </div>
            </div>
          )}
        </div>
        {r.status.kind === "error" && (
          <p role="alert" className="text-[14px] font-medium text-danger-text">
            {r.status.message}
          </p>
        )}
      </div>

      <aside aria-label="Result options" className="flex flex-col gap-5 rounded-[16px] border border-border bg-surface p-5 shadow-card">
        <fieldset disabled={!r.ready}>
          <legend className="text-[15px] font-bold text-text">Background</legend>
          <div role="radiogroup" aria-label="Background" className="mt-3 grid grid-cols-2 gap-2">
            {choices.map((c) => {
              const selected = r.background.kind === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => pick(c.id)}
                  className={cn(
                    "flex h-11 items-center justify-center gap-2 rounded-[10px] border px-3 text-[14px] font-semibold transition-colors duration-[120ms] disabled:opacity-50",
                    selected ? "border-brand bg-brand-soft text-brand-text" : "border-border bg-surface text-text hover:bg-surface-2",
                  )}
                >
                  <Swatch kind={c.id} color={color} />
                  {c.label}
                </button>
              );
            })}
          </div>
          {r.background.kind === "color" && (
            <label className="mt-3 flex items-center justify-between gap-3 rounded-[10px] border border-border bg-surface-2 px-3 py-2 text-[14px] font-medium text-text">
              Pick a color
              <input
                type="color"
                value={color}
                onChange={(e) => {
                  setColor(e.target.value);
                  r.setBackground({ kind: "color", color: e.target.value });
                }}
                className="h-8 w-12 cursor-pointer rounded-[6px] border border-border bg-surface"
              />
            </label>
          )}
        </fieldset>

        <div className="flex flex-col gap-2">
          <Button variant="primary" size="lg" disabled={!r.ready} onClick={() => void r.download("png")}>
            <Download aria-hidden="true" />
            Download PNG
          </Button>
          <Button variant="secondary" size="lg" disabled={!r.ready} onClick={() => void r.download("jpg")}>
            Download JPG
          </Button>
          <p className="text-[12px] leading-[18px] text-muted">PNG keeps the transparent background. JPG is saved on white when Transparent is selected.</p>
        </div>

        <Button variant="ghost" onClick={r.reset} disabled={busy}>
          <RefreshCw aria-hidden="true" />
          Try another photo
        </Button>

        <PrivacyNote />

        {r.ready && (
          <Link
            href="/shoot/new"
            className="group flex items-center justify-between gap-3 rounded-[12px] border border-[color-mix(in_srgb,var(--brand)_25%,var(--border))] bg-brand-soft p-4 text-[14px] font-semibold text-text"
          >
            <span>
              Want a studio-quality headshot? <span className="text-brand-text">Get free previews</span>
            </span>
            <ArrowRight className="size-4 shrink-0 text-brand-text transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        )}
      </aside>
    </div>
  );
}

function Swatch({ kind, color }: { kind: BackgroundChoice["kind"]; color: string }) {
  const base = "size-4 shrink-0 rounded-[4px] border border-border";
  if (kind === "transparent") return <span className={cn(base, "bg-checker [background-size:8px_8px]")} aria-hidden="true" />;
  if (kind === "white") return <span className={cn(base, "bg-white")} aria-hidden="true" />;
  if (kind === "color") return <span className={base} style={{ background: color }} aria-hidden="true" />;
  return <span className={cn(base, "bg-[linear-gradient(135deg,#9aa7b8,#d8dee6)] blur-[1px]")} aria-hidden="true" />;
}

function PrivacyNote() {
  return (
    <p className="flex items-start gap-2 text-[13px] leading-[18px] text-muted">
      <ShieldCheck className="mt-px size-4 shrink-0 text-success-text" aria-hidden="true" />
      Processed on this device. Your photo is never uploaded.
    </p>
  );
}
