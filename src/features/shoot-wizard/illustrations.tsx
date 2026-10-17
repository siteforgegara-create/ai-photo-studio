/**
 * Schematic selfie tips (06-shoot-flow §1): simple SVG pictograms, no photos of people.
 * Colours come from tokens via `currentColor` and CSS variables.
 */
import { cn } from "@/lib/utils";

export type TipKind = "close" | "angles" | "daylight" | "no-glasses" | "group" | "sunglasses" | "filters" | "covered";

function Head({ x = 40, y = 34, r = 13, tilt = 0 }: { x?: number; y?: number; r?: number; tilt?: number }) {
  return (
    <g transform={`rotate(${tilt} ${x} ${y + r})`}>
      <path d={`M${x - r * 1.9} 80 C${x - r * 1.7} ${y + r * 1.3} ${x + r * 1.7} ${y + r * 1.3} ${x + r * 1.9} 80 Z`} fill="var(--border)" />
      <circle cx={x} cy={y} r={r} fill="var(--surface)" stroke="var(--text-muted)" strokeWidth="1.5" />
      <circle cx={x - r * 0.35} cy={y - r * 0.05} r="1.4" fill="var(--text-muted)" />
      <circle cx={x + r * 0.35} cy={y - r * 0.05} r="1.4" fill="var(--text-muted)" />
      <path d={`M${x - r * 0.3} ${y + r * 0.4} Q${x} ${y + r * 0.62} ${x + r * 0.3} ${y + r * 0.4}`} stroke="var(--text-muted)" strokeWidth="1.3" fill="none" strokeLinecap="round" />
    </g>
  );
}

export function TipIllustration({ kind, className }: { kind: TipKind; className?: string }) {
  return (
    <svg viewBox="0 0 80 80" className={cn("block h-auto w-full rounded-[10px] bg-surface-2", className)} aria-hidden="true">
      {kind === "close" && <Head r={19} y={36} />}
      {kind === "angles" && (
        <>
          <Head x={26} r={10} tilt={-14} />
          <Head x={54} r={10} tilt={14} />
        </>
      )}
      {kind === "daylight" && (
        <>
          <circle cx="64" cy="15" r="6" fill="var(--brand-to)" opacity=".85" />
          <Head />
        </>
      )}
      {kind === "no-glasses" && <Head r={15} />}
      {kind === "group" && (
        <>
          <Head x={22} r={9} y={38} />
          <Head x={40} r={10} y={34} />
          <Head x={58} r={9} y={38} />
        </>
      )}
      {kind === "sunglasses" && (
        <>
          <Head r={15} />
          <rect x="29" y="28.5" width="9" height="6" rx="2" fill="var(--text)" />
          <rect x="42" y="28.5" width="9" height="6" rx="2" fill="var(--text)" />
          <path d="M38 31h4" stroke="var(--text)" strokeWidth="1.5" />
        </>
      )}
      {kind === "filters" && (
        <>
          <Head r={15} />
          <rect x="0" y="0" width="80" height="80" fill="var(--brand-from)" opacity=".28" />
          <path d="M60 10l2 4 4 2-4 2-2 4-2-4-4-2 4-2z" fill="var(--brand-to)" />
        </>
      )}
      {kind === "covered" && (
        <>
          <Head r={15} />
          <path d="M22 44c8-8 28-8 36 0v8H22z" fill="var(--text-muted)" opacity=".75" />
        </>
      )}
    </svg>
  );
}

export function GeneratingIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 120" className={cn("h-auto w-40", className)} aria-hidden="true">
      <rect x="20" y="16" width="56" height="70" rx="10" fill="var(--surface-2)" stroke="var(--border)" />
      <rect x="52" y="26" width="56" height="70" rx="10" fill="var(--surface)" stroke="var(--border)" />
      <rect x="84" y="36" width="56" height="70" rx="10" fill="var(--brand-soft)" stroke="var(--brand)" />
      <circle cx="112" cy="62" r="11" fill="var(--surface)" stroke="var(--brand)" strokeWidth="1.5" />
      <path d="M94 106c2-14 34-14 36 0" fill="var(--surface)" stroke="var(--brand)" strokeWidth="1.5" />
      <path d="M138 22l3 6 6 3-6 3-3 6-3-6-6-3 6-3z" fill="url(#gen-g)" />
      <defs>
        <linearGradient id="gen-g" x1="0" x2="1">
          <stop offset="0" stopColor="var(--brand-from)" />
          <stop offset="1" stopColor="var(--brand-to)" />
        </linearGradient>
      </defs>
    </svg>
  );
}
