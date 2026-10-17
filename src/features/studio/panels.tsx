"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Download, ImageUp, Lightbulb, Loader2, Star, X } from "lucide-react";
import { getStyle } from "@/config/styles";
import { getShootPack } from "@/config/packs";
import type { EditOption } from "@/config/edit-tools";
import type { Shoot, ShootPhoto } from "@/services";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { ThumbTile } from "@/components/ui/thumb-tile";
import { cn, formatDate } from "@/lib/utils";
import { demoThumbFor, toolById } from "./demo";
import { CUSTOM_OPTION, useStudio } from "./store";
import type { JobView } from "./use-generate";

/* ───────────────────────── Options ───────────────────────── */

export function visibleOptions(toolId: Parameters<typeof toolById>[0], category: string): EditOption[] {
  const tool = toolById(toolId);
  if (category === CUSTOM_OPTION) return [];
  const cats = category === "all" ? tool.categories : tool.categories.filter((c) => c.id === category);
  return cats.flatMap((c) => c.options);
}

/** Options tab: 2 columns of 4:5 tiles, `Custom` last, Tips at the bottom (02-studio §1.3). */
export function OptionsPanel({ demo, chips }: { demo: boolean; chips?: React.ReactNode }) {
  const { tool: toolId, category, optionByTool, setOption, customByTool, setCustom, toggles, setToggle } = useStudio();
  const tool = toolById(toolId);
  const selected = optionByTool[toolId];
  const custom = customByTool[toolId] ?? {};
  const options = visibleOptions(toolId, category);
  const showCustom = !!tool.custom && (category === "all" || category === CUSTOM_OPTION);
  const textId = React.useId();

  if (toolId === "crop") {
    return (
      <div className="p-4">
        <Heading title="Crop & Export" hint="Pick a shape below the photo, adjust, then download. Free and private." />
        <Tips tips={tool.tips} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {chips}
      <Heading title={headingFor(toolId)} hint={demo ? "Pick an option to preview an example instantly." : "Pick an option, then generate."} />
      <div className="grid grid-cols-2 gap-3">
        {options.map((o) => {
          const thumb = demoThumbFor(toolId, o.id);
          const isColor = o.kind === "color";
          return (
            <ThumbTile
              key={o.id}
              src={thumb}
              alt={thumb ? `${o.name} — example` : o.name}
              label={o.name}
              selected={selected === o.id}
              onClick={() => setOption(o.id)}
              sizes="140px"
              badge={tool.creative ? <span className="rounded-full bg-overlay-chip px-2 py-0.5 text-[11px] font-bold text-white">{tool.pricePerVariant} cr</span> : undefined}
              placeholder={
                // The name is already in the caption: a colour swatch for plain backdrops, otherwise just the tool icon.
                isColor || o.swatch ? (
                  <span
                    className="absolute inset-0 shadow-[inset_0_0_0_1px_var(--border)]"
                    style={{ background: isColor ? (custom.color ?? "#1f4e79") : o.swatch }}
                    aria-hidden="true"
                  />
                ) : (
                  <tool.icon className="size-8 text-muted" aria-hidden="true" />
                )
              }
            />
          );
        })}
        {showCustom && (
          <ThumbTile
            src={null}
            alt="Custom"
            label="Custom"
            selected={selected === CUSTOM_OPTION}
            onClick={() => setOption(CUSTOM_OPTION)}
            badge={tool.creative ? <span className="rounded-full bg-overlay-chip px-2 py-0.5 text-[11px] font-bold text-white">{tool.pricePerVariant} cr</span> : undefined}
            placeholder={
              <span className="flex size-10 items-center justify-center rounded-full border-2 border-dashed border-border text-[20px] text-muted" aria-hidden="true">
                +
              </span>
            }
          />
        )}
      </div>

      {/* Colour picker for Brand → Solid color */}
      {toolId === "background" && selected === "solid-color" && (
        <div className="flex items-center gap-3 rounded-[12px] border border-border bg-surface-2 p-3">
          <input id={`${textId}-color`} type="color" value={custom.color ?? "#1f4e79"} onChange={(e) => setCustom({ color: e.target.value })} className="size-10 cursor-pointer rounded-[8px] border border-border bg-transparent" />
          <Label htmlFor={`${textId}-color`} className="mb-0">
            Brand color <span className="font-normal text-muted">{custom.color ?? "#1f4e79"}</span>
          </Label>
        </div>
      )}

      {/* Retouch switches */}
      {tool.toggles && (
        <fieldset className="flex flex-col gap-2 rounded-[12px] border border-border bg-surface-2 p-3">
          <legend className="sr-only">Touch-ups</legend>
          {tool.toggles.map((t) => (
            <label key={t.id} className="flex cursor-pointer items-center gap-2.5 text-[14px] text-text">
              <Checkbox checked={!!toggles[t.id]} onCheckedChange={(v) => setToggle(t.id, v === true)} />
              {t.name}
            </label>
          ))}
        </fieldset>
      )}

      {/* Custom fields */}
      {selected === CUSTOM_OPTION && tool.custom?.type === "text" && (
        <div>
          <Label htmlFor={textId}>{tool.custom.label}</Label>
          <textarea
            id={textId}
            maxLength={tool.custom.maxLength}
            rows={4}
            value={custom.text ?? ""}
            onChange={(e) => setCustom({ text: e.target.value })}
            placeholder="e.g. soft grey studio backdrop with a gentle vignette"
            className="w-full resize-none rounded-[10px] border border-border bg-surface-2 px-3 py-2.5 text-[14px] text-text placeholder:text-muted focus-visible:border-brand"
            aria-describedby={`${textId}-count`}
            onFocus={keepInView}
          />
          <p id={`${textId}-count`} className="mt-1 text-right text-[12px] text-muted">
            {(custom.text ?? "").length} / {tool.custom.maxLength}
          </p>
        </div>
      )}
      {selected === CUSTOM_OPTION && tool.custom?.type === "scene" && <SceneUpload label={tool.custom.label} placementLabel={tool.custom.placementLabel} demo={demo} />}

      <Tips tips={tool.tips} />
    </div>
  );
}

function headingFor(toolId: string) {
  switch (toolId) {
    case "background":
      return "Choose a background";
    case "outfit":
      return "Choose an outfit";
    case "retouch":
      return "Choose a retouch level";
    case "relight":
      return "Choose the light";
    case "creative":
      return "Choose a creative style";
    case "place":
      return "Choose a scene";
    default:
      return "Options";
  }
}

/** Place Me Here → Custom: your own scene photo (kept locally until you generate) + placement text. */
function SceneUpload({ label, placementLabel, demo }: { label: string; placementLabel: string; demo: boolean }) {
  const custom = useStudio((s) => s.customByTool.place) ?? {};
  const setCustom = useStudio((s) => s.setCustom);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const id = React.useId();
  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="mb-1.5 text-[13px] font-semibold text-text">{label}</p>
        {custom.sceneUrl ? (
          <div className="relative aspect-[4/3] overflow-hidden rounded-[12px] border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
            <img src={custom.sceneUrl} alt="Your scene" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => {
                URL.revokeObjectURL(custom.sceneUrl!);
                setCustom({ sceneUrl: undefined, sceneUploadId: undefined });
              }}
              className="absolute top-2 right-2 flex size-8 items-center justify-center rounded-full bg-overlay-chip text-white"
              aria-label="Remove scene photo"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-[12px] border-2 border-dashed border-border bg-surface-2 text-[13px] text-muted hover:border-brand"
          >
            <ImageUp className="size-6" aria-hidden="true" />
            Upload a scene photo
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            // Mock: kept in the browser. B4 uploads it when you generate (sceneUploadId).
            setCustom({ sceneUrl: URL.createObjectURL(file), sceneUploadId: `local_${Date.now()}` });
          }}
        />
        {demo && <p className="mt-1 text-[12px] text-muted">In the demo your scene stays on this device.</p>}
      </div>
      <div>
        <Label htmlFor={id}>{placementLabel}</Label>
        <textarea
          id={id}
          rows={3}
          maxLength={300}
          value={custom.placement ?? ""}
          onChange={(e) => setCustom({ placement: e.target.value })}
          placeholder="e.g. standing at the podium, centre left"
          onFocus={keepInView}
          className="w-full resize-none rounded-[10px] border border-border bg-surface-2 px-3 py-2.5 text-[14px] text-text placeholder:text-muted focus-visible:border-brand"
        />
      </div>
    </div>
  );
}

