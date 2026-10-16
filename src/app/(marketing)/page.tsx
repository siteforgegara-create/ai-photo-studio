import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { demoManifest } from "@/config/demo-manifest";
import { Button } from "@/components/ui/button";
import { BeforeAfter, ExampleBadge } from "@/components/before-after";
import { StageNote } from "@/components/layout/page-stub";

const bullets = ["Free previews before you pay", "Every photo checked for likeness", "4K, commercial license, edits included"];

/** `/` — headshot-first landing. Stage 1: hero shell only; all sections land in Stage 4 (03-pages §1). */
export default function HomePage() {
  const hero = demoManifest.hero;
  return (
    <div className="container-page py-10 md:py-16">
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
                <span className="flex size-5 items-center justify-center rounded-full bg-brand-soft text-brand" aria-hidden="true">
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
          <p className="mt-4 text-small text-muted">From $29 · One-time payment · Full refund until you download</p>
        </div>
        <div className="mx-auto w-full max-w-[520px]">
          <BeforeAfter
            before={hero.before}
            after={hero.after}
            alt={hero.alt}
            priority
            sizes="(min-width: 1024px) 520px, 100vw"
            badge={<ExampleBadge />}
            className="shadow-card"
          />
        </div>
      </section>

      <StageNote
        stage={4}
        className="mt-14"
        items={[
          "Style strip under the hero (Corporate Gray, Minimal Beige, Modern Office, City Bokeh)",
          "Why it's different — comparison table",
          "How it works (#how-it-works) and Examples (#examples)",
          "Edits included mini-demo, Benefits, Pricing teaser",
          "Use cases, Free tools, FAQ (#faq), final CTA",
        ]}
      />
      <span id="how-it-works" />
      <span id="examples" />
    </div>
  );
}
