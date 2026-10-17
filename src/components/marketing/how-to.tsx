import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type HowToStep = { icon: LucideIcon; title: string; text: string };

/** Numbered steps in a row of cards (How it works / tool how-to). */
export function HowToSteps({ steps, className }: { steps: readonly HowToStep[]; className?: string }) {
  return (
    <ol className={cn("grid gap-4", steps.length === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-3", className)}>
      {steps.map((s, i) => (
        <li key={s.title} className="flex gap-4 rounded-[16px] border border-border bg-surface p-5 shadow-card">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-[12px] bg-brand-soft text-brand-text" aria-hidden="true">
            <s.icon className="size-5" />
          </span>
          <div>
            <p className="text-[12px] font-semibold tracking-[.08em] text-muted uppercase">Step {i + 1}</p>
            <h3 className="mt-0.5 text-[16px] leading-6 font-bold text-text">{s.title}</h3>
            <p className="mt-1 text-[14px] leading-[22px] text-muted">{s.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
