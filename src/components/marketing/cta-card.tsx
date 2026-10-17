import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Warm closing card (03-pages §1.11): title, primary CTA, three short points. */
export function CtaCard({
  title,
  lead,
  href = "/shoot/new",
  label = "Get your free preview",
  points = ["Free previews", "4K + commercial license", "Refund until you download"],
  className,
  headingLevel = "h2",
}: {
  title: string;
  lead?: string;
  href?: string;
  label?: string;
  points?: readonly string[];
  className?: string;
  headingLevel?: "h2" | "h3";
}) {
  const H = headingLevel;
  return (
    <div className={cn("relative overflow-hidden rounded-[20px] border border-[color-mix(in_srgb,var(--brand)_22%,var(--border))] bg-brand-soft px-6 py-10 text-center md:px-12 md:py-14", className)}>
      <div className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-brand-gradient opacity-[.12] blur-2xl" aria-hidden="true" />
      <H className="relative mx-auto max-w-2xl text-h2 text-text">{title}</H>
      {lead && <p className="relative mx-auto mt-3 max-w-xl text-[16px] leading-[26px] text-muted">{lead}</p>}
      <div className="relative mt-7 flex justify-center">
        <Button asChild variant="primary" size="lg">
          <Link href={href}>
            {label}
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </div>
      <ul className="relative mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2">
        {points.map((p) => (
          <li key={p} className="flex items-center gap-2 text-[14px] font-medium text-text">
            <Check className="size-4 text-success-text" strokeWidth={3} aria-hidden="true" />
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}