function Heading({ title, hint }: { title: string; hint: string }) {
  return (
    <div>
      <h2 className="text-[17px] leading-6 font-bold text-text">{title}</h2>
      <p className="mt-0.5 text-[13px] leading-[18px] text-muted">{hint}</p>
    </div>
  );
}

function Tips({ tips }: { tips: string[] }) {
  if (!tips.length) return null;
  return (
    <aside className="rounded-[12px] border border-[color-mix(in_srgb,var(--brand)_20%,var(--border))] bg-brand-soft p-3.5" aria-label="Tips">
      <p className="flex items-center gap-1.5 text-[13px] font-semibold text-text">
        <Lightbulb className="size-4 text-brand" aria-hidden="true" />
        Tips for best results
      </p>
      <ul className="mt-1.5 flex flex-col gap-1 text-[13px] leading-[18px] text-muted">
        {tips.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </aside>
  );
}

/* ───────────────────────── Shoot ───────────────────────── */

/** Shoot tab: every photo of the current shoot; click picks another photo to edit. */
export function ShootPanel({
  shoot,
  shoots,
  photos,
  currentId,
  onPick,
  onSwitchShoot,
}: {
  shoot: Shoot | null;
  shoots: Shoot[];
  photos: ShootPhoto[];
  currentId?: string;
  onPick: (photo: ShootPhoto) => void;
  onSwitchShoot: (shootId: string) => void;
}) {
  const [favOnly, setFavOnly] = React.useState(false);
  if (!shoot) {
    return (
      <Empty title="No shoot yet" hint="Your own photos appear here after your first shoot.">
        <Link href="/shoot/new" className="inline-flex items-center gap-1 text-[14px] font-semibold text-brand-text hover:underline">
          Get your headshots <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </Empty>
    );
  }
  const list = photos.filter((p) => p.kind === "generated" && (!favOnly || p.isFavorite));
  return (
    <div className="flex flex-col gap-3 p-4">
      {shoots.length > 1 && (
        <div>
          <Label htmlFor="studio-shoot">Shoot</Label>
          <select
            id="studio-shoot"
            value={shoot.id}
            onChange={(e) => onSwitchShoot(e.target.value)}
            className="h-10 w-full rounded-[10px] border border-border bg-surface-2 px-3 text-[14px] text-text"
          >
            {shoots.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title ?? getShootPack(s.pack).name} · {formatDate(s.createdAt)}
              </option>
            ))}
          </select>
        </div>
      )}
      <label className="flex cursor-pointer items-center gap-2 text-[13px] font-semibold text-text">
        <Checkbox checked={favOnly} onCheckedChange={(v) => setFavOnly(v === true)} />
        <Star className="size-3.5" aria-hidden="true" /> Favorites only
      </label>
      <ul className="grid grid-cols-2 gap-3">
        {list.map((p) => (
          <li key={p.id}>
            <ThumbTile
              src={p.thumbUrl}
              alt={getStyle(p.styleId ?? "")?.name ?? "Headshot"}
              label={getStyle(p.styleId ?? "")?.name ?? "Headshot"}
              meta={p.isFavorite ? "★" : undefined}
              selected={p.id === currentId}
              onClick={() => onPick(p)}
              sizes="140px"
            />
          </li>
        ))}
      </ul>
      <Link href={`/shoot/${shoot.id}`} className="inline-flex items-center gap-1 self-start text-[14px] font-semibold text-brand-text hover:underline">
        Open shoot page <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </div>
  );
}

