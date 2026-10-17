import type { Metadata } from "next";
import { StylePlaceholder } from "@/components/marketing/style-placeholder";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  Download,
  Eraser,
  Images,
  ImageUp,
  Palette,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Wallet,
} from "lucide-react";
import { brand } from "@/config/brand";
import { demoManifest } from "@/config/demo-manifest";
import { shootPacks } from "@/config/packs";
import { shootStyles } from "@/config/styles";
import { useCases } from "@/config/use-cases";
import { Button } from "@/components/ui/button";
import { ComparisonTable } from "@/components/ui/comparison-table";
import { PackCard } from "@/components/ui/pack-card";
import { CtaCard } from "@/components/marketing/cta-card";
import { FaqList } from "@/components/marketing/faq";
import { HowToSteps } from "@/components/marketing/how-to";
import { JsonLd } from "@/components/marketing/json-ld";
import { Section, SectionHeading } from "@/components/marketing/section";
import { EditsDemo } from "@/features/home/edits-demo";
import { HeroDemo } from "@/features/home/hero-demo";
import { homeFaq } from "@/features/home/content";

export const metadata: Metadata = {
  title: { absolute: `${brand.name} — Professional headshots that actually look like you` },
  description: brand.description,
  alternates: { canonical: "/" },
};

const bullets = ["Free previews before you pay", "Every photo checked for likeness", "4K, commercial license, edits included"];

const comparison = [
  { typical: "Pay first, hope it looks like you", ours: "Free previews before you pay" },
  { typical: "100+ photos, many unusable", ours: "Only photos that pass a likeness check" },
  { typical: "10–20 selfies required", ours: "4–8 selfies, checked instantly in your browser" },
  { typical: "Fixed results", ours: "Edit background, outfit and lighting afterwards" },
  { typical: "Low-res on basic plans", ours: "4K on every plan" },
  { typical: "Unclear photo retention", ours: "Selfies deleted 24h after your shoot" },
];

const steps = [
  { icon: ImageUp, title: "Upload 4–8 selfies", text: "We check each one in your browser and tell you if it's blurry, too dark or too small." },
  { icon: Images, title: "See 4 free previews", text: "Watermarked previews in two styles, so you know it looks like you before you pay." },
  { icon: Palette, title: "Pick a package and styles", text: "One-time payment. Choose how many photos and which backdrops and looks you want." },
  { icon: Download, title: "Download and fine-tune in Studio", text: "Download in 4K, then change the background, outfit or lighting of any photo." },
] as const;

