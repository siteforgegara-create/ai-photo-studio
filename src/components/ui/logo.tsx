import Link from "next/link";
import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";

/**
 * Logo mark: our own 4-point spark in a gradient rounded square (01-design-system §4),
 * plus the working wordmark from brand.ts (P12).
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-brand-gradient shadow-[0_6px_14px_-6px_rgba(249,68,113,.6)]",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className="size-[62%] text-white" fill="currentColor">
        <path d="M11 3.2c.7 4.9 3.2 7.5 8 8.3-4.8.8-7.3 3.4-8 8.3-.7-4.9-3.2-7.5-8-8.3 4.8-.8 7.3-3.4 8-8.3Z" />
        <path d="M19 2.6c.25 1.6 1 2.4 2.5 2.65-1.5.25-2.25 1.05-2.5 2.65-.25-1.6-1-2.4-2.5-2.65 1.5-.25 2.25-1.05 2.5-2.65Z" opacity=".85" />
      </svg>
    </span>
  );
}

export function Logo({
  href = "/",
  className,
  compact = false,
  size = "md",
}: {
  href?: string | null;
  className?: string;
  /** Hide the wordmark on very narrow layouts. */
  compact?: boolean;
  size?: "sm" | "md";
}) {
  const content = (
    <>
      <LogoMark className={size === "sm" ? "size-8" : undefined} />
      <span className={cn("font-extrabold tracking-[-0.02em] whitespace-nowrap text-text", size === "sm" ? "text-[17px]" : "text-[20px]", compact && "sr-only")}>
        {brand.name}
      </span>
    </>
  );
  const cls = cn("inline-flex items-center gap-2.5 rounded-[10px]", className);
  if (href === null) return <span className={cls}>{content}</span>;
  return (
    <Link href={href} className={cls} aria-label={`${brand.name} — home`}>
      {content}
    </Link>
  );
}
