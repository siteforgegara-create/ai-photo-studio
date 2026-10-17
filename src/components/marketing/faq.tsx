import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { JsonLd, faqJsonLd, type FaqEntry } from "./json-ld";

/**
 * FAQ list on native `<details>/<summary>`: no client JavaScript (nothing to
 * hydrate on marketing pages), keyboard and screen-reader support built in,
 * and the answers stay in the HTML for search engines. `+` turns into `×` when open.
 * Optionally emits FAQPage JSON-LD for the same questions.
 */
export function FaqList({ items, jsonLd = false, className }: { items: readonly FaqEntry[]; jsonLd?: boolean; className?: string }) {
  return (
    <div className={cn("rounded-[16px] border border-border bg-surface px-4 shadow-card md:px-6", className)}>
      {items.map((f) => (
        <details key={f.q} className="group border-b border-border last:border-b-0">
          <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 py-3 text-left text-[15px] leading-6 font-semibold text-text transition-colors hover:text-brand-text [&::-webkit-details-marker]:hidden">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-surface-2 text-muted transition-transform duration-[160ms] group-open:rotate-45 group-open:text-brand-text">
              <Plus className="size-4" aria-hidden="true" />
            </span>
            {f.q}
          </summary>
          <div className="pr-2 pb-4 pl-10 text-[15px] leading-6 text-muted">{f.a}</div>
        </details>
      ))}
      {jsonLd && <JsonLd data={faqJsonLd(items)} />}
    </div>
  );
}
