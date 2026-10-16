"use client";

import * as React from "react";
import Image from "next/image";
import { ArrowRight, Download, Info, Mail, Plus, Sparkles, Star, Trash2, User } from "lucide-react";
import { demoManifest } from "@/config/demo-manifest";
import { editTools, formatToolPrice } from "@/config/edit-tools";
import { shootPacks } from "@/config/packs";
import { shootStyles } from "@/config/styles";
import { BeforeAfter, ExampleBadge } from "@/components/before-after";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Chip } from "@/components/ui/chip";
import { ComparisonTable } from "@/components/ui/comparison-table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CreditsPill } from "@/components/ui/credits-pill";
import { Dropzone } from "@/components/ui/dropzone";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FieldError, Input, Label } from "@/components/ui/input";
import { Lightbox, type LightboxItem } from "@/components/ui/lightbox";
import { Logo, LogoMark } from "@/components/ui/logo";
import { PackCard } from "@/components/ui/pack-card";
import { ProgressCount } from "@/components/ui/progress-count";
import { SegmentedThemeToggle } from "@/components/ui/segmented-theme-toggle";
import { SelfieTile } from "@/components/ui/selfie-tile";
import { StatusBadge } from "@/components/ui/status-badge";
import { Stepper } from "@/components/ui/stepper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThumbTile } from "@/components/ui/thumb-tile";
import { Tooltip } from "@/components/ui/tooltip";
import { Watermark } from "@/components/ui/watermark";
import { cn } from "@/lib/utils";

const comparisonRows = [
  { typical: "Pay first, hope it looks like you", ours: "Free previews before you pay" },
  { typical: "100+ photos, many unusable", ours: "Only photos that pass a likeness check" },
  { typical: "10–20 selfies required", ours: "4–8 selfies, checked instantly in your browser" },
];

const swatches = [
  ["bg", "bg-bg"],
  ["surface", "bg-surface"],
  ["surface-2", "bg-surface-2"],
  ["border", "bg-border"],
  ["text", "bg-text"],
  ["text-muted", "bg-muted"],
  ["brand", "bg-brand"],
  ["brand-soft", "bg-brand-soft"],
  ["brand-gradient", "bg-brand-gradient"],
  ["success", "bg-success"],
  ["success-soft", "bg-success-soft"],
  ["danger", "bg-danger"],
  ["warning-soft", "bg-warning-soft"],
  ["overlay-chip", "bg-overlay-chip"],
] as const;

const lightboxItems: LightboxItem[] = Object.entries(demoManifest.shoot).map(([id, src]) => ({
  id,
  src: src ?? "",
  alt: `Example headshot — ${id}`,
}));

