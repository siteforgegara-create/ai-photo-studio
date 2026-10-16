import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { creditPacks, formatPrice, shootPacks } from "@/config/packs";
import { Button } from "@/components/ui/button";
import { PackCard } from "@/components/ui/pack-card";
import { StageNote } from "@/components/layout/page-stub";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Studio headshots. Pay once. See free previews first — no subscriptions, 4K on every plan.",
};

const points = ["No subscriptions", "4K on every plan", "Full refund until you download"];

/** `/pricing` — Stage 1 shell from the Pricing reference; comparison, guarantee, FAQ land in Stage 4. */
export default function PricingPage() {
  return (
    <div className="container-page py-12 md:py-16">
      <section className="text-center" aria-labelledby="pricing-title">
        <p className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--brand)_30%,var(--border))] bg-brand-soft px-4 py-1.5 text-overline text-brand-text">
          <Sparkles className="size-3.5" aria-hidden="true" />
          ONE-TIME PAYMENT
        </p>
        <h1 id="pricing-title" className="mt-6 text-display text-text">
          Studio headshots. <span className="text-brand-gradient">Pay once.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-[17px] leading-7 text-muted">
          See free previews first. Choose a package only when you love the result.
        </p>
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

      <section id="credits" className="mt-16 scroll-mt-28" aria-labelledby="credits-title">
        <h2 id="credits-title" className="text-h2 text-text">
          Edit credits
        </h2>
        <p className="mt-2 text-body text-muted">
          Background, outfit, retouch, relight — 1 credit per variant · Creative styles and Place Me Here — 2 credits · Crop &amp; export — free
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {creditPacks.map((cp) => (
            <div key={cp.id} className="flex items-center justify-between gap-4 rounded-[16px] border border-border bg-surface p-5 shadow-card">
              <div>
                <p className="text-[22px] leading-7 font-extrabold text-text">{cp.credits} credits</p>
                <p className={cp.priceUsd === null ? "mt-1 inline-block rounded-full bg-warning-soft px-2 py-0.5 text-[12px] font-semibold text-warning-text" : "mt-1 text-small text-muted"}>
                  {formatPrice(cp.priceUsd)}
                </p>
              </div>
              <Button asChild variant="secondary">
                <Link href="/login?next=%2Fpricing%23credits">Buy</Link>
              </Button>
            </div>
          ))}
        </div>
      </section>

      <StageNote
        stage={4}
        className="mt-14"
        items={["Compare plans table", "Our guarantee card", "Teams waitlist strip", "Mini-FAQ about payments and refunds", "Buy flow for signed-in users (mock checkout)"]}
      />
    </div>
  );
}
