import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, Check, Minus, ShieldCheck, Sparkles, Users } from "lucide-react";
import { brand } from "@/config/brand";
import { shootPacks } from "@/config/packs";
import { Button } from "@/components/ui/button";
import { PackCard } from "@/components/ui/pack-card";
import { FaqList } from "@/components/marketing/faq";
import { JsonLd } from "@/components/marketing/json-ld";
import { Section, SectionHeading } from "@/components/marketing/section";
import { CreditPacks } from "@/features/pricing/credit-packs";

const description = "Studio headshots. Pay once. See free previews first — no subscriptions, 4K and a commercial license on every plan.";

export const metadata: Metadata = {
  title: "Pricing",
  description,
  alternates: { canonical: "/pricing" },
  openGraph: { title: `Pricing · ${brand.name}`, description, url: "/pricing" },
};

const points = ["No subscriptions", "4K on every plan", "Full refund until you download"];

type Cell = string | boolean;
const compareRows: { label: string; values: [Cell, Cell, Cell] }[] = [
  { label: "Selected photos", values: shootPacks.map((p) => String(p.photos)) as [string, string, string] },
  { label: "Styles", values: shootPacks.map((p) => (p.styles === "all" ? "All 12" : String(p.styles))) as [string, string, string] },
  { label: "Edit credits for the Studio", values: shootPacks.map((p) => String(p.editCredits)) as [string, string, string] },
  { label: "4K resolution", values: [true, true, true] },
  { label: "Commercial license", values: [true, true, true] },
  { label: "Likeness check on every photo", values: [true, true, true] },
  { label: "Free preview before you buy", values: [true, true, true] },
  { label: "Full refund until you download", values: [true, true, true] },
  { label: "Priority processing", values: shootPacks.map((p) => p.priority) as [boolean, boolean, boolean] },
];

const faq = [
  { q: "Is this a subscription?", a: "No. You pay once for a shoot. There is nothing to cancel, and your edit credits never expire." },
  {
    q: "How do refunds work?",
    a: "You get a full refund until your first download. Downloading any photo in any format, or the ZIP, ends refund eligibility — we ask you to confirm before the first one. Failed edits are refunded automatically, and unused credit packs can be refunded within 14 days.",
  },
  {
    q: "Can I use my credits on any photo?",
    a: "Yes. Credits from your package and credits you buy later go into one balance for your account, and you can spend them on any photo from any of your shoots.",
  },
  {
    q: "How much does an edit cost?",
    a: "Background, outfit, retouch and relight cost 1 credit per variant. Creative styles and Place Me Here cost 2 credits per variant. Crop & export is free. You always see the total and confirm before anything is generated.",
  },
] as const;

