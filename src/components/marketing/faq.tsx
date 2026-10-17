import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { JsonLd, faqJsonLd, type FaqEntry } from "./json-ld";

/** FAQ accordion; optionally emits FAQPage JSON-LD for the same questions. */
export function FaqList({ items, jsonLd = false, className }: { items: readonly FaqEntry[]; jsonLd?: boolean; className?: string }) {
  return (
    <div className={cn("rounded-[16px] border border-border bg-surface px-4 shadow-card md:px-6", className)}>
      <Accordion type="multiple">
        {items.map((f, i) => (
          <AccordionItem key={f.q} value={`q${i}`}>
            <AccordionTrigger>{f.q}</AccordionTrigger>
            <AccordionContent>{f.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      {jsonLd && <JsonLd data={faqJsonLd(items)} />}
    </div>
  );
}
