import { cn } from "@/lib/utils";

/**
 * Diagonal repeating `PREVIEW` (white, opacity .35) over an image.
 * In production the watermark is baked into the image on the server (B3);
 * this CSS overlay is the mock-stage stand-in.
 */
export function Watermark({ text = "PREVIEW", size = "md", className }: { text?: string; size?: "sm" | "md"; className?: string }) {
  const rows = Array.from({ length: 9 });
  return (
    <span aria-hidden="true" className={cn("pointer-events-none absolute inset-0 overflow-hidden select-none", className)}>
      <span className={cn("absolute -inset-1/2 flex rotate-[-30deg] flex-col justify-center", size === "sm" ? "gap-5" : "gap-10")}>
        {rows.map((_, i) => (
          <span key={i} className={cn("flex whitespace-nowrap font-extrabold tracking-[.2em] text-white/35", size === "sm" ? "gap-5 text-[11px]" : "gap-10 text-[22px]")} style={{ marginLeft: i % 2 ? (size === "sm" ? 30 : 60) : 0 }}>
            {Array.from({ length: 8 }).map((__, j) => (
              <span key={j}>{text}</span>
            ))}
          </span>
        ))}
      </span>
    </span>
  );
}