/** `/pricing` — layout from the Pricing reference, content from 03-pages §2. */
export default function PricingPage() {
  return (
    <div className="container-page pt-12 md:pt-16">
      <section className="text-center" aria-labelledby="pricing-title">
        <p className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--brand)_30%,var(--border))] bg-brand-soft px-4 py-1.5 text-overline text-brand-text">
          <Sparkles className="size-3.5" aria-hidden="true" />
          ONE-TIME PAYMENT
        </p>
        <h1 id="pricing-title" className="mt-6 text-display text-text">
          Studio headshots. <span className="text-brand-gradient">Pay once.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-[17px] leading-7 text-muted">See free previews first. Choose a package only when you love the result.</p>
        <ul className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2">
          {points.map((p) => (
            <li key={p} className="flex items-center gap-2 text-[14px] font-medium text-muted">
              <span className="flex size-5 items-center justify-center rounded-full bg-success-soft text-success-text" aria-hidden="true">
                <Check className="size-3" strokeWidth={3} />
              </span>
              {p}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-14 grid gap-6 md:grid-cols-3" aria-label="Shoot packages">
        {shootPacks.map((pack) => (
          <PackCard
            key={pack.id}
            pack={pack}
            badge={pack.popular ? "MOST POPULAR" : undefined}
            action={
              <Button asChild variant={pack.popular ? "primary" : "secondary"} size="lg" className="w-full">
                <Link href={`/shoot/new?pack=${pack.id}`}>
                  Choose {pack.name}
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            }
          />
        ))}
      </section>

      {/* Compare plans */}
      <Section aria-labelledby="compare-title">
        <SectionHeading id="compare-title" title="Compare plans" lead="Every plan includes the free preview, 4K photos, a commercial license and the likeness check." />
        <div className="mt-8 overflow-x-auto rounded-[16px] border border-border bg-surface shadow-card focus-visible:outline-2 focus-visible:outline-brand" tabIndex={0} role="region" aria-labelledby="compare-title">
          <table className="w-full min-w-[560px] border-collapse text-left">
            <caption className="sr-only">Comparison of the Essential, Professional and Executive packages</caption>
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="px-5 py-4 text-overline text-muted">
                  Included
                </th>
                {shootPacks.map((p) => (
                  <th key={p.id} scope="col" className={p.popular ? "bg-brand-soft px-5 py-4 text-center" : "px-5 py-4 text-center"}>
                    <span className="block text-[15px] font-bold text-text">{p.name}</span>
                    <span className="block text-[13px] font-medium text-muted">${p.priceUsd} one-time</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {compareRows.map((row) => (
                <tr key={row.label} className="border-b border-border last:border-b-0">
                  <th scope="row" className="px-5 py-3.5 text-[14px] font-medium text-text">
                    {row.label}
                  </th>
                  {row.values.map((v, i) => (
                    <td key={i} className={shootPacks[i]!.popular ? "bg-brand-soft px-5 py-3.5 text-center" : "px-5 py-3.5 text-center"}>
                      {typeof v === "boolean" ? (
                        v ? (
                          <Check className="mx-auto size-5 text-success-text" strokeWidth={2.5} aria-label="Included" />
                        ) : (
                          <Minus className="mx-auto size-5 text-muted" aria-label="Not included" />
                        )
                      ) : (
                        <span className="text-[15px] font-semibold text-text">{v}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Edit credits */}
      <section id="credits" className="scroll-mt-28" aria-labelledby="credits-title">
        <SectionHeading
          id="credits-title"
          title="Edit credits"
          lead="Background, outfit, retouch, relight — 1 credit per variant · Creative styles and Place Me Here — 2 credits · Crop & export — free"
        />
        <Suspense>
          <CreditPacks />
        </Suspense>
        <p className="mt-3 text-small text-muted">Credits never expire and work on any photo from any of your shoots.</p>
      </section>

      {/* Guarantee + Teams */}
      <div className="mt-14 grid gap-5 md:grid-cols-[1.4fr_1fr]">
        <section aria-labelledby="guarantee-title" className="flex gap-4 rounded-[16px] border border-border bg-surface p-6 shadow-card">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-[12px] bg-success-soft text-success-text" aria-hidden="true">
            <ShieldCheck className="size-6" />
          </span>
          <div>
            <h2 id="guarantee-title" className="text-h3 text-text">
              Our guarantee
            </h2>
            <p className="mt-1.5 text-[15px] leading-6 text-muted">
              Full refund until your first download. Failed edits are refunded automatically. Unused credit packs can be refunded within 14 days.
            </p>
          </div>
        </section>
        <Link
          href="/teams"
          className="group flex items-center gap-4 rounded-[16px] border border-border bg-surface p-6 shadow-card transition-colors hover:border-brand"
        >
          <span className="flex size-12 shrink-0 items-center justify-center rounded-[12px] bg-brand-soft text-brand-text" aria-hidden="true">
            <Users className="size-6" />
          </span>
          <span className="text-[15px] leading-6 font-semibold text-text">
            Need headshots for your whole team? <span className="text-brand-text">Join the Teams waitlist</span>
            <ArrowRight className="ml-1 inline size-4 text-brand-text transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </span>
        </Link>
      </div>

      {/* Mini FAQ */}
      <Section aria-labelledby="pricing-faq-title">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
          <SectionHeading className="self-start lg:sticky lg:top-[calc(var(--header-h)+24px)] md:items-start" id="pricing-faq-title" overline="FAQ" title="Payments and refunds" />
          <FaqList items={faq} jsonLd />
        </div>
      </Section>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: `${brand.name} headshot shoot`,
          description: brand.description,
          brand: { "@type": "Brand", name: brand.name },
          offers: shootPacks.map((p) => ({
            "@type": "Offer",
            name: p.name,
            price: String(p.priceUsd),
            priceCurrency: "USD",
            url: `${brand.url}/shoot/new?pack=${p.id}`,
            description: `${p.photos} photos · ${p.styles === "all" ? "all styles" : `${p.styles} styles`} · ${p.editCredits} edit credits`,
          })),
        }}
      />
    </div>
  );
}
