import { cn } from "@/lib/utils";

/** `18 of 50 photos ready` + bar driven by the real counter (no fake percentages). */
export function ProgressCount({ ready, total, unit = "photos", className }: { ready: number; total: number; unit?: string; className?: string }) {
  const value = total > 0 ? Math.min(ready, total) : 0;
  return (
    <div className={cn("w-full", className)}>
      <p className="text-[14px] leading-5 font-semibold text-text" aria-live="polite">
        {value} of {total} {unit} ready
      </p>
      <div
        role="progressbar"
        aria-label={`${unit} ready`}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={value}
        aria-valuetext={`${value} of ${total} ${unit} ready`}
        className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-2"
      >
        <div className="h-full rounded-full bg-brand-gradient transition-[width] duration-300 ease-out" style={{ width: `${total ? (value / total) * 100 : 0}%` }} />
      </div>
    </div>
  );
}
