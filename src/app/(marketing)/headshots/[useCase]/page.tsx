import type { Metadata } from "next";
import { StylePlaceholder } from "@/components/marketing/style-placeholder";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, Download, Images, ImageUp, Lightbulb } from "lucide-react";
import { brand } from "@/config/brand";
import { demoManifest } from "@/config/demo-manifest";
import { getStyle } from "@/config/styles";
import { getUseCase, useCases } from "@/config/use-cases";
import { BeforeAfter, ExampleBadge } from "@/components/before-after";
import { Button } from "@/components/ui/button";
import { CtaCard } from "@/components/marketing/cta-card";
import { FaqList } from "@/components/marketing/faq";
import { HowToSteps } from "@/components/marketing/how-to";
import { JsonLd } from "@/components/marketing/json-ld";
import { Section, SectionHeading } from "@/components/marketing/section";

export function generateStaticParams() {
  return useCases.map((u) => ({ useCase: u.slug }));
}

export async function generateMetadata({ params }: PageProps<"/headshots/[useCase]">): Promise<Metadata> {
  const { useCase } = await params;
  const uc = getUseCase(useCase);
  if (!uc) return {};
  const url = `/headshots/${uc.slug}`;
  return {
    title: uc.title,
    description: uc.description,
    alternates: { canonical: url },
    openGraph: { title: `${uc.title} · ${brand.name}`, description: uc.description, url },
  };
}

const steps = [
  { icon: ImageUp, title: "Upload 4–8 selfies", text: "Checked instantly in your browser for blur, light and size." },
  { icon: Images, title: "See 4 free previews", text: "Watermarked previews in two styles before you pay." },
  { icon: Download, title: "Download your headshots", text: "4K photos, each checked for likeness, ready to use." },
] as const;

