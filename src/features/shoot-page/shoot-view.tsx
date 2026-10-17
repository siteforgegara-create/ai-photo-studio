"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, Download, Ellipsis, LayoutGrid, Grid3x3, Loader2, Pencil, ShieldCheck, Star, Trash2, Undo2 } from "lucide-react";
import { brand } from "@/config/brand";
import { getShootPack } from "@/config/packs";
import { getStyle } from "@/config/styles";
import { downloadZip } from "@/features/crop/zip";
import { shootsService, type RefundEligibility, type Shoot, type ShootPhoto } from "@/services";
import { useSession } from "@/stores/session";
import { getPostLoginRedirect } from "@/lib/redirects";
import { cn, formatDate, pluralize } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input, Label } from "@/components/ui/input";
import { Lightbox } from "@/components/ui/lightbox";
import { ProgressCount } from "@/components/ui/progress-count";
import { StatusBadge } from "@/components/ui/status-badge";
import { NotFoundContent } from "@/components/layout/not-found-content";
import { DownloadMenu, downloadPhoto, fileName, type DownloadGuard } from "./download-menu";

type Filter = "all" | "favorites" | `style:${string}`;
type TileSize = "s" | "l";

/** Generated photos in order; each photo's edits right after it (06-shoot-flow §2). */
export function orderPhotos(photos: ShootPhoto[]): ShootPhoto[] {
  const edits = new Map<string, ShootPhoto[]>();
  for (const p of photos) if (p.kind === "edit" && p.parentId) edits.set(p.parentId, [...(edits.get(p.parentId) ?? []), p]);
  const out: ShootPhoto[] = [];
  for (const p of photos) {
    if (p.kind === "edit" && p.parentId && photos.some((x) => x.id === p.parentId)) continue;
    out.push(p, ...(edits.get(p.id) ?? []));
  }
  return out;
}

const REFUND_REASONS = ["Doesn't look like me", "Quality issues", "Styles aren't what I expected", "Other"];