/* ───────────────────────── Edits ───────────────────────── */

/** Edits tab: results for the current photo, newest first (02-studio §1.3). */
export function EditsPanel({
  edits,
  jobs,
  selectedId,
  onSelect,
  onDownload,
  onFavorite,
  demo,
}: {
  edits: ShootPhoto[];
  jobs: JobView[];
  selectedId?: string;
  onSelect: (photo: ShootPhoto) => void;
  onDownload: (photo: ShootPhoto) => void;
  onFavorite: (photo: ShootPhoto) => void;
  demo: boolean;
}) {
  const pending = jobs.filter((j) => j.status === "queued" || j.status === "generating");
  const failed = jobs.filter((j) => j.status === "failed" || j.status === "blocked");
  if (demo) {
    return <Empty title="No edits in the demo" hint="Your own edits appear here, next to the photo they came from." />;
  }
  if (!edits.length && !pending.length && !failed.length) {
    return <Empty title="No edits yet" hint="Pick an option and generate." />;
  }
  return (
    <ul className="grid grid-cols-2 gap-3 p-4">
      {pending.flatMap((j) =>
        Array.from({ length: j.variants }).map((_, i) => (
          <li key={`${j.id}-${i}`} className="overflow-hidden rounded-[12px] border border-border bg-surface">
            <div className="skeleton aspect-[4/5]" aria-hidden="true" />
            <p className="flex items-center gap-1.5 px-2.5 py-2 text-[12px] font-semibold text-muted">
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> Generating
            </p>
          </li>
        )),
      )}
      {failed.map((j) => (
        <li key={j.id} className="col-span-2 rounded-[12px] border border-border bg-surface-2 p-3">
          <StatusBadge tone="danger">Failed</StatusBadge>
          <p className="mt-1.5 text-[13px] text-muted">{j.error ?? "We couldn't complete this edit. Your credits were returned."}</p>
        </li>
      ))}
      {edits.map((p, i) => (
        <li key={p.id} className="relative">
          <ThumbTile
            src={p.thumbUrl}
            alt={`Edit ${edits.length - i}`}
            label={`Edit ${edits.length - i}`}
            meta="Ready"
            selected={p.id === selectedId}
            onClick={() => onSelect(p)}
            sizes="140px"
          />
          <div className="absolute top-2 right-2 flex gap-1">
            <button type="button" onClick={() => onFavorite(p)} aria-pressed={p.isFavorite} aria-label={p.isFavorite ? "Remove from favorites" : "Add to favorites"} className="flex size-8 items-center justify-center rounded-full bg-overlay-chip text-white">
              <Star className={cn("size-4", p.isFavorite && "fill-brand-to text-brand-to")} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => onDownload(p)} aria-label="Download this edit" className="flex size-8 items-center justify-center rounded-full bg-overlay-chip text-white">
              <Download className="size-4" aria-hidden="true" />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Empty({ title, hint, children }: { title: string; hint: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-[12px] border border-dashed border-border bg-surface-2 text-muted" aria-hidden="true">
        <ImageUp className="size-5" />
      </span>
      <p className="text-[15px] font-semibold text-text">{title}</p>
      <p className="text-[13px] text-muted">{hint}</p>
      {children}
    </div>
  );
}

/** Mobile: once the on-screen keyboard has opened, scroll the focused Custom field back into view (02-studio §6). */
function keepInView(e: React.FocusEvent<HTMLElement>) {
  const el = e.currentTarget;
  window.setTimeout(() => el.scrollIntoView({ block: "center", behavior: "smooth" }), 300);
}
