"use client";

import * as React from "react";
import { Download, FlipHorizontal2, FlipVertical2, Redo2, RotateCcw, RotateCw, Undo2 } from "lucide-react";
import { saveBlob } from "@/features/crop/render";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { cn } from "@/lib/utils";
import { moveCrop, presetAspect, resizeCrop, zeroAdjust, type Adjustments, type Corner, type CropPresetId, type EditorState } from "./engine";
import { exportImage } from "./export";
import { drawFrame, type ExportFormat } from "./render";
import { useBitmap, useEditor, type EditorApi } from "./use-editor";

export type EditorPreset = { id: CropPresetId; name: string };
type Panel = "crop" | "rotate" | "flip" | "adjust";

const panels: { id: Panel; label: string }[] = [
  { id: "crop", label: "Crop" },
  { id: "rotate", label: "Rotate" },
  { id: "flip", label: "Flip" },
  { id: "adjust", label: "Adjust" },
];

const sliders: { id: keyof Adjustments; label: string }[] = [
  { id: "brightness", label: "Brightness" },
  { id: "contrast", label: "Contrast" },
  { id: "saturation", label: "Saturation" },
  { id: "warmth", label: "Warmth" },
];

/**
 * Crop & Export — local, free, private (02-studio §3.1). Shared by Studio and
 * /tools/photo-editor. `guard` runs before a download (refund confirmation).
 */
