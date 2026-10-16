import * as React from "react";
import { Construction } from "lucide-react";
import { cn } from "@/lib/utils";

/** Page heading block: overline · H1 · lead. */
export function PageHeading({
  overline,
  title,
  lead,
  action,
  className,
}: {
  overline?: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4 md:flex-row md:items-end md:justify-between", className)}>
      <div className="max-w-3xl">
        {overline && <p className="mb-2 text-overline text-brand-text">{overline}</p>}
        <h1 className="text-h1 text-text">{title}</h1>
        {lead && <p className="mt-3 text-[17px] leading-7 text-muted">{lead}</p>}
      </div>
      {action}
    </div>
  );
}

/**
 * Placeholder card for screens that arrive in a later stage (docs/04-roadmap.md).
 * Visible on purpose so reviewers can tell scaffolding from finished UI.
 */
export function StageNote({ stage, items, className }: { stage: number; items: string[]; className?: string }) {
  return (
    <aside
      aria-label={`Planned for Stage ${stage}`}
      className={cn("rounded-[16px] border border-dashed border-border bg-surface-2 p-5 md:p-6", className)}
    >
      <p className="flex items-center gap-2 text-overline text-muted">
        <Construction className="size-4" aria-hidden="true" />
        Placeholder · built in Stage {stage}
      </p>
      <ul className="mt-3 grid gap-1.5 text-[14px] leading-[22px] text-muted sm:grid-cols-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-[9px] size-1 shrink-0 rounded-full bg-current" aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>
    </aside>
  );
}
