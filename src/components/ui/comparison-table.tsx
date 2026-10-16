import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ComparisonRow = { typical: string; ours: string };

/**
 * Two columns: `Typical AI headshot apps` vs us (no competitor names, CLAUDE.md §3.2).
 * Table on ≥ 768 px, stacked cards on mobile.
 */
export function ComparisonTable({ rows, oursLabel, typicalLabel = "Typical AI headshot apps", caption, className }: {
  rows: ComparisonRow[];
  oursLabel: string;
  typicalLabel?: string;
  caption?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <table className="hidden w-full overflow-hidden rounded-[16px] border border-separate border-spacing-0 border-border bg-surface shadow-card md:table">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr>
            <th scope="col" className="w-1/2 border-b border-border px-6 py-4 text-left text-overline text-muted">{typicalLabel}</th>
            <th scope="col" className="w-1/2 border-b border-l border-border bg-brand-soft px-6 py-4 text-left text-overline text-brand-text">{oursLabel}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.ours}>
              <td className={cn("px-6 py-4 text-[15px] text-muted", i < rows.length - 1 && "border-b border-border")}>
                <span className="flex items-start gap-3">
                  <X className="mt-1 size-4 shrink-0 text-muted" aria-hidden="true" />
                  {r.typical}
                </span>
              </td>
              <td className={cn("border-l border-border px-6 py-4 text-[15px] font-semibold text-text", i < rows.length - 1 && "border-b")}>
                <span className="flex items-start gap-3">
                  <Check className="mt-1 size-4 shrink-0 text-success" strokeWidth={2.5} aria-hidden="true" />
                  {r.ours}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="flex flex-col gap-3 md:hidden" aria-label={caption}>
        {rows.map((r) => (
          <li key={r.ours} className="rounded-[16px] border border-border bg-surface p-4 shadow-card">
            <p className="text-overline text-muted">{typicalLabel}</p>
            <p className="mt-1 flex items-start gap-2 text-[14px] leading-5 text-muted">
              <X className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {r.typical}
            </p>
            <p className="mt-3 text-overline text-brand-text">{oursLabel}</p>
            <p className="mt-1 flex items-start gap-2 text-[14px] leading-5 font-semibold text-text">
              <Check className="mt-0.5 size-4 shrink-0 text-success" strokeWidth={2.5} aria-hidden="true" />
              {r.ours}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
