import * as React from "react";
import { cn } from "@/lib/utils";

/** Marketing section heading: overline · H2 · lead. Centered or left-aligned. */
export function SectionHeading({
  id,
  overline,
  title,
  lead,
  align = "left",
  className,
  action,
}: {
  id?: string;
  overline?: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  align?: "left" | "center";
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-4", align === "center" ? "items-center text-center" : "md:flex-row md:items-end md:justify-between", className)}>
      <div className={cn(align === "center" ? "max-w-2xl" : "max-w-3xl")}>
        {overline && <p className="mb-2 text-overline text-brand-text">{overline}</p>}
        <h2 id={id} className="text-h2 text-text">
          {title}
        </h2>
        {lead && <p className="mt-3 text-[16px] leading-[26px] text-muted">{lead}</p>}
      </div>
      {action}
    </div>
  );
}

/** Vertical rhythm for marketing pages. */
export function Section({ className, ...props }: React.ComponentProps<"section">) {
  return <section className={cn("scroll-mt-28 py-14 md:py-20", className)} {...props} />;
}
