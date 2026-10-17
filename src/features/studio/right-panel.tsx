"use client";

import * as React from "react";
import { Dialog as Primitive } from "radix-ui";
import { motion, useDragControls, useReducedMotion, type PanInfo } from "motion/react";
import { ChevronLeft, ChevronRight, Images, Layers, SlidersHorizontal, Wrench, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useStudio, type StudioTab } from "./store";

export type PanelSlots = { options: React.ReactNode; shoot: React.ReactNode; edits: React.ReactNode };

const tabLabels: Record<StudioTab, string> = { options: "Options", shoot: "Shoot", edits: "Edits" };

/**
 * Tabs `Options | Shoot | Edits`. Inactive tabs stay mounted (forceMount) so
 * selection and scroll survive switching and collapsing (02-studio §1.3).
 */
function PanelTabs({ slots, collapse, className }: { slots: PanelSlots; collapse?: React.ReactNode; className?: string }) {
  const tab = useStudio((s) => s.tab);
  const setTab = useStudio((s) => s.setTab);
  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as StudioTab)} className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div className="flex items-center gap-1 border-b border-border pr-2">
        <TabsList className="flex-1 border-b-0 px-2">
          {(Object.keys(tabLabels) as StudioTab[]).map((t) => (
            <TabsTrigger key={t} value={t}>
              {tabLabels[t]}
            </TabsTrigger>
          ))}
        </TabsList>
        {collapse}
      </div>
      {(Object.keys(tabLabels) as StudioTab[]).map((t) => (
        <TabsContent key={t} value={t} forceMount className="min-h-0 flex-1 overflow-y-auto overscroll-contain" data-tab={t}>
          {slots[t]}
        </TabsContent>
      ))}
    </Tabs>
  );
}

/** Desktop: 300 px panel ↔ 48 px rail. Content is hidden (not unmounted) when collapsed. */
export function DesktopPanel({ slots }: { slots: PanelSlots }) {
  const { panel, panelDot, togglePanel } = useStudio();
  const open = panel === "open";
  return (
    <aside aria-label="Options and photos" className="relative h-full min-h-0 overflow-hidden rounded-[16px] border border-border bg-surface shadow-card">
      {/* Rail */}
      <div className={cn("absolute inset-0 flex flex-col items-center gap-4 py-3", open && "invisible")} aria-hidden={open}>
        <button
          type="button"
          onClick={togglePanel}
          className="relative flex size-9 items-center justify-center rounded-[10px] border border-border text-text hover:bg-surface-2"
          aria-label="Open options and photos panel"
          aria-expanded={false}
          tabIndex={open ? -1 : 0}
        >
          <ChevronRight className="size-4" aria-hidden="true" />
          {panelDot && <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-brand ring-2 ring-surface" aria-label="New results" />}
        </button>
        <span className="text-overline text-muted [writing-mode:vertical-rl]">OPTIONS &amp; PHOTOS</span>
      </div>
      {/* Panel — kept mounted, hidden with visibility so scroll positions survive. */}
      <div className={cn("flex h-full w-[300px] flex-col", !open && "invisible")} aria-hidden={!open} inert={!open}>
        <PanelTabs
          slots={slots}
          collapse={
            <button
              type="button"
              onClick={togglePanel}
              className="flex size-8 shrink-0 items-center justify-center rounded-[8px] border border-border text-text hover:bg-surface-2"
              aria-label="Collapse panel"
              aria-expanded={true}
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
          }
        />
      </div>
    </aside>
  );
}

/** Tablet: the same panel as an overlay drawer (320 px) from the right (02-studio §7). */
export function TabletDrawer({ slots, open, onOpenChange }: { slots: PanelSlots; open: boolean; onOpenChange: (o: boolean) => void }) {
  const reduce = useReducedMotion();
  // The opener is not a Radix Trigger, so focus is returned to it by hand.
  const returnTo = React.useRef<HTMLElement | null>(null);
  return (
    <Primitive.Root open={open} onOpenChange={onOpenChange}>
      <Primitive.Portal>
        <Primitive.Overlay className="fixed inset-0 z-50 bg-scrim data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Primitive.Content
          asChild
          aria-describedby={undefined}
          onOpenAutoFocus={() => (returnTo.current = document.activeElement as HTMLElement | null)}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            returnTo.current?.focus();
          }}
        >
          <motion.aside
            initial={reduce ? false : { x: 340 }}
            animate={{ x: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 0.8, 0.25, 1] }}
            className="fixed inset-y-0 right-0 z-50 flex w-[320px] flex-col border-l border-border bg-surface shadow-pop outline-none"
          >
            <Primitive.Title className="sr-only">Options and photos</Primitive.Title>
            <PanelTabs
              slots={slots}
              collapse={
                <Primitive.Close className="flex size-8 items-center justify-center rounded-[8px] text-muted hover:bg-surface-2" aria-label="Close panel">
                  <X className="size-4" aria-hidden="true" />
                </Primitive.Close>
              }
            />
          </motion.aside>
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  );
}