export function CropEditor({
  src,
  presets,
  fileBase,
  guard,
  onDownloaded,
  className,
  stageClassName,
}: {
  src: string;
  presets: readonly EditorPreset[];
  fileBase: string;
  guard?: (run: () => Promise<void>) => void;
  onDownloaded?: () => void;
  className?: string;
  stageClassName?: string;
}) {
  const { bitmap, error } = useBitmap(src);
  const editor = useEditor(bitmap);
  const [panel, setPanel] = React.useState<Panel>("crop");
  const [format, setFormat] = React.useState<ExportFormat>("jpeg");
  const [busy, setBusy] = React.useState(false);
  const s = editor.state;

  // Ctrl+Z / Ctrl+Shift+Z (Cmd on macOS).
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "z") return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" && (t as HTMLInputElement).type === "text")) return;
      e.preventDefault();
      if (e.shiftKey) editor.redo();
      else editor.undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editor]);

  const download = async () => {
    if (!bitmap) return;
    setBusy(true);
    try {
      const blob = await exportImage(bitmap, editor.committed, format);
      saveBlob(blob, `${fileBase}.${format === "png" ? "png" : "jpg"}`);
      onDownloaded?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn("flex min-h-0 flex-col gap-3", className)}>
      {/* Panel switcher + undo/redo */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="tablist" aria-label="Crop and export tools" className="flex gap-2 overflow-x-auto">
          {panels.map((p) => (
            <Chip key={p.id} role="tab" aria-selected={panel === p.id} selected={panel === p.id} onClick={() => setPanel(p.id)}>
              {p.label}
            </Chip>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={editor.undo} disabled={!editor.canUndo} aria-label="Undo (Ctrl+Z)">
            <Undo2 aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={editor.redo} disabled={!editor.canRedo} aria-label="Redo (Ctrl+Shift+Z)">
            <Redo2 aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="sm" onClick={editor.reset}>
            Reset
          </Button>
        </div>
      </div>

      {/* Stage */}
      <div className={cn("relative min-h-0 flex-1 overflow-hidden rounded-[16px] bg-surface-2", stageClassName)}>
        {error ? (
          <p className="absolute inset-0 flex items-center justify-center text-small text-muted">{error}</p>
        ) : bitmap ? (
          <Stage bitmap={bitmap} editor={editor} />
        ) : (
          <div className="skeleton absolute inset-0" aria-hidden="true" />
        )}
      </div>

      {/* Controls for the active panel */}
      <div role="tabpanel" aria-label={panels.find((p) => p.id === panel)?.label} className="min-h-12">
        {panel === "crop" && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {presets.map((p) => (
              <Chip key={p.id} selected={s.preset === p.id} onClick={() => editor.setPreset(p.id)}>
                {p.name}
              </Chip>
            ))}
          </div>
        )}
        {panel === "rotate" && (
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" size="sm" onClick={() => editor.rotate90(-1)}>
              <RotateCcw aria-hidden="true" />
              Rotate left
            </Button>
            <Button variant="secondary" size="sm" onClick={() => editor.rotate90(1)}>
              <RotateCw aria-hidden="true" />
              Rotate right
            </Button>
            <RangeField
              label="Straighten"
              min={-45}
              max={45}
              value={s.straighten}
              suffix="°"
              onLive={(v) => editor.preview({ ...editor.committed, straighten: v })}
              onCommit={(v) => editor.commit({ ...editor.committed, straighten: v })}
            />
          </div>
        )}
        {panel === "flip" && (
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" size="sm" aria-pressed={s.flipH} onClick={() => editor.commit({ ...editor.committed, flipH: !editor.committed.flipH })}>
              <FlipHorizontal2 aria-hidden="true" />
              Flip horizontal
            </Button>
            <Button variant="secondary" size="sm" aria-pressed={s.flipV} onClick={() => editor.commit({ ...editor.committed, flipV: !editor.committed.flipV })}>
              <FlipVertical2 aria-hidden="true" />
              Flip vertical
            </Button>
          </div>
        )}
        {panel === "adjust" && (
          <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {sliders.map((sl) => (
              <RangeField
                key={sl.id}
                label={sl.label}
                min={-100}
                max={100}
                value={s.adjust[sl.id]}
                onLive={(v) => editor.preview({ ...editor.committed, adjust: { ...editor.committed.adjust, [sl.id]: v } })}
                onCommit={(v) => editor.commit({ ...editor.committed, adjust: { ...editor.committed.adjust, [sl.id]: v } })}
              />
            ))}
            <Button variant="ghost" size="sm" className="justify-self-start" onClick={() => editor.commit({ ...editor.committed, adjust: zeroAdjust })}>
              Reset adjustments
            </Button>
          </div>
        )}
      </div>

      {/* Footer: format + Download (free) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <div role="radiogroup" aria-label="Format" className="inline-flex rounded-[10px] border border-border bg-surface-2 p-[3px]">
          {(["jpeg", "png"] as ExportFormat[]).map((f) => (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={format === f}
              onClick={() => setFormat(f)}
              className={cn("h-8 rounded-[8px] px-4 text-[13px] font-semibold", format === f ? "bg-surface text-text shadow-card ring-1 ring-border" : "text-muted hover:text-text")}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
        <Button variant="primary" size="lg" loading={busy} disabled={!bitmap} onClick={() => (guard ? guard(download) : void download())}>
          {!busy && <Download aria-hidden="true" />}
          Download
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[12px]">Free</span>
        </Button>
      </div>
    </div>
  );
}

function RangeField({ label, min, max, value, suffix = "", onLive, onCommit }: { label: string; min: number; max: number; value: number; suffix?: string; onLive: (v: number) => void; onCommit: (v: number) => void }) {
  const id = React.useId();
  const [v, setV] = React.useState(value);
  const [dragging, setDragging] = React.useState(false);
  const shown = dragging ? v : value;
  return (
    <div className="flex min-w-56 flex-1 items-center gap-3">
      <label htmlFor={id} className="w-24 shrink-0 text-[13px] font-semibold text-text">
        {label}
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={1}
        value={shown}
        onPointerDown={() => {
          setV(value);
          setDragging(true);
        }}
        onChange={(e) => {
          const n = Number(e.target.value);
          setV(n);
          onLive(n);
          if (!dragging) onCommit(n); // keyboard changes commit immediately
        }}
        onPointerUp={(e) => {
          setDragging(false);
          onCommit(Number((e.target as HTMLInputElement).value));
        }}
        className="h-2 flex-1 cursor-pointer accent-[var(--brand)]"
      />
      <output htmlFor={id} className="w-12 text-right text-[13px] tabular-nums text-muted">
        {shown > 0 ? "+" : ""}
        {shown}
        {suffix}
      </output>
    </div>
  );
}

/** Live preview (canvas) + crop box overlay. Pointer, touch and keyboard. */
function Stage({ bitmap, editor }: { bitmap: ImageBitmap; editor: EditorApi }) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [box, setBox] = React.useState({ w: 0, h: 0 });
  const s = editor.state;
  const frame = editor.frame;
  const aspect = presetAspect(s.preset);

  // Fit the frame into the stage.
  React.useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry!.contentRect;
      const k = Math.min(width / frame.width, height / frame.height);
      setBox({ w: Math.floor(frame.width * k), h: Math.floor(frame.height * k) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [frame.width, frame.height]);

  // Draw the transformed frame (no crop) at display resolution.
  React.useEffect(() => {
    const c = canvasRef.current;
    if (!c || !box.w) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.round(box.w * dpr);
    c.height = Math.round(box.h * dpr);
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    drawFrame(ctx, bitmap, bitmap.width, bitmap.height, s, c.width, c.height);
  }, [bitmap, s, box.w, box.h]);

  const drag = React.useRef<{ kind: "move" | Corner; x: number; y: number; start: EditorState } | null>(null);

  const onDown = (e: React.PointerEvent<HTMLElement>) => {
    const kind = (e.currentTarget.dataset.kind ?? "move") as "move" | Corner;
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { kind, x: e.clientX, y: e.clientY, start: editor.committed };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || !box.w) return;
    const dx = (e.clientX - d.x) / box.w;
    const dy = (e.clientY - d.y) / box.h;
    const crop = d.kind === "move" ? moveCrop(d.start.crop, dx, dy) : resizeCrop(d.start.crop, d.kind, dx, dy, aspect, frame.width, frame.height);
    editor.preview({ ...d.start, crop });
  };
  const onUp = () => {
    if (!drag.current) return;
    drag.current = null;
    editor.commit(editor.state);
  };
  const onKey = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 0.05 : 0.01;
    const map: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const m = map[e.key];
    if (!m) return;
    e.preventDefault();
    editor.commit({ ...editor.committed, crop: moveCrop(editor.committed.crop, m[0], m[1]) });
  };

  const c = s.crop;
  const round = s.preset === "circle";
  return (
    <div ref={wrapRef} className="absolute inset-3 flex items-center justify-center select-none md:inset-4">
      <div className="relative" style={{ width: box.w, height: box.h }}>
        <canvas ref={canvasRef} className="block h-full w-full" aria-label="Photo being edited" role="img" />
        <div
          role="group"
          tabIndex={0}
          aria-label={`Crop area, ${Math.round(c.w * 100)}% × ${Math.round(c.h * 100)}%. Use arrow keys to move it.`}
          onKeyDown={onKey}
          data-kind="move"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          className={cn("absolute cursor-move touch-none border-2 border-white shadow-[0_0_0_9999px_var(--scrim)] outline-offset-4", round && "rounded-full")}
          style={{ left: `${c.x * 100}%`, top: `${c.y * 100}%`, width: `${c.w * 100}%`, height: `${c.h * 100}%` }}
        >
          {!round && (
            <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,transparent_33.2%,rgba(255,255,255,.45)_33.3%,transparent_33.5%,transparent_66.5%,rgba(255,255,255,.45)_66.6%,transparent_66.8%),linear-gradient(to_bottom,transparent_33.2%,rgba(255,255,255,.45)_33.3%,transparent_33.5%,transparent_66.5%,rgba(255,255,255,.45)_66.6%,transparent_66.8%)]" />
          )}
          {(["nw", "ne", "sw", "se"] as Corner[]).map((corner) => (
            <span
              key={corner}
              aria-hidden="true"
              data-kind={corner}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              className={cn(
                "absolute flex size-11 touch-none items-center justify-center",
                corner.includes("n") ? "-top-[22px]" : "-bottom-[22px]",
                corner.includes("w") ? "-left-[22px]" : "-right-[22px]",
                corner === "nw" || corner === "se" ? "cursor-nwse-resize" : "cursor-nesw-resize",
              )}
            >
              <span className="size-3.5 rounded-[3px] border-2 border-white bg-brand shadow" />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
