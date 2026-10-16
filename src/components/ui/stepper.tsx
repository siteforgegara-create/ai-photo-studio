import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Wizard stepper — number in a circle; active = gradient, done = ✓ success.
 * On mobile it collapses to `Step 2 of 5` + a bar.
 */
export function Stepper({ steps, current, className }: { steps: string[]; current: number; className?: string }) {
  const total = steps.length;
  return (
    <nav aria-label="Progress" className={className}>
      <div className="md:hidden">
        <p className="text-small text-muted">
          Step {current + 1} of {total} · <span className="font-semibold text-text">{steps[current]}</span>
        </p>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
          <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${((current + 1) / total) * 100}%` }} />
        </div>
      </div>
      <ol className="hidden flex-wrap items-center gap-x-2 gap-y-3 md:flex">
        {steps.map((label, i) => {
          const state = i < current ? "done" : i === current ? "active" : "todo";
          return (
            <li key={label} className="flex items-center gap-2" aria-current={state === "active" ? "step" : undefined}>
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold",
                  state === "active" && "bg-brand-gradient text-white",
                  state === "done" && "bg-success-soft text-success-text",
                  state === "todo" && "border border-border bg-surface text-muted",
                )}
              >
                {state === "done" ? <Check className="size-4" strokeWidth={3} aria-label="Completed" /> : i + 1}
              </span>
              <span className={cn("text-[13px] font-semibold whitespace-nowrap", state === "todo" ? "text-muted" : "text-text")}>{label}</span>
              {i < total - 1 && <span className="mx-1 h-px w-8 bg-border lg:w-12" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