/** `/` — headshot-first landing (03-pages §1). */
export default function HomePage() {
  return (
    <>
      {/* 1. Hero */}
      <div className="container-page pt-10 pb-6 md:pt-16">
        <section className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-14" aria-labelledby="hero-title">
          <div>
            <p className="text-overline text-brand-text">AI HEADSHOTS · STUDIO QUALITY</p>
            <h1 id="hero-title" className="mt-4 text-display text-text">
              Professional headshots that actually look like you
            </h1>
            <p className="mt-5 max-w-xl text-[17px] leading-7 text-muted">
              Upload a few selfies, see free previews, and get studio-quality 4K headshots — every photo checked for likeness.
            </p>
            <ul className="mt-6 flex flex-col gap-2.5">
              {bullets.map((b) => (
                <li key={b} className="flex items-center gap-2.5 text-[15px] font-medium text-text">
                  <span className="flex size-5 items-center justify-center rounded-full bg-brand-soft text-brand-text" aria-hidden="true">
                    <Check className="size-3.5" strokeWidth={3} />
                  </span>
                  {b}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="primary" size="lg">
                <Link href="/shoot/new">
                  Get your free preview
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link href="/#examples">See examples</Link>
              </Button>
            </div>
            <p className="mt-4 text-small text-muted">From ${Math.min(...shootPacks.map((p) => p.priceUsd))} · One-time payment · Full refund until you download</p>
          </div>
          <div className="mx-auto w-full max-w-[520px]">
            <HeroDemo />
          </div>
        </section>
      </div>

      <div className="container-page">
        {/* 2. Why it's different */}
        <Section id="why" aria-labelledby="why-title">
          <SectionHeading id="why-title" overline="WHY IT'S DIFFERENT" title="Built around one promise: it looks like you" align="center" />
          <ComparisonTable rows={comparison} oursLabel={brand.name} caption={`Typical AI headshot apps compared with ${brand.name}`} className="mx-auto mt-10 max-w-4xl" />
        </Section>

        {/* 3. How it works */}
        <Section id="how-it-works" aria-labelledby="how-title" className="pt-0 md:pt-0">
          <SectionHeading id="how-title" overline="HOW IT WORKS" title="From selfies to headshots in four steps" />
          <HowToSteps steps={steps} className="mt-8" />
        </Section>

        {/* 4. Examples */}
        <Section id="examples" aria-labelledby="examples-title" className="pt-0 md:pt-0">
          <SectionHeading
            id="examples-title"
            overline="EXAMPLES"
            title="Twelve styles for every kind of profile"
            lead="Corporate, studio, office, outdoor, casual and creative looks. Pick the ones that fit where your photo will be used."
          />
          <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {shootStyles.map((s) => (
              <li key={s.id} className="overflow-hidden rounded-[12px] border border-border bg-surface">
                <div className="relative aspect-[4/5] bg-surface-2">
                  {s.previewImage ? (
                    <>
                      <Image src={s.previewImage} alt={`${s.name} — example`} fill sizes="(min-width: 1024px) 200px, 50vw" className="object-cover" />
                      <span className="absolute bottom-2 left-2 rounded-[6px] bg-overlay-chip px-2 py-0.5 text-[11px] font-semibold text-white">Example</span>
                    </>
                  ) : (
                    <StylePlaceholder style={s} />
                  )}
                </div>
                <div className="px-3 py-2">
                  <p className="text-[13px] leading-[18px] font-semibold text-text">{s.name}</p>
                  <p className="text-[12px] leading-4 text-muted">{s.category}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-10 rounded-[16px] border border-border bg-surface p-5 shadow-card md:p-8">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h3 className="text-h3 text-text">One person, different styles</h3>
                <p className="mt-1 text-[15px] text-muted">The same selfies, four backdrops. Faces stay consistent from style to style.</p>
              </div>
            </div>
            <ul className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
              {[{ src: demoManifest.selfie, label: "Selfie" }, ...(["corporate-gray", "minimal-beige", "modern-office", "city-bokeh"] as const).map((id) => ({ src: demoManifest.shoot[id]!, label: shootStyles.find((s) => s.id === id)!.name }))].map((f, i) => (
                <li key={f.label} className={i === 0 ? "col-span-2 md:col-span-1" : undefined}>
                  <div className="relative aspect-[4/5] overflow-hidden rounded-[12px] bg-surface-2">
                    <Image src={f.src} alt={`Example: ${f.label}`} fill sizes="(min-width: 768px) 220px, 50vw" className="object-cover" />
                    <span className="absolute top-2 left-2 rounded-[6px] bg-overlay-chip px-2 py-0.5 text-[11px] font-semibold text-white">{i === 0 ? "Before" : "Example"}</span>
                  </div>
                  <p className="mt-2 text-[13px] font-semibold text-text">{f.label}</p>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-small text-muted">Examples are AI-generated from a synthetic model.</p>
          </div>
        </Section>

        {/* 5. Edits included */}
        <Section aria-labelledby="edits-title" className="pt-0 md:pt-0">
          <EditsDemo />
        </Section>

        {/* 6. Benefits */}
        <Section aria-labelledby="benefits-title" className="pt-0 md:pt-0">
          <SectionHeading
            id="benefits-title"
            overline="BUILT AROUND YOU"
            title={
              <>
                Everything you need.
                <br />
                Nothing you don&apos;t.
              </>
            }
            lead="Honest previews, simple pricing and photos that stay private."
            align="center"
          />
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <Benefit icon={BadgeCheck} tone="brand" title="Likeness first" text="Every photo checked before you see it.">
              <div className="flex items-center gap-3 rounded-[12px] border border-border bg-surface p-3">
                <div className="relative size-14 shrink-0 overflow-hidden rounded-[10px] bg-surface-2">
                  <Image src={demoManifest.shoot["corporate-gray"]!} alt="" fill sizes="56px" className="object-cover object-top" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-text">Likeness check</p>
                  <p className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-semibold text-success-text">
                    <Check className="size-3" strokeWidth={3} aria-hidden="true" /> Passed
                  </p>
                </div>
              </div>
            </Benefit>
            <Benefit icon={Wallet} tone="info" title="One-time payment" text="No subscriptions. Credits never expire.">
              <div className="rounded-[12px] border border-border bg-surface p-3">
                <p className="text-overline text-muted">YOUR PACKAGE</p>
                <p className="mt-1 text-[14px] font-semibold text-text">Paid once · edit credits included</p>
                <p className="mt-2 inline-flex rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-muted">No renewal</p>
              </div>
            </Benefit>
            <Benefit icon={ShieldCheck} tone="success" title="Private by design" text="Selfies deleted 24h after your shoot.">
              <div className="flex flex-col gap-2">
                <p className="flex items-center gap-2 rounded-[10px] border border-border bg-surface px-3 py-2 text-[13px] font-semibold text-text">
                  <Check className="size-4 text-success-text" strokeWidth={3} aria-hidden="true" /> Selfies deleted after 24h
                </p>
                <p className="flex items-center gap-2 rounded-[10px] border border-border bg-surface px-3 py-2 text-[13px] font-semibold text-danger-text">
                  <Trash2 className="size-4" aria-hidden="true" /> Delete Now
                </p>
                <p className="rounded-[10px] bg-success-soft px-3 py-1.5 text-center text-[12px] font-semibold text-success-text">Photos kept 30 days</p>
              </div>
            </Benefit>
          </div>
          <ul className="mt-8 flex flex-wrap justify-center gap-x-10 gap-y-2">
            {["FREE PREVIEWS", "4K ON EVERY PLAN", "EDITS INCLUDED"].map((t) => (
              <li key={t} className="flex items-center gap-2 text-[12px] font-semibold tracking-[.08em] text-muted">
                <span className="size-1.5 rounded-full bg-brand" aria-hidden="true" />
                {t}
              </li>
            ))}
          </ul>
        </Section>

        {/* 7. Pricing teaser */}
        <Section aria-labelledby="pricing-title" className="pt-0 md:pt-0">
          <SectionHeading
            id="pricing-title"
            overline="PRICING"
            title="One-time packages"
            lead="4K, a commercial license and the likeness check on every plan."
            action={
              <Button asChild variant="secondary">
                <Link href="/pricing">
                  Compare plans
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            }
          />
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {shootPacks.map((pack) => (
              <PackCard
                key={pack.id}
                pack={pack}
                compact
                badge={pack.popular ? "MOST POPULAR" : undefined}
                action={
                  <Button asChild variant={pack.popular ? "primary" : "secondary"} className="w-full">
                    <Link href={`/shoot/new?pack=${pack.id}`}>Choose {pack.name}</Link>
                  </Button>
                }
              />
            ))}
          </div>
        </Section>

        {/* 8. Use cases */}
        <Section aria-labelledby="usecases-title" className="pt-0 md:pt-0">
          <SectionHeading id="usecases-title" overline="HEADSHOTS FOR" title="Made for where your photo will be seen" />
          <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {useCases.map((u) => (
              <li key={u.slug}>
                <Link
                  href={`/headshots/${u.slug}`}
                  className="group flex h-full items-center justify-between gap-2 rounded-[14px] border border-border bg-surface px-4 py-4 text-[15px] font-semibold text-text shadow-card transition-colors hover:border-brand"
                >
                  {u.label}
                  <ArrowRight className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-brand-text" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </Section>

        {/* 9. Free tools */}
        <Section aria-labelledby="tools-title" className="pt-0 md:pt-0">
          <SectionHeading id="tools-title" overline="FREE TOOLS" title="Free tools, no sign-up" lead="Both run entirely in your browser — your photos are never uploaded." />
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <ToolCard href="/tools/background-remover" icon={Eraser} title="Background Remover" text="Free, runs in your browser. Transparent, white, color or blurred backgrounds." />
            <ToolCard href="/tools/photo-editor" icon={SlidersHorizontal} title="Photo Editor" text="Crop, resize, adjust. Sizes for LinkedIn, Instagram and X." />
          </div>
        </Section>

        {/* 10. FAQ */}
        <Section id="faq" aria-labelledby="faq-title" className="pt-0 md:pt-0">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
            <SectionHeading className="self-start lg:sticky lg:top-[calc(var(--header-h)+24px)] md:items-start" id="faq-title" overline="FAQ" title="Frequently asked questions" lead={`Everything you need to know about ${brand.name}.`} />
            <FaqList items={homeFaq} jsonLd />
          </div>
        </Section>

        {/* 11. Final CTA */}
        <div className="pb-16 md:pb-24">
          <CtaCard title="Your next headshot is a few selfies away" />
        </div>
      </div>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: brand.name,
          url: brand.url,
          logo: `${brand.url}/icon.svg`,
        }}
      />
    </>
  );
}

function Benefit({
  icon: Icon,
  tone,
  title,
  text,
  children,
}: {
  icon: typeof Check;
  tone: "brand" | "info" | "success";
  title: string;
  text: string;
  children: React.ReactNode;
}) {
  const toneCls = tone === "brand" ? "bg-brand-soft text-brand-text" : tone === "success" ? "bg-success-soft text-success-text" : "border border-border bg-surface-2 text-text";
  return (
    <article className="flex flex-col rounded-[16px] border border-border bg-surface p-6 shadow-card">
      <span className={`flex size-12 items-center justify-center rounded-[12px] ${toneCls}`} aria-hidden="true">
        <Icon className="size-6" />
      </span>
      <h3 className="mt-4 text-h3 text-text">{title}</h3>
      <p className="mt-1 text-[15px] text-muted">{text}</p>
      <div className="mt-5 rounded-[14px] border border-border bg-surface-2 p-4">{children}</div>
    </article>
  );
}

function ToolCard({ href, icon: Icon, title, text }: { href: string; icon: typeof Check; title: string; text: string }) {
  return (
    <Link href={href} className="group flex items-start gap-4 rounded-[16px] border border-border bg-surface p-6 shadow-card transition-colors hover:border-brand">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-[12px] bg-brand-soft text-brand-text" aria-hidden="true">
        <Icon className="size-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-h3 text-text">
          {title}
          <ArrowRight className="size-5 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-brand-text" aria-hidden="true" />
        </span>
        <span className="mt-1 block text-[15px] text-muted">{text}</span>
      </span>
    </Link>
  );
}