/** `/shoot/[id]` — owner-only shoot page (06-shoot-flow §2). */
export function ShootView({ id }: { id: string }) {
  const router = useRouter();
  const credits = useSession((s) => s.credits);
  const userId = useSession((s) => s.user?.id);
  const [shoot, setShoot] = React.useState<Shoot | null | undefined>(undefined);
  const [photos, setPhotos] = React.useState<ShootPhoto[]>([]);
  const [refund, setRefund] = React.useState<RefundEligibility | null>(null);
  const [filter, setFilter] = React.useState<Filter>("all");
  const [size, setSize] = React.useState<TileSize>("s");
  const [open, setOpen] = React.useState<number | null>(null);
  const [zip, setZip] = React.useState<{ done: number; total: number } | null>(null);
  const [dialog, setDialog] = React.useState<null | "delete" | "rename" | "refund">(null);
  const [busy, setBusy] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [pendingDownload, setPendingDownload] = React.useState<(() => Promise<void>) | null>(null);

  const refreshRefund = React.useCallback(async () => {
    setRefund(await shootsService.refundEligibility(id).catch(() => null));
  }, [id]);

  React.useEffect(() => {
    let alive = true;
    void shootsService.get(id).then((s) => {
      if (!alive) return;
      setShoot(s);
      if (s) void refreshRefund();
    });
    const off = shootsService.subscribe(id, (u) => {
      if (!alive) return;
      setShoot(u.shoot);
      if (u.photos) setPhotos(u.photos);
    });
    return () => {
      alive = false;
      off();
    };
  }, [id, userId, refreshRefund]);

  const ordered = React.useMemo(() => orderPhotos(photos), [photos]);
  const visible = React.useMemo(() => {
    if (filter === "all") return ordered;
    if (filter === "favorites") return ordered.filter((p) => p.isFavorite);
    const styleId = filter.slice(6);
    return ordered.filter((p) => p.styleId === styleId);
  }, [ordered, filter]);

  if (shoot === undefined) {
    return (
      <div className="container-page py-10" aria-busy="true">
        <div className="h-4 w-24 rounded skeleton" />
        <div className="mt-3 h-10 w-80 max-w-full rounded skeleton" />
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="aspect-[4/5] rounded-[12px] skeleton" />
          ))}
        </div>
      </div>
    );
  }
  if (shoot === null) return <NotFoundContent />;

  const pack = getShootPack(shoot.pack);
  const name = shoot.title ?? pack.name;
  const generating = shoot.status === "generating" || shoot.status === "paid";
  const refunded = shoot.status === "refunded";
  const generatedCount = photos.filter((p) => p.kind === "generated").length;
  const placeholders = generating && filter === "all" ? Math.max(0, shoot.targetCount - generatedCount) : 0;

  const toggleFavorite = async (photo: ShootPhoto) => {
    setPhotos((list) => list.map((p) => (p.id === photo.id ? { ...p, isFavorite: !p.isFavorite } : p)));
    await shootsService.favorite(photo.id, !photo.isFavorite);
  };

  const onRecorded = () => void refreshRefund();

  /** M6: any download ends refund eligibility — confirm once, before the first one. */
  const guard: DownloadGuard = (action) => {
    if (refund?.eligible) setPendingDownload(() => action);
    else void action();
  };

  const downloadAll = async () => {
    const list = ordered;
    setZip({ done: 0, total: list.length });
    try {
      await downloadZip(
        list.map((p) => ({ url: p.url, name: fileName(p, "original") })),
        `${brand.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${pack.id}-${shoot.createdAt.slice(0, 10)}.zip`,
        (done, total) => setZip({ done, total }),
      );
      await shootsService.download(
        list.map((p) => p.id),
        "zip",
      );
      onRecorded();
    } finally {
      setZip(null);
    }
  };

  const gridCols = size === "s" ? "lg:grid-cols-5" : "lg:grid-cols-4";
  const sizes = size === "s" ? "(min-width: 1024px) 230px, (min-width: 768px) 33vw, 50vw" : "(min-width: 1024px) 290px, (min-width: 768px) 33vw, 50vw";

  return (
    <div className="container-page py-8 md:py-10">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="text-overline text-brand-text">MY SHOOT</p>
          <h1 className="mt-2 text-h1 break-words text-text">
            {name} · {formatDate(shoot.createdAt)}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[15px] text-muted">
            <span>
              {pluralize(shoot.targetCount, "photo")} · {pack.styles === "all" ? "All styles" : pluralize(shoot.styleIds.length, "style")}
            </span>
            <Link href="/pricing#credits" className="font-semibold text-text hover:text-brand-text">
              {credits} edit credits available
            </Link>
          </p>
        </div>
        {!refunded && (
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => guard(downloadAll)} disabled={generating || zip !== null || ordered.length === 0} loading={zip !== null}>
              {zip === null && <Download aria-hidden="true" />}
              {zip ? `Preparing ZIP… ${zip.done} of ${zip.total}` : "Download all (ZIP)"}
            </Button>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="icon" aria-label="More actions">
                  <Ellipsis aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={() => {
                    setTitle(shoot.title ?? "");
                    setDialog("rename");
                  }}
                >
                  <Pencil aria-hidden="true" />
                  Rename shoot
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setDialog("delete")} className="text-danger-text [&_svg]:text-danger-text!">
                  <Trash2 aria-hidden="true" />
                  Delete now
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* ── Status banners ── */}
      <div className="mt-6 flex flex-col gap-3">
        {generating && (
          <div className="rounded-[16px] border border-border bg-surface p-5 shadow-card">
            <p className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-text">
              <Loader2 className="size-4 animate-spin text-brand" aria-hidden="true" />
              Generating… {shoot.readyCount} of {shoot.targetCount} ready
            </p>
            <ProgressCount ready={shoot.readyCount} total={shoot.targetCount} className="[&>p]:sr-only" />
            <p className="mt-3 text-small text-muted">We&apos;ll email you when your headshots are ready — you can close this page.</p>
          </div>
        )}
        {shoot.expiresAt && !refunded && (
          <p className="flex items-start gap-2 rounded-[12px] bg-warning-soft px-4 py-3 text-[14px] font-medium text-warning-text">
            <CalendarClock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            Photos are stored until {formatDate(shoot.expiresAt)}. Download your favorites before then.
          </p>
        )}
        {refund?.eligible && !refunded && (
          <div className="flex flex-col gap-3 rounded-[12px] border border-border bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-2 text-[14px] text-text">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
              <span>
                <span className="font-semibold">Full refund until your first download.</span>{" "}
                <span className="text-muted">Downloading any photo or the ZIP ends refund eligibility.</span>
              </span>
            </p>
            <Button variant="ghost" size="sm" onClick={() => setDialog("refund")} className="self-start text-brand-text sm:self-auto">
              <Undo2 aria-hidden="true" />
              Not happy? Request a full refund
            </Button>
          </div>
        )}
        {refunded && (
          <div role="status" className="rounded-[16px] border border-border bg-surface p-6 text-center shadow-card">
            <StatusBadge tone="info">Refund requested</StatusBadge>
            <p className="mt-3 text-body text-muted">This shoot was refunded. Its photos will be deleted.</p>
          </div>
        )}
      </div>

      {!refunded && (
        <>
          {/* ── Filters ── */}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0" role="group" aria-label="Filter photos">
              <Chip selected={filter === "all"} onClick={() => setFilter("all")}>
                All
              </Chip>
              <Chip selected={filter === "favorites"} onClick={() => setFilter("favorites")}>
                <Star aria-hidden="true" />
                Favorites
              </Chip>
              {shoot.styleIds.map((sid) => (
                <Chip key={sid} selected={filter === `style:${sid}`} onClick={() => setFilter(`style:${sid}`)}>
                  {getStyle(sid)?.name ?? sid}
                </Chip>
              ))}
            </div>
            <div className="hidden items-center gap-1 rounded-[10px] border border-border bg-surface-2 p-[3px] lg:inline-flex" role="radiogroup" aria-label="Tile size">
              {(
                [
                  ["s", Grid3x3, "Small tiles"],
                  ["l", LayoutGrid, "Large tiles"],
                ] as const
              ).map(([v, Icon, label]) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={size === v}
                  aria-label={label}
                  onClick={() => setSize(v)}
                  className={cn("flex size-8 items-center justify-center rounded-[8px] text-muted", size === v && "bg-surface text-text shadow-card ring-1 ring-border")}
                >
                  <Icon className="size-4" aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>

          {/* ── Grid ── */}
          {visible.length === 0 && placeholders === 0 ? (
            <div className="mt-6 rounded-[16px] border border-dashed border-border bg-surface-2 p-10 text-center">
              <p className="font-semibold text-text">{filter === "favorites" ? "No favorites yet" : "No photos here yet"}</p>
              <p className="mt-1 text-small text-muted">{filter === "favorites" ? "Tap ☆ on a photo to keep it here." : "Photos appear as soon as they pass the likeness check."}</p>
            </div>
          ) : (
            <ul className={cn("mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4", gridCols)} aria-label={`${visible.length} photos`}>
              {visible.map((p, i) => (
                <li key={p.id}>
                  <PhotoTile photo={p} index={i} sizes={sizes} onOpen={() => setOpen(i)} onFavorite={() => void toggleFavorite(p)} onDownload={() => guard(() => downloadPhoto(p, "original", onRecorded))} />
                </li>
              ))}
              {Array.from({ length: placeholders }).map((_, i) => (
                <li key={`ph-${i}`} aria-hidden="true">
                  <div className="aspect-[4/5] rounded-[12px] skeleton" />
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <Lightbox
        items={visible.map((p) => ({ id: p.id, src: p.url, alt: `${getStyle(p.styleId ?? "")?.name ?? "Headshot"}${p.kind === "edit" ? " (edited)" : ""}` }))}
        index={open}
        onIndexChange={setOpen}
        actions={(_item, i) => {
          const p = visible[i];
          if (!p) return null;
          return (
            <>
              <DownloadMenu photo={p} onRecorded={onRecorded} guard={guard} />
              <Button variant="secondary" aria-pressed={p.isFavorite} onClick={() => void toggleFavorite(p)}>
                <Star className={cn(p.isFavorite && "fill-current text-brand-to")} aria-hidden="true" />
                {p.isFavorite ? "Favorited" : "Favorite"}
              </Button>
              <Button asChild variant="primary">
                <Link href={`/studio?photo=${p.id}`}>Edit in Studio →</Link>
              </Button>
            </>
          );
        }}
      />

      <ConfirmDialog
        open={pendingDownload !== null}
        onOpenChange={(o) => !o && setPendingDownload(null)}
        title="Downloading ends your refund eligibility. Continue?"
        description="Packages are fully refundable until your first download — in any format, or the ZIP."
        confirmLabel="Download"
        onConfirm={() => {
          const action = pendingDownload;
          setPendingDownload(null);
          if (action) void action();
        }}
      />

      <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={(o) => !o && setDialog(null)}
        tone="danger"
        title="Delete this shoot now?"
        description="All photos and edits in this shoot will be permanently deleted. This can't be undone."
        confirmLabel="Delete now"
        loading={busy}
        onConfirm={async () => {
          setBusy(true);
          await shootsService.deleteNow(shoot.id);
          await useSession.getState().refresh();
          setBusy(false);
          setDialog(null);
          router.replace(getPostLoginRedirect(useSession.getState().shoots));
        }}
      />

      <Dialog open={dialog === "rename"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              const updated = await shootsService.rename(shoot.id, title);
              setShoot(updated);
              await useSession.getState().refresh();
              setBusy(false);
              setDialog(null);
            }}
          >
            <DialogTitle>Rename shoot</DialogTitle>
            <div className="mt-4">
              <Label htmlFor="shoot-title">Name</Label>
              <Input id="shoot-title" value={title} maxLength={60} placeholder={pack.name} onChange={(e) => setTitle(e.target.value)} autoFocus />
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setDialog(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={busy}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "refund"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogTitle>Request a full refund</DialogTitle>
          <DialogDescription>You&apos;ll get the full price back. The shoot and its photos will be deleted.</DialogDescription>
          <div className="mt-4">
            <Label htmlFor="refund-reason">Reason (optional)</Label>
            <select
              id="refund-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="h-11 w-full rounded-[10px] border border-border bg-surface-2 px-3 text-[15px] text-text"
            >
              <option value="">Prefer not to say</option>
              {REFUND_REASONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDialog(null)}>
              Keep my shoot
            </Button>
            <Button
              variant="primary"
              loading={busy}
              onClick={async () => {
                setBusy(true);
                const updated = await shootsService.requestRefund(shoot.id, reason || undefined);
                setShoot(updated);
                await refreshRefund();
                await useSession.getState().refresh();
                setBusy(false);
                setDialog(null);
              }}
            >
              Request refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PhotoTile({ photo, index, sizes, onOpen, onFavorite, onDownload }: { photo: ShootPhoto; index: number; sizes: string; onOpen: () => void; onFavorite: () => void; onDownload: () => void }) {
  const styleName = getStyle(photo.styleId ?? "")?.name ?? "Headshot";
  const action =
    "flex size-9 items-center justify-center rounded-full bg-overlay-chip text-white backdrop-blur-sm transition-colors hover:bg-[rgba(17,24,39,.9)] [&_svg]:size-[18px]";
  return (
    <div className="group relative overflow-hidden rounded-[12px] border border-border bg-surface-2 animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
      <button type="button" onClick={onOpen} className="relative block aspect-[4/5] w-full" aria-label={`Open photo ${index + 1}, ${styleName}${photo.kind === "edit" ? ", edited" : ""}`}>
        <Image src={photo.thumbUrl} alt="" fill sizes={sizes} loading={index < 5 ? "eager" : "lazy"} className="object-cover" />
      </button>
      {photo.kind === "edit" && (
        <span className="pointer-events-none absolute top-2 left-2 rounded-[6px] bg-overlay-chip px-2 py-0.5 text-[11px] font-semibold text-white">Edited</span>
      )}
      {photo.isFavorite && (
        <Star className="pointer-events-none absolute right-2.5 bottom-2.5 size-4 fill-brand-to text-brand-to drop-shadow group-hover:opacity-0 group-focus-within:opacity-0" aria-hidden="true" />
      )}
      <div className="absolute right-2 bottom-2 flex gap-1.5 opacity-0 transition-opacity duration-[120ms] group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
        <button type="button" onClick={onFavorite} className={action} aria-pressed={photo.isFavorite} aria-label={photo.isFavorite ? "Remove from favorites" : "Add to favorites"}>
          <Star className={cn(photo.isFavorite && "fill-brand-to text-brand-to")} aria-hidden="true" />
        </button>
        <button type="button" onClick={onDownload} className={cn(action, "max-md:hidden")} aria-label="Download original">
          <Download aria-hidden="true" />
        </button>
        <Link href={`/studio?photo=${photo.id}`} className={action} aria-label="Edit in Studio">
          <Pencil aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
