import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getUseCase, useCases } from "@/config/use-cases";
import { getStyle } from "@/config/styles";
import { Button } from "@/components/ui/button";
import { PageHeading, StageNote } from "@/components/layout/page-stub";

export function generateStaticParams() {
  return useCases.map((u) => ({ useCase: u.slug }));
}

export async function generateMetadata({ params }: PageProps<"/headshots/[useCase]">): Promise<Metadata> {
  const { useCase } = await params;
  const uc = getUseCase(useCase);
  if (!uc) return {};
  return {
    title: uc.title,
    description: uc.description,
    alternates: { canonical: `/headshots/${uc.slug}` },
    openGraph: { title: uc.title, description: uc.description },
  };
}

/** `/headshots/[useCase]` — SSG from use-cases.ts. Full copy in Stage 4 (03-pages §3). */
export default async function UseCasePage({ params }: PageProps<"/headshots/[useCase]">) {
  const { useCase } = await params;
  const uc = getUseCase(useCase);
  if (!uc) notFound();

  return (
    <div className="container-page py-12 md:py-16">
      <PageHeading
        overline="AI HEADSHOTS"
        title={uc.h1}
        lead={uc.description}
        action={
          <Button asChild variant="primary" size="lg">
            <Link href={`/shoot/new?useCase=${uc.slug}`}>
              Get your free preview
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        }
      />
      <section className="mt-10" aria-labelledby="styles-title">
        <h2 id="styles-title" className="text-h3 text-text">
          Recommended styles
        </h2>
        <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:max-w-3xl">
          {uc.recommendedStyles.map((id) => {
            const style = getStyle(id);
            if (!style) return null;
            return (
              <li key={id} className="overflow-hidden rounded-[12px] border border-border bg-surface">
                <div className="relative aspect-[4/5] bg-surface-2">
                  {style.previewImage ? (
                    <>
                      <Image src={style.previewImage} alt={`${style.name} — example`} fill sizes="(min-width: 768px) 240px, 50vw" className="object-cover" />
                      <span className="absolute bottom-2 left-2 rounded-[6px] bg-overlay-chip px-2 py-0.5 text-[11px] font-semibold text-white">Example</span>
                    </>
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center p-3 text-center text-small text-muted">Example coming soon</span>
                  )}
                </div>
                <p className="px-3 py-2 text-[13px] font-semibold text-text">{style.name}</p>
              </li>
            );
          })}
        </ul>
      </section>
      <StageNote
        stage={4}
        className="mt-12"
        items={["Full page copy (≥ 400 words)", "3–5 practical tips for this use case", "How it works (short)", "3–4 FAQ + FAQPage JSON-LD", "Final CTA, OG image"]}
      />
    </div>
  );
}