export function UiGallery() {
  return (
    <div className="min-h-dvh bg-bg">
      <header className="sticky top-0 z-40 border-b border-border bg-surface">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-4 px-4 md:px-6">
          <Logo size="sm" />
          <span className="text-overline text-muted">/dev/ui · component gallery</span>
          <SegmentedThemeToggle className="ml-auto" size="sm" />
        </div>
      </header>
      <main id="main" className="mx-auto max-w-[1600px] px-4 py-8 md:px-6">
        <p className="max-w-3xl text-body text-muted">
          Every base component from <code className="text-text">docs/01-design-system.md §4</code> in its variants. Each block is rendered twice — Light and Dark —
          from the same tokens. The page theme toggle switches the page chrome only.
        </p>

        <Section title="Tokens · colours">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {swatches.map(([name, cls]) => (
              <div key={name} className="overflow-hidden rounded-[12px] border border-border bg-surface">
                <div className={cn("h-12", cls)} />
                <p className="px-2.5 py-1.5 text-[12px] font-semibold text-text">--{name}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Typography (Inter)">
          <div className="flex flex-col gap-3">
            <p className="text-overline text-brand-text">Overline · 11/16 600</p>
            <p className="text-display">Display 56/60</p>
            <p className="text-h1">H1 36/42 · 800</p>
            <p className="text-h2">H2 28/34 · 700</p>
            <p className="text-h3">H3 22/28 · 700</p>
            <p className="text-body">Body 15/24 — Upload a few selfies, see free previews, and get studio-quality 4K headshots.</p>
            <p className="text-small text-muted">Small 13/18 · 500 — captions and secondary text</p>
            <p className="text-button">Button 14/20 · 600</p>
          </div>
        </Section>

        <Section title="Button">
          <div className="flex flex-col gap-4">
            <Row>
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger-outline">
                <Trash2 aria-hidden="true" />
                Delete
              </Button>
              <Button variant="link">Link</Button>
            </Row>
            <Row>
              <Button variant="primary" size="lg">
                Generate · 2 credits
              </Button>
              <Button variant="secondary" size="lg">
                <Download aria-hidden="true" />
                Download
              </Button>
              <Button variant="primary" size="lg" disabled>
                Disabled primary
              </Button>
            </Row>
            <Row>
              <Button variant="primary" loading>
                Saving
              </Button>
              <Button variant="secondary" loading>
                Loading
              </Button>
              <Button variant="secondary" size="sm">
                Small
              </Button>
              <Button variant="secondary" size="icon" aria-label="Add">
                <Plus aria-hidden="true" />
              </Button>
            </Row>
          </div>
        </Section>

        <Section title="Chip · StatusBadge">
          <div className="flex flex-col gap-4">
            <Row>
              <Chip selected>All</Chip>
              <Chip>Studio</Chip>
              <Chip>Office</Chip>
              <Chip>Outdoor</Chip>
              <Chip disabled>Custom</Chip>
            </Row>
            <Row>
              <StatusBadge tone="demo" dot>
                Demo mode · 0 credits
              </StatusBadge>
              <StatusBadge tone="success">Ready</StatusBadge>
              <StatusBadge tone="info">4 results ready</StatusBadge>
              <StatusBadge tone="warning">Price to be confirmed</StatusBadge>
              <StatusBadge tone="neutral">Empty</StatusBadge>
              <StatusBadge tone="danger">Failed</StatusBadge>
              <StatusBadge tone="neutral" casing="normal">
                Edited
              </StatusBadge>
            </Row>
          </div>
        </Section>

        <Section title="Logo · CreditsPill · Avatar · SegmentedThemeToggle">
          <Row>
            <Logo />
            <LogoMark />
            <CreditsPill credits={30} />
            <Avatar name="Jordan Lee" />
            <Avatar name="Jordan Lee" size={48} />
            <SegmentedThemeToggle />
          </Row>
        </Section>

        <Section title="Card / Panel · Tabs">
          <div className="grid gap-4 md:grid-cols-2">
            <AccountCardDemo />
            <Card className="p-0 md:p-0">
              <Tabs defaultValue="options">
                <TabsList className="px-2">
                  <TabsTrigger value="options">Options</TabsTrigger>
                  <TabsTrigger value="shoot">Shoot</TabsTrigger>
                  <TabsTrigger value="edits">Edits</TabsTrigger>
                </TabsList>
                <TabsContent value="options" className="grid grid-cols-2 gap-3 p-4">
                  {shootStyles.slice(0, 4).map((s, i) => (
                    <ThumbTile key={s.id} src={s.previewImage} alt={s.name} label={s.name} selected={i === 0} sizes="140px" />
                  ))}
                </TabsContent>
                <TabsContent value="shoot" className="p-4 text-body text-muted">
                  All photos of the current shoot.
                </TabsContent>
                <TabsContent value="edits" className="p-6 text-center">
                  <p className="font-semibold text-text">No edits yet</p>
                  <p className="mt-1 text-small text-muted">Pick an option and generate.</p>
                </TabsContent>
              </Tabs>
            </Card>
          </div>
        </Section>

        <Section title="ThumbTile">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <ThumbTile src={demoManifest.shoot["corporate-gray"]} alt="Corporate Gray" label="Corporate Gray" selected meta="Ready" />
            <ThumbTile src={demoManifest.shoot["city-bokeh"]} alt="City Bokeh" label="City Bokeh" meta="Ready" />
            <ThumbTile
              src={demoManifest.shoot["modern-office"]}
              alt="Cinematic"
              label="Cinematic"
              badge={<span className="rounded-full bg-overlay-chip px-2 py-0.5 text-[11px] font-bold text-white">2 cr</span>}
            />
            <ThumbTile alt="Warm Library" label="Warm Library" placeholder={<><span className="font-semibold text-text">Warm Library</span><span>Example coming soon</span></>} />
          </div>
        </Section>

        <Section title="Edit tools (config)">
          <ul className="grid gap-1 sm:grid-cols-2">
            {editTools.map((t) => (
              <li key={t.id} className={cn("flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[14px] font-semibold", t.id === "background" ? "bg-brand-soft text-brand-text" : "text-text")}>
                <t.icon className="size-[18px]" aria-hidden="true" />
                <span className="flex-1">{t.name}</span>
                <span className="text-[12px] font-medium text-muted">{formatToolPrice(t.pricePerVariant)}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="BeforeAfter (slider · diagonal)">
          <div className="grid gap-4 sm:grid-cols-2">
            <BeforeAfter before={demoManifest.hero.before} after={demoManifest.hero.after} alt={demoManifest.hero.alt} badge={<ExampleBadge />} sizes="360px" />
            <div className="aspect-[4/5]">
              <BeforeAfter variant="diagonal" before={demoManifest.auth.before} after={demoManifest.auth.after} alt={demoManifest.auth.alt} caption="Explore the transformation · Example" sizes="360px" />
            </div>
          </div>
        </Section>

        <Section title="Dropzone · SelfieTile">
          <div className="flex flex-col gap-4">
            <Dropzone title="Drop your selfies here" hint="JPEG, PNG, WebP or HEIC · up to 15 MB each" accept="image/*" onFiles={() => undefined} />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SelfieTile src={demoManifest.selfie} alt="Selfie 1" verdict="ok" reason="Looks great" onRemove={() => undefined} />
              <SelfieTile src={demoManifest.selfie} alt="Selfie 2" verdict="warn" reason="Slightly blurry" onRemove={() => undefined} />
              <SelfieTile src={demoManifest.selfie} alt="Selfie 3" verdict="reject" reason="More than one person" onRemove={() => undefined} />
              <SelfieTile src={demoManifest.selfie} alt="Selfie 4" verdict="checking" reason="" />
            </div>
          </div>
        </Section>

        <Section title="Stepper · ProgressCount">
          <div className="flex flex-col gap-6">
            <Stepper steps={["Selfies", "Your look", "Free preview", "Package", "Done"]} current={2} />
            <ProgressCount ready={18} total={50} />
          </div>
        </Section>

        <Section title="PackCard" wide>
          <div className="grid gap-4 lg:grid-cols-3">
            {shootPacks.map((p) => (
              <PackCard
                key={p.id}
                pack={p}
                badge={p.popular ? "MOST POPULAR" : undefined}
                action={
                  <Button variant={p.popular ? "primary" : "secondary"} size="lg" className="w-full">
                    Choose {p.name}
                    <ArrowRight aria-hidden="true" />
                  </Button>
                }
              />
            ))}
          </div>
        </Section>

        <Section title="ComparisonTable" wide>
          <ComparisonTable rows={comparisonRows} oursLabel="AI Photo Studio" caption="How we compare" />
        </Section>

        <Section title="Watermark · Lightbox · ConfirmDialog · Dropdown · Tooltip">
          <Interactive />
        </Section>
      </main>
    </div>
  );
}

function Interactive() {
  const [lightbox, setLightbox] = React.useState<number | null>(null);
  const [confirm, setConfirm] = React.useState(false);
  const [dontAsk, setDontAsk] = React.useState(false);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {lightboxItems.map((item, i) => (
          <button key={item.id} type="button" onClick={() => setLightbox(i)} className="relative aspect-[4/5] overflow-hidden rounded-[12px] border border-border" aria-label={`Open ${item.alt}`}>
            <Image src={item.src} alt="" fill sizes="160px" className="object-cover" />
            {i === 0 && <Watermark size="sm" />}
          </button>
        ))}
      </div>
      <Row>
        <Button variant="primary" onClick={() => setConfirm(true)}>
          <Sparkles aria-hidden="true" />
          Generate · 2 credits
        </Button>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary">
              <Download aria-hidden="true" />
              Download ▾
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem>Original 4K (JPG)</DropdownMenuItem>
            <DropdownMenuItem>LinkedIn (1:1, 1080px)</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Mail aria-hidden="true" />
              Round avatar (PNG)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Tooltip content="Example coming soon">
          <Button variant="ghost" size="icon" aria-label="More info">
            <Info aria-hidden="true" />
          </Button>
        </Tooltip>
      </Row>
      <Lightbox
        items={lightboxItems}
        index={lightbox}
        onIndexChange={setLightbox}
        actions={() => (
          <>
            <Button variant="secondary">
              <Download aria-hidden="true" />
              Download
            </Button>
            <Button variant="secondary">
              <Star aria-hidden="true" />
              Favorite
            </Button>
            <Button variant="primary">Edit in Studio →</Button>
          </>
        )}
      />
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Generate 2 variants?"
        description="This edit uses 2 credits. You have 30."
        confirmLabel="Generate · 2 credits"
        onConfirm={() => setConfirm(false)}
      >
        <label className="flex items-center gap-2 text-[14px] font-medium text-text">
          <Checkbox checked={dontAsk} onCheckedChange={(v) => setDontAsk(v === true)} />
          Don&apos;t ask again
        </label>
      </ConfirmDialog>
    </div>
  );
}

function AccountCardDemo() {
  const id = React.useId();
  return (
    <Card>
      <CardHeader icon={<User />} title="My Account" description="Your personal account details." titleAs="h3" />
      <div className="mt-5">
        <Label htmlFor={`${id}-name`}>Full name</Label>
        <Input id={`${id}-name`} defaultValue="Jordan Lee" autoComplete="off" />
      </div>
      <div className="mt-3">
        <Label htmlFor={`${id}-email`}>Email address</Label>
        <Input id={`${id}-email`} aria-invalid aria-describedby={`${id}-email-err`} defaultValue="jordan@" autoComplete="off" />
        <FieldError id={`${id}-email-err`}>Enter a valid email address.</FieldError>
      </div>
      <label className="mt-4 flex items-center gap-2 text-[14px] font-medium">
        <Checkbox defaultChecked />
        Show Demo Image
      </label>
    </Card>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3">{children}</div>;
}

/** Renders its children twice: forced Light pane and forced Dark pane. */
function Section({ title, children, wide = false }: { title: string; children: React.ReactNode; wide?: boolean }) {
  const id = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <section aria-labelledby={id} className="mt-10">
      <h2 id={id} className="text-h3 text-text">
        {title}
      </h2>
      <div className={cn("mt-4 grid gap-4", wide ? "grid-cols-1" : "xl:grid-cols-2")}>
        <Pane theme="light">{children}</Pane>
        <Pane theme="dark">{children}</Pane>
      </div>
    </section>
  );
}

function Pane({ theme, children }: { theme: "light" | "dark"; children: React.ReactNode }) {
  return (
    <div className={cn(theme, "rounded-[16px] border border-border bg-bg p-4 text-text md:p-6")} data-pane={theme}>
      <p className="mb-4 text-overline text-muted">{theme === "light" ? "Light" : "Dark"}</p>
      {children}
    </div>
  );
}
