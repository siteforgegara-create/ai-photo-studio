import Link from "next/link";
import { cn } from "@/lib/utils";

/** `● N credits` → /pricing#credits */
export function CreditsPill({ credits, className }: { credits: number; className?: string }) {
  return (
    <Link
      href="/pricing#credits"
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-full border border-border bg-surface px-3.5 text-[13px] font-semibold text-text whitespace-nowrap",
        "transition-colors duration-[120ms] hover:bg-surface-2",
        className,
      )}
      aria-label={`${credits} edit credits — buy more`}
    >
      <span className="size-2 rounded-full bg-brand-to" aria-hidden="true" />
      {credits} credits
    </Link>
  );
}