/** `/headshots/[useCase]` — SSG from use-cases.ts (03-pages §3). Unknown slugs → 404 (src/proxy.ts). */
export default async function UseCasePage({ params }: PageProps<"/headshots/[useCase]">) {
  const { useCase } = await params;
  const uc = getUseCase(useCase);
  if (!uc) notFound();
  const cta = `/shoot/new?useCase=${uc.slug}`;
  const heroAfter = getStyle(uc.recommendedStyles[0]!)?.previewImage ?? demoManifest.hero.after;

  return (
    <div className="container-page pt-10 md:pt-16">
      {/* Hero */}
      <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-14" aria-labelledby="uc-title">
        <div>
          <nav aria-label="Breadcrumb" className="mb-4 text-small text-muted">
            <Link href="/" className="hover:text-text">
              Home
            </Link>
            <span aria-hidden="true"> / </span>
            <span>Headshots for {uc.label}</span>
          </nav>
          <p className="text-overline text-brand-text">AI HEADSHOTS · {uc.label.toUpperCase()}</p>
          <h1 id="uc-title" className="mt-3 text-display text-text">
            {uc.h1}
          </h1>
          <p className="mt-5 max-w-xl text-[17px] leading-7 text-muted">{uc.lead}</p>
          <ul className="mt-6 flex flex-col gap-2.5">
            {["Free previews before you pay", "Every photo checked for likeness", "4K, commercial license, edits included"].map((b) => (
              <li key={b} className="flex items-center gap-2.5 text-[15px] font-medium text-text">
                <span className="flex size-5 items-center justify-center rounded-full bg-brand-soft text-brand-text" aria-hidden="true">
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
                {b}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild variant="primary" size="lg">
              <Link href={cta}>
                Get your free preview
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="/pricing">See pricing</Link>
            </Button>
          </div>
        </div>
        <div className="mx-auto w-full max-w-[460px]">
          <BeforeAfter
            before={demoManifest.hero.before}
            after={heroAfter}
            alt="Example: a casual selfie and the same person as a professional headshot"
            beforeLabel="Selfie"
            afterLabel="Headshot"
            badge={<ExampleBadge />}
            priority
            sizes="(min-width: 1024px) 460px, 100vw"
            className="aspect-[4/5] shadow-card"
          />
        </div>
      </section>

      {/* Intro + guide */}
      <Section aria-labelledby="guide-title">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div className="flex max-w-[68ch] flex-col gap-4 text-[16px] leading-[27px] text-text">
            {uc.intro.map((p) => (
              <p key={p.slice(0, 24)}>{p}</p>
            ))}
            <h2 id="guide-title" className="mt-6 text-h2 text-text">
              {uc.guide.title}
            </h2>
            {uc.guide.paragraphs.map((p) => (
              <p key={p.slice(0, 24)}>{p}</p>
            ))}
          </div>
          <aside aria-labelledby="tips-title" className="h-fit rounded-[16px] border border-border bg-surface p-6 shadow-card lg:sticky lg:top-[calc(var(--header-h)+24px)]">
            <h2 id="tips-title" className="flex items-center gap-2 text-h3 text-text">
              <Lightbulb className="size-5 text-brand-text" aria-hidden="true" />
              Practical tips
            </h2>
            <ol className="mt-4 flex flex-col gap-4">
              {uc.tips.map((t, i) => (
                <li key={t.title} className="flex gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[12px] font-bold text-brand-text" aria-hidden="true">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="text-[15px] leading-6 font-bold text-text">{t.title}</h3>
                    <p className="mt-0.5 text-[14px] leading-[22px] text-muted">{t.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </Section>

      {/* Recommended styles */}
      <Section aria-labelledby="styles-title" className="pt-0 md:pt-0">
        <SectionHeading id="styles-title" overline="RECOMMENDED STYLES" title={`Styles that suit ${uc.label === "LinkedIn" || uc.label === "Resume" ? `a ${uc.label} photo` : uc.label.toLowerCase()}`} lead="Pre-selected for you when you start — you can change them at any time." />
        <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:max-w-4xl">
          {uc.recommendedStyles.map((id) => {
            const style = getStyle(id);
            if (!style) return null;
            return (
              <li key={id} className="overflow-hidden rounded-[12px] border border-border bg-surface">
                <div className="relative aspect-[4/5] bg-surface-2">
                  {style.previewImage ? (
                    <>
                      <Image src={style.previewImage} alt={`${style.name} — example`} fill sizes="(min-width: 768px) 280px, 50vw" className="object-cover" />
                      <span className="absolute bottom-2 left-2 rounded-[6px] bg-overlay-chip px-2 py-0.5 text-[11px] font-semibold text-white">Example</span>
                    </>
                  ) : (
                    <StylePlaceholder style={style} />
                  )}
                </div>
                <div className="px-3 py-2.5">
                  <p className="text-[14px] font-semibold text-text">{style.name}</p>
                  <p className="mt-0.5 text-[13px] leading-[18px] text-muted">{style.description}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </Section>

      {/* How it works */}
      <Section aria-labelledby="how-title" className="pt-0 md:pt-0">
        <SectionHeading id="how-title" overline="HOW IT WORKS" title="Three steps to your new headshot" />
        <HowToSteps steps={steps} className="mt-8" />
      </Section>

      {/* FAQ */}
      <Section aria-labelledby="faq-title" className="pt-0 md:pt-0">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
          <SectionHeading className="self-start lg:sticky lg:top-[calc(var(--header-h)+24px)] md:items-start" id="faq-title" overline="FAQ" title={`${uc.label} headshots: common questions`} />
          <FaqList items={uc.faq} jsonLd />
        </div>
      </Section>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: brand.url },
            { "@type": "ListItem", position: 2, name: `Headshots for ${uc.label}`, item: `${brand.url}/headshots/${uc.slug}` },
          ],
        }}
      />
      <div className="pb-16 md:pb-24">
        <CtaCard title={`Get ${uc.label === "LinkedIn" || uc.label === "Resume" ? `your ${uc.label} headshot` : "your headshot"} — free preview first`} href={cta} />
      </div>
    </div>
  );
}
