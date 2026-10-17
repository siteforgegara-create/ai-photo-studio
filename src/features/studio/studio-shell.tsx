"use client";

import * as React from "react";
import { scrollBehavior } from "@/lib/motion";
import { useSearchParams } from "next/navigation";
import { alwaysConfirmAboveCredits } from "@/config/packs";
import { shootsService, type EditToolId, type ShootPhoto } from "@/services";
import { useSession } from "@/stores/session";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { downloadPhoto } from "@/features/shoot-page/download-menu";
import { useRefundGuard } from "@/features/shoot-page/use-refund-guard";
import { CategoryChips, CenterPane, GenerateBar, type CenterMode } from "./center";
import { defaultOptionFor, toolById } from "./demo";
import { EditsPanel, OptionsPanel, ShootPanel } from "./panels";
import { DesktopPanel, MobilePanel, TabletDrawer, type PanelSlots } from "./right-panel";
import { useStudio } from "./store";
import { CreditsCard, ToolColumn, ToolIcons, ToolStrip } from "./tool-list";
import { buildInput, useGenerate } from "./use-generate";
import { selectPhoto, useStudioData } from "./use-studio-data";

/** `/studio` — single-photo editor (docs/02-studio.md). One store for desktop, tablet and mobile. */
export function StudioShell() {
  const params = useSearchParams();
  const bp = useBreakpoint();
  const data = useStudioData(params.get("photo"));
  const credits = useSession((s) => s.credits);
  const sessionStatus = useSession((s) => s.status);
  const s = useStudio();
  const [drawer, setDrawer] = React.useState(false);
  const [dontAsk, setDontAsk] = React.useState(false);
  const toolsRef = React.useRef<HTMLDivElement>(null);

  const real = data.status === "real" ? data : null;
  const photo = real?.photo ?? null;
  const gen = useGenerate({ photo, onResults: data.reload });
  const refund = useRefundGuard(real?.shoot.id);

  const edits = React.useMemo(() => (real ? real.photos.filter((p) => p.parentId === real.photo.id).reverse() : []), [real]);
  const selectedEdit = edits.find((e) => e.id === s.selectedEditId) ?? null;

  const selectTool = (id: EditToolId) => {
    const st = useStudio.getState();
    st.setTool(id);
    if (!st.optionByTool[id]) {
      const def = defaultOptionFor(toolById(id));
      if (def) useStudio.getState().patch({ optionByTool: { ...useStudio.getState().optionByTool, [id]: def } });
    }
  };

  const pickPhoto = (p: ShootPhoto) => {
    useStudio.getState().patch({ selectedEditId: undefined, job: { state: "idle" } });
    selectPhoto(p.id);
  };

  const switchShoot = async (shootId: string) => {
    const list = await shootsService.listPhotos(shootId);
    const first = list.find((p) => p.kind === "generated");
    if (first) pickPhoto(first);
  };

  const onFavorite = async (p: ShootPhoto) => {
    await shootsService.favorite(p.id, !p.isFavorite);
    data.reload();
  };

  if (data.status === "loading" || bp === null || sessionStatus === "loading") {
    return (
      <div className="grid h-[calc(100dvh-var(--header-h))] gap-4 p-4 md:grid-cols-[64px_1fr] xl:grid-cols-[220px_1fr_300px]" aria-busy="true">
        <div className="hidden rounded-[16px] skeleton md:block" />
        <div className="rounded-[16px] skeleton" />
        <div className="hidden rounded-[16px] skeleton xl:block" />
      </div>
    );
  }

  const demo = data.status === "demo";
  const mode: CenterMode = demo
    ? { kind: "demo", showToggle: data.hasOwn }
    : { kind: "real", photo: real!.photo, after: selectedEdit, canGenerate: buildInput(real!.photo.id) !== null };

  const slots: PanelSlots = {
    options: (
      <OptionsPanel
        demo={demo}
        chips={bp === "mobile" && s.tool !== "crop" && (toolById(s.tool).categories.length > 1 || toolById(s.tool).custom) ? <CategoryChips /> : undefined}
      />
    ),
    shoot: (
      <ShootPanel
        shoot={real?.shoot ?? null}
        shoots={real?.shoots ?? []}
        photos={real?.photos ?? []}
        currentId={real?.photo.id}
        onPick={pickPhoto}
        onSwitchShoot={(id) => void switchShoot(id)}
      />
    ),
    edits: (
      <EditsPanel
        demo={demo}
        edits={edits}
        jobs={gen.jobs}
        selectedId={s.selectedEditId}
        onSelect={(p) => useStudio.getState().patch({ selectedEditId: p.id })}
        onFavorite={(p) => void onFavorite(p)}
        onDownload={(p) => refund.guard(() => downloadPhoto(p, "original", () => void refund.refresh()))}
      />
    ),
  };

  const center = (compact: boolean, onOpenPanel?: () => void) => (
    <CenterPane
      mode={mode}
      compact={compact}
      onGenerate={() => void gen.request()}
      guard={refund.guard}
      onRecorded={() => void refund.refresh()}
      onOpenPanel={onOpenPanel}
      credits={credits}
    />
  );

  const creditsCard = <CreditsCard credits={credits} guest={sessionStatus !== "authenticated"} />;

  return (
    <>
      {bp === "desktop" && (
        <div
          className="grid h-[calc(100dvh-var(--header-h))] gap-4 p-4 transition-[grid-template-columns] duration-[240ms] ease-[cubic-bezier(.22,.8,.25,1)]"
          style={{ gridTemplateColumns: `220px minmax(0,1fr) ${s.panel === "open" ? 300 : 48}px` }}
          data-panel={s.panel}
        >
          <div className="min-h-0 overflow-y-auto">
            <ToolColumn active={s.tool} onSelect={selectTool} credits={creditsCard} />
          </div>
          <div className="min-h-0">{center(false)}</div>
          <DesktopPanel slots={slots} />
        </div>
      )}

      {bp === "tablet" && (
        <>
          <div className="grid h-[calc(100dvh-var(--header-h))] grid-cols-[64px_minmax(0,1fr)] gap-4 p-4">
            <ToolIcons active={s.tool} onSelect={selectTool} />
            <div className="min-h-0">{center(false, () => setDrawer(true))}</div>
          </div>
          <TabletDrawer slots={slots} open={drawer} onOpenChange={setDrawer} />
        </>
      )}

      {bp === "mobile" && (
        <>
          {/* One screen: tools, title, preview (fitted), status — above the fixed Generate bar and tab bar. */}
          <div
            className="flex h-[calc(100dvh-var(--header-h))] flex-col gap-3 overflow-y-auto px-4 pt-3 [--studio-genbar:84px] [--studio-tabbar:64px]"
            style={{ paddingBottom: `calc(var(--studio-tabbar) + ${s.tool === "crop" ? "0px" : "var(--studio-genbar)"} + env(safe-area-inset-bottom) + 12px)` }}
          >
            <div ref={toolsRef} className="flex-none">
              <ToolStrip active={s.tool} onSelect={selectTool} />
            </div>
            {/* Crop & Export keeps its own long panel, so it scrolls instead of being fitted. */}
            <div className={s.tool === "crop" ? "flex-none" : "flex min-h-0 flex-1 flex-col"}>{center(true)}</div>
            {s.tool !== "crop" && <GenerateBar mode={mode} onGenerate={() => void gen.request()} credits={credits} />}
          </div>
          <MobilePanel
            slots={slots}
            onTools={() => toolsRef.current?.scrollIntoView({ behavior: scrollBehavior(), block: "start" })}
          />
        </>
      )}

      {/* M7: confirmation before credits are spent; above 6 credits it is always shown. */}
      <ConfirmDialog
        open={gen.confirm !== null}
        onOpenChange={(o) => !o && gen.cancel()}
        title={gen.confirm ? `Generate ${gen.confirm.quote.variants} variant${gen.confirm.quote.variants > 1 ? "s" : ""}?` : ""}
        description={gen.confirm ? `This edit uses ${gen.confirm.quote.credits} credits (${gen.confirm.quote.perVariant} per variant). You have ${credits}. Failed edits are refunded automatically.` : ""}
        confirmLabel={gen.confirm ? `Generate · ${gen.confirm.quote.credits} credits` : "Generate"}
        onConfirm={() => gen.confirmRun(dontAsk)}
      >
        {gen.confirm && gen.confirm.quote.credits <= alwaysConfirmAboveCredits ? (
          <label className="flex cursor-pointer items-center gap-2 text-[14px] font-medium text-text">
            <Checkbox checked={dontAsk} onCheckedChange={(v) => setDontAsk(v === true)} />
            Don&apos;t ask again
          </label>
        ) : null}
      </ConfirmDialog>
      {refund.dialog}
    </>
  );
}