const mobileTabs: { id: "tools" | StudioTab; label: string; icon: typeof Wrench }[] = [
  { id: "tools", label: "Tools", icon: Wrench },
  { id: "options", label: "Options", icon: SlidersHorizontal },
  { id: "shoot", label: "Shoot", icon: Images },
  { id: "edits", label: "Edits", icon: Layers },
];

/**
 * Mobile: bottom tab bar `Tools · Options · Shoot · Edits`; every tab except
 * Tools opens a bottom sheet (~70% height). Closes with swipe, ×, Esc or a tap
 * on the backdrop; focus moves inside and back (Radix Dialog).
 */
export function MobilePanel({ slots, onTools }: { slots: PanelSlots; onTools: () => void }) {
  const [open, setOpen] = React.useState(false);
  // Tab-bar button that opened the sheet; focus goes back to it on close.
  const opener = React.useRef<HTMLButtonElement | null>(null);
  const tab = useStudio((s) => s.tab);
  const setTab = useStudio((s) => s.setTab);
  const panelDot = useStudio((s) => s.panelDot);
  const reduce = useReducedMotion();
  const controls = useDragControls();

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 80 || info.velocity.y > 500) setOpen(false);
  };

  return (
    <>
      <nav aria-label="Studio" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]">
        <ul className="grid grid-cols-4">
          {mobileTabs.map((t) => {
            const active = t.id === "tools" ? !open : open && tab === t.id;
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={(e) => {
                    if (t.id === "tools") {
                      setOpen(false);
                      onTools();
                    } else {
                      opener.current = e.currentTarget;
                      setTab(t.id);
                      setOpen(true);
                    }
                  }}
                  aria-pressed={active}
                  className={cn("relative flex h-16 w-full flex-col items-center justify-center gap-1 text-[12px] font-semibold", active ? "text-brand-text" : "text-muted")}
                >
                  <t.icon className="size-5" aria-hidden="true" />
                  {t.label}
                  {t.id === "edits" && panelDot && <span className="absolute top-3 left-[calc(50%+8px)] size-2 rounded-full bg-brand" aria-label="New results" />}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <Primitive.Root open={open} onOpenChange={setOpen}>
        <Primitive.Portal>
          <Primitive.Overlay className="fixed inset-0 z-50 bg-scrim data-[state=open]:animate-in data-[state=open]:fade-in-0" />
          <Primitive.Content
            asChild
            aria-describedby={undefined}
            onCloseAutoFocus={(e) => {
              e.preventDefault();
              opener.current?.focus();
            }}
          >
            <motion.div
              initial={reduce ? false : { y: "100%" }}
              animate={{ y: 0 }}
              transition={{ type: "spring", duration: 0.26, bounce: 0 }}
              drag={reduce ? false : "y"}
              dragControls={controls}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={onDragEnd}
              className="fixed inset-x-0 bottom-0 z-50 flex h-[72dvh] flex-col rounded-t-[20px] border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] shadow-pop outline-none"
            >
              {/* Swipe down on the handle / header closes the sheet; the list itself scrolls normally. */}
              <div className="flex touch-none justify-center pt-2.5 pb-1" aria-hidden="true" onPointerDown={(e) => controls.start(e)}>
                <span className="h-1.5 w-10 rounded-full bg-border" />
              </div>
              <div className="flex touch-none items-center justify-between px-4 pb-1" onPointerDown={(e) => controls.start(e)}>
                <Primitive.Title className="text-[18px] font-bold text-text">{tab === "options" ? "Options" : tab === "shoot" ? "Your shoot" : "Edits"}</Primitive.Title>
                <Primitive.Close className="flex size-10 items-center justify-center rounded-full bg-surface-2 text-text" aria-label="Close">
                  <X className="size-4" aria-hidden="true" />
                </Primitive.Close>
              </div>
              <PanelTabs slots={slots} className="min-h-0" />
            </motion.div>
          </Primitive.Content>
        </Primitive.Portal>
      </Primitive.Root>
    </>
  );
}
