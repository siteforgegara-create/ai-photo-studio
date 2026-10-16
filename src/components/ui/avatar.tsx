import { cn, initials } from "@/lib/utils";

/** Initials on the brand gradient. */
export function Avatar({ name, className, size = 36 }: { name: string; className?: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full bg-brand-gradient font-bold text-white select-none", className)}
    >
      {initials(name)}
    </span>
  );
}
