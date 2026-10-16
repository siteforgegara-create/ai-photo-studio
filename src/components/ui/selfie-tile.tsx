import Image from "next/image";
import { Check, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type SelfieVerdict = "ok" | "warn" | "reject" | "checking";

const verdictStyles: Record<Exclude<SelfieVerdict, "checking">, { icon: typeof Check; badge: string; text: string; label: string }> = {
  ok: { icon: Check, badge: "bg-success text-white", text: "text-success-text", label: "Passed" },
  warn: { icon: TriangleAlert, badge: "bg-warning-text text-white", text: "text-warning-text", label: "Warning" },
  reject: { icon: X, badge: "bg-danger text-white", text: "text-danger-text", label: "Not counted" },
};

/** SelfieTile — 1:1, ✓ / ⚠ / ✕ badge in the corner, reason below, remove button. */
export function SelfieTile({
  src,
  alt,
  verdict,
  reason,
  onRemove,
  className,
}: {
  src: string;
  alt: string;
  verdict: SelfieVerdict;
  reason: string;
  onRemove?: () => void;
  className?: string;
}) {
  const v = verdict === "checking" ? null : verdictStyles[verdict];
  const Icon = v?.icon;
  return (
    <figure className={cn("flex flex-col gap-1.5", className)}>
      <div className={cn("relative aspect-square overflow-hidden rounded-[12px] border border-border bg-surface-2", verdict === "reject" && "opacity-60")}>
        {src && <Image src={src} alt={alt} fill sizes="160px" className="object-cover" unoptimized={src.startsWith("blob:")} />}
        {verdict === "checking" && <span className="skeleton absolute inset-0" aria-hidden="true" />}
        {v && Icon && (
          <span className={cn("absolute top-2 left-2 flex size-6 items-center justify-center rounded-full shadow-sm", v.badge)} title={v.label}>
            <Icon className="size-3.5" strokeWidth={3} aria-hidden="true" />
            <span className="sr-only">{v.label}</span>
          </span>
        )}
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="absolute top-2 right-2 flex size-8 items-center justify-center rounded-full bg-overlay-chip text-white transition-opacity hover:opacity-90"
            aria-label={`Remove ${alt}`}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>
      <figcaption className={cn("text-[12px] leading-4 font-semibold", v ? v.text : "text-muted")}>{verdict === "checking" ? "Checking…" : reason}</figcaption>
    </figure>
  );
}
