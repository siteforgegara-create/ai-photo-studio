"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Image as ImageIcon, Shirt, SunMedium, Wand2, type LucideIcon } from "lucide-react";
import { getDemoPair, type DemoPair } from "@/config/demo-manifest";
import type { EditToolId } from "@/services/types";
import { BeforeAfter, ExampleBadge } from "@/components/before-after";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** Mini Studio demo (03-pages §1.5). Only prepared pairs; no requests (demo code never imports services). */
const tools: { id: EditToolId; label: string; icon: LucideIcon; option: string }[] = [
  { id: "background", label: "Background", icon: ImageIcon, option: "modern-office" },
  { id: "outfit", label: "Outfit", icon: Shirt, option: "navy-suit" },
  { id: "relight", label: "Relight", icon: SunMedium, option: "soft-studio" },
  { id: "retouch", label: "Retouch", icon: Wand2, option: "subtle" },
];

export function EditsDemo() {
  const available = tools.map((t) => ({ ...t, pair: getDemoPair(t.id, t.option) }));
  const [active, setActive] = React.useState<EditToolId>("background");
  const pair = available.find((t) => t.id === active)?.pair as DemoPair;

  return (
    <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.1fr] lg:gap-14">
      <div>
        <p className="text-overline text-brand-text">EDITS INCLUDED</p>
        <h2 id="edits-title" className="mt-2 text-h2 text-text">
          Fine-tune any photo after your shoot
        </h2>
        <p className="mt-3 text-[16px] leading-[26px] text-muted">
          Change the background, swap the outfit, fix the lighting or add a light retouch in the Studio. Every package includes edit credits, and you always see the cost before anything is generated.
        </p>
        <div role="toolbar" aria-label="Example edits" className="mt-6 flex flex-wrap gap-2">
          {available.map((t) => {
            const button = (
              <Button
                key={t.id}
                variant="secondary"
                aria-pressed={t.pair ? active === t.id : undefined}
                // No prepared example yet: stays focusable so the tooltip is reachable by keyboard.
                aria-disabled={!t.pair || undefined}
                onClick={() => t.pair && setActive(t.id)}
                className={cn(active === t.id && "border-brand bg-brand-soft text-brand-text", !t.pair && "cursor-not-allowed opacity-50")}
              >
                <t.icon aria-hidden="true" />
                {t.label}
              </Button>
            );
            return t.pair ? (
              button
            ) : (
              <Tooltip key={t.id} content="Example coming soon">
                {button}
              </Tooltip>
            );
          })}
        </div>
        <Button asChild variant="primary" size="lg" className="mt-8">
          <Link href="/studio">
            Explore the Studio
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </div>
      <div className="mx-auto w-full max-w-[480px]">
        <BeforeAfter before={pair.before} after={pair.after} alt={pair.alt} badge={<ExampleBadge />} sizes="(min-width: 1024px) 480px, 100vw" className="aspect-[4/5] shadow-card" />
      </div>
    </div>
  );
}
