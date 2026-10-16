import * as React from "react";
import { cn } from "@/lib/utils";

/** Card / Panel — surface, 1px border, radius 16, soft shadow in Light only. */
export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn("rounded-[16px] border border-border bg-surface p-4 shadow-card md:p-6", className)}
      {...props}
    />
  );
}

export const Panel = Card;

export function CardHeader({
  icon,
  title,
  description,
  action,
  className,
  titleAs: Title = "h2",
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  titleAs?: "h2" | "h3";
}) {
  return (
    <div className={cn("flex items-start gap-3", className)}>
      {icon && (
        <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-brand-soft text-brand [&_svg]:size-[18px]" aria-hidden="true">
          {icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <Title className="text-[18px] leading-6 font-bold">{title}</Title>
        {description && <p className="mt-0.5 text-[14px] leading-5 text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
