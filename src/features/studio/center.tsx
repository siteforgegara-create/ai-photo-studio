"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ImageOff, Loader2, Minus, PanelRightOpen, Plus, RotateCcw, Sparkles } from "lucide-react";
import { cropPresets, formatToolPrice } from "@/config/edit-tools";
import { quoteEdit } from "@/config/packs";
import type { ShootPhoto, Variants } from "@/services";
import { BeforeAfter, ExampleBadge } from "@/components/before-after";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Chip } from "@/components/ui/chip";
import { StatusBadge } from "@/components/ui/status-badge";
import { CropEditor, type EditorPreset } from "@/features/editor/crop-editor";
import { DownloadMenu, type DownloadGuard } from "@/features/shoot-page/download-menu";
import { cn } from "@/lib/utils";
import { DEMO_EDITOR_IMAGE, demoPairFor, toolById } from "./demo";
import { CUSTOM_OPTION, useStudio } from "./store";

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.25;

export const editorPresets: EditorPreset[] = cropPresets.map((p) => ({ id: p.id, name: p.name }));

export type CenterMode =
  | { kind: "demo"; showToggle: boolean }
  | { kind: "real"; photo: ShootPhoto; after: ShootPhoto | null; canGenerate: boolean };

/**
 * Centre column (02-studio §1.2): title + demo checkbox, category chips,
 * Before/After (or Crop & Export), status row with Compare / zoom / Reset /
 * Download, and the bottom bar with variants and the main CTA.
 */
export function CenterPane({
  mode,
  compact = false,
  onGenerate,
  guard,
  onRecorded,
  onOpenPanel,
  credits,
}: {
  mode: CenterMode;
  /** Mobile: tighter layout, no category chips here (they live in the Options sheet). */
  compact?: boolean;
  onGenerate: () => void;
  guard: DownloadGuard;
  onRecorded: () => void;
  /** Tablet: opens the overlay drawer. */
  onOpenPanel?: () => void;
  credits: number;
}) {
  const s = useStudio();
  const tool = toolById(s.tool);
  const option = s.optionByTool[s.tool];
  const demo = mode.kind === "demo";
  const isCrop = s.tool === "crop";
  const quote = quoteEdit(s.tool, s.variants);

  const chips = tool.categories.length > 1 || !!tool.custom;

  return (
    <section aria-labelledby="studio-tool-title" className={cn("flex h-full min-h-0 flex-col gap-3", !compact && "rounded-[16px] border border-border bg-surface p-4 shadow-card md:p-5")}>
      {/* 1. Title */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 id="studio-tool-title" className={cn("text-text", compact ? "text-[22px] leading-7 font-extrabold" : "text-[24px] leading-8 font-extrabold")}>
            {tool.name}
          </h1>
          {!compact && <p className="mt-0.5 text-[14px] text-muted">{tool.subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {mode.kind === "demo" && !mode.showToggle && (
            <Link
              href="/shoot/new"
              className="inline-flex items-center gap-1.5 rounded-[10px] border border-border bg-surface-2 px-3 py-2 text-[13px] font-semibold text-text hover:border-brand"
            >
              Example photo · <span className="text-brand-text">Get your own headshots</span>
              <ArrowRight className="size-3.5 text-brand-text" aria-hidden="true" />
            </Link>
          )}
          {(mode.kind === "real" || (mode.kind === "demo" && mode.showToggle)) && (
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] border border-border bg-surface px-3 py-2 text-[13px] font-semibold text-text">
              <Checkbox checked={demo} onCheckedChange={(v) => s.patch({ showDemo: v === true })} />
              Show Demo Image
            </label>
          )}
          {onOpenPanel && (
            <Button variant="secondary" size="sm" onClick={onOpenPanel}>
              <PanelRightOpen aria-hidden="true" />
              Options & photos
            </Button>
          )}
        </div>
      </div>

      {/* 2. Category chips */}
      {!compact && chips && !isCrop && <CategoryChips />}

      {/* 3. Preview */}
      <div className={cn("relative flex items-center justify-center", compact ? "flex-none" : "min-h-0 flex-1")}>
        {isCrop ? (
          <CropEditor
            key={mode.kind === "real" ? (mode.after ?? mode.photo).id : "demo"}
            src={mode.kind === "real" ? (mode.after ?? mode.photo).url : DEMO_EDITOR_IMAGE}
            presets={editorPresets}
            fileBase={mode.kind === "real" ? `headshot-${(mode.after ?? mode.photo).id}` : "example-headshot"}
            guard={mode.kind === "real" ? guard : undefined}
            onDownloaded={mode.kind === "real" ? onRecorded : undefined}
            className="h-full w-full"
            stageClassName={compact ? "aspect-[4/5] flex-none" : undefined}
          />
        ) : (
          <PreviewImage mode={mode} compact={compact} />
        )}
      </div>

      {!isCrop && (
        <>
          {/* 4. Status row */}
          <StatusRow mode={mode} guard={guard} onRecorded={onRecorded} compact={compact} />
          {/* 5. Bottom bar */}
          <div className={cn("flex flex-wrap items-center gap-3", !compact && "border-t border-border pt-3")}>
            <VariantPicker value={s.variants} onChange={s.setVariants} disabled={demo} compact={compact} />
            <div className="ml-auto flex flex-col items-end gap-1">
              {demo ? (
                <Button variant="primary" size="lg" disabled className="min-w-56">
                  Generate — unavailable in demo
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="lg"
                  className="min-w-56"
                  onClick={onGenerate}
                  disabled={!mode.canGenerate || s.job.state === "generating" || s.job.state === "awaiting-confirmation"}
                  loading={s.job.state === "generating"}
                >
                  {s.job.state !== "generating" && <Sparkles aria-hidden="true" />}
                  Generate · {quote.credits} credits
                </Button>
              )}
              <p className="text-[12px] text-muted">
                {demo
                  ? "Prepared example · No AI request · No credits"
                  : `${formatToolPrice(tool.pricePerVariant)} per variant · ${credits} available · charged only after you confirm`}
              </p>
            </div>
          </div>
        </>
      )}
      <JobAlerts />
      {option === CUSTOM_OPTION && demo && !isCrop && <p className="text-[12px] text-muted">Custom options are generated for your own photos only.</p>}
    </section>
  );
}

export function CategoryChips({ className }: { className?: string }) {
  const s = useStudio();
  const tool = toolById(s.tool);
  return (
    <div role="group" aria-label={`${tool.name} categories`} className={cn("-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5", className)}>
      <Chip selected={s.category === "all"} onClick={() => s.setCategory("all")}>
        All
      </Chip>
      {tool.categories.length > 1 &&
        tool.categories.map((c) => (
          <Chip key={c.id} selected={s.category === c.id} onClick={() => s.setCategory(c.id)}>
            {c.name}
          </Chip>
        ))}
      {tool.custom && (
        <Chip selected={s.category === CUSTOM_OPTION} onClick={() => s.setCategory(CUSTOM_OPTION)}>
          Custom
        </Chip>
      )}
    </div>
  );
}

function PreviewImage({ mode, compact }: { mode: CenterMode; compact: boolean }) {
  const s = useStudio();
  // Desktop/tablet: fit the 4:5 frame into the available height. Mobile: full width.
  const frame = compact ? "relative aspect-[4/5] w-full" : "relative aspect-[4/5] h-full max-h-full w-auto max-w-full";
  const zoomed = s.view.zoom > 1.001;

  if (mode.kind === "demo") {
    const pair = demoPairFor(s.tool, s.optionByTool[s.tool]);
    if (!pair) {
      return (
        <div className={cn(frame, "flex flex-col items-center justify-center gap-2 rounded-[16px] border border-dashed border-border bg-surface-2 p-6 text-center")} role="status">
          <ImageOff className="size-7 text-muted" aria-hidden="true" />
          <p className="text-[15px] font-semibold text-text">Example not available yet</p>
          <p className="max-w-64 text-[13px] text-muted">We&apos;re preparing a demo for this option. Pick another one to see an example.</p>
        </div>
      );
    }
    return (
      <BeforeAfter
        key={`${pair.before}|${pair.after}`}
        before={pair.before}
        after={pair.after}
        alt={pair.alt}
        split={s.view.compare ? s.view.split : 0}
        onSplitChange={(split) => s.setView({ split })}
        zoom={s.view.zoom}
        pan={{ x: s.view.panX, y: s.view.panY }}
        onPanChange={({ x, y }) => s.setView({ panX: x, panY: y })}
        badge={<ExampleBadge label="Example · prepared in advance" />}
        caption={zoomed ? "Drag to move · use the handle to compare" : "Drag to compare"}
        sizes="(min-width: 1200px) 640px, 100vw"
        priority
        className={frame}
      />
    );
  }

  const before = mode.photo;
  const after = mode.after;
  if (!after) {
    return (
      <figure className={cn(frame, "overflow-hidden rounded-[16px] bg-surface-2")}>
        <div className="absolute inset-0" style={s.view.zoom !== 1 ? { transform: `scale(${s.view.zoom})` } : undefined}>
          <Image src={before.url} alt="Your photo — original" fill sizes="(min-width: 1200px) 640px, 100vw" className="object-cover" priority />
        </div>
        <span className="absolute top-3 left-3 rounded-[8px] bg-overlay-chip px-2.5 py-1 text-[12px] font-semibold text-white">Original</span>
        <figcaption className="sr-only">Your original photo. Pick an option and generate to compare.</figcaption>
      </figure>
    );
  }
  return (
    <BeforeAfter
      key={`${before.id}|${after.id}`}
      before={before.url}
      after={after.url}
      alt="Your photo: original and edited"
      beforeLabel="Original"
      afterLabel="Edited"
      split={s.view.compare ? s.view.split : 0}
      onSplitChange={(split) => s.setView({ split })}
      zoom={s.view.zoom}
      pan={{ x: s.view.panX, y: s.view.panY }}
      onPanChange={({ x, y }) => s.setView({ panX: x, panY: y })}
      caption={zoomed ? "Drag to move · use the handle to compare" : "Drag to compare"}
      sizes="(min-width: 1200px) 640px, 100vw"
      priority
      className={frame}
    />
  );
}

function StatusRow({ mode, guard, onRecorded, compact }: { mode: CenterMode; guard: DownloadGuard; onRecorded: () => void; compact: boolean }) {
  const s = useStudio();
  const z = s.view.zoom;
  const demo = mode.kind === "demo";
  const badge = demo ? (
    <StatusBadge tone="demo" dot>
      Demo mode · 0 credits
    </StatusBadge>
  ) : s.job.state === "generating" ? (
    <StatusBadge tone="info">
      <Loader2 className="animate-spin" aria-hidden="true" /> Generating
    </StatusBadge>
  ) : mode.after ? (
    <StatusBadge tone="success">Edited</StatusBadge>
  ) : (
    <StatusBadge tone="neutral">Original</StatusBadge>
  );
  const hint = demo
    ? "Choose a tool or option — the example updates instantly."
    : s.job.state === "generating"
      ? "Your edit is on its way — keep browsing, results appear in Edits."
      : mode.after
        ? "Drag to compare with the original."
        : "Pick an option, then generate.";

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2" aria-live="polite">
      {badge}
      {!compact && <span className="text-[13px] text-muted">{hint}</span>}
      <div className="ml-auto flex items-center gap-1.5">
        <Button
          variant="secondary"
          size="sm"
          aria-pressed={s.view.compare}
          onClick={() => s.setView({ compare: !s.view.compare })}
          disabled={!demo && !mode.after}
        >
          Compare
        </Button>
        <div className="inline-flex items-center rounded-[10px] border border-border bg-surface" role="group" aria-label="Zoom">
          <Button variant="ghost" size="icon-sm" aria-label="Zoom out" disabled={z <= ZOOM_MIN} onClick={() => s.setView({ zoom: Math.max(ZOOM_MIN, z - ZOOM_STEP) })}>
            <Minus aria-hidden="true" />
          </Button>
          <span className="w-12 text-center text-[13px] font-semibold tabular-nums text-text" aria-live="polite">
            {Math.round(z * 100)}%
          </span>
          <Button variant="ghost" size="icon-sm" aria-label="Zoom in" disabled={z >= ZOOM_MAX} onClick={() => s.setView({ zoom: Math.min(ZOOM_MAX, z + ZOOM_STEP) })}>
            <Plus aria-hidden="true" />
          </Button>
        </div>
        <Button variant="ghost" size="sm" onClick={s.resetView} aria-label="Reset view">
          <RotateCcw aria-hidden="true" />
          {!compact && "Reset view"}
        </Button>
        {mode.kind === "real" && <DownloadMenu photo={mode.after ?? mode.photo} guard={guard} onRecorded={onRecorded} align="end" />}
      </div>
    </div>
  );
}

function VariantPicker({ value, onChange, disabled, compact }: { value: Variants; onChange: (v: Variants) => void; disabled: boolean; compact: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {!compact && <span className="text-[13px] font-semibold text-muted">Variants</span>}
      <div role="radiogroup" aria-label="Number of variants" className="inline-flex rounded-[10px] border border-border bg-surface-2 p-[3px]">
        {([1, 2, 4] as Variants[]).map((v) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={value === v}
            aria-label={`${v} variant${v > 1 ? "s" : ""}`}
            disabled={disabled}
            onClick={() => onChange(v)}
            className={cn("h-9 min-w-10 rounded-[8px] px-3 text-[14px] font-semibold disabled:opacity-50", value === v ? "bg-surface text-text shadow-card ring-1 ring-border" : "text-muted hover:text-text")}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}

function JobAlerts() {
  const job = useStudio((s) => s.job);
  const patch = useStudio((s) => s.patch);
  if (job.state === "insufficient-credits") {
    return (
      <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[color-mix(in_srgb,var(--danger)_35%,var(--border))] bg-surface px-4 py-3">
        <p className="text-[14px] font-medium text-danger-text">
          Not enough credits. This edit needs {job.needed}, you have {job.have}.
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => patch({ job: { state: "idle" } })}>
            Dismiss
          </Button>
          <Button asChild variant="primary" size="sm">
            <Link href="/pricing#credits">Buy credits</Link>
          </Button>
        </div>
      </div>
    );
  }
  if (job.state === "failed") {
    return (
      <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[color-mix(in_srgb,var(--danger)_35%,var(--border))] bg-surface px-4 py-3">
        <p className="text-[14px] font-medium text-danger-text">{job.error ?? "We couldn't complete this edit. Your credits were returned."}</p>
        <Button variant="secondary" size="sm" onClick={() => patch({ job: { state: "idle" } })}>
          Try again
        </Button>
      </div>
    );
  }
  return null;
}
