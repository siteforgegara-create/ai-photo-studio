"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Mail } from "lucide-react";
import { shootsService, type Shoot } from "@/services";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressCount } from "@/components/ui/progress-count";
import { GeneratingIllustration } from "../illustrations";

/** Step 5 — Done / Generating (06-shoot-flow §1). Real counter, no percentages or timers. */
export function DoneStep({ shootId, onOpen }: { shootId: string; onOpen: () => void }) {
  const [shoot, setShoot] = React.useState<Shoot | null>(null);
  React.useEffect(() => shootsService.subscribe(shootId, ({ shoot: s }) => setShoot(s)), [shootId]);
  const ready = shoot?.status === "ready";

  return (
    <Card className="mx-auto flex max-w-xl flex-col items-center gap-6 py-10 text-center md:py-12">
      <GeneratingIllustration />
      <div>
        <h1 className="text-h1 text-text">{ready ? "Your headshots are ready" : "Your shoot is in progress"}</h1>
        <p className="mt-3 flex items-start justify-center gap-2 text-body text-muted">
          <Mail className="mt-1 size-4 shrink-0" aria-hidden="true" />
          We&apos;ll email you when your headshots are ready — you can close this page.
        </p>
      </div>
      {shoot && <ProgressCount ready={shoot.readyCount} total={shoot.targetCount} className="max-w-sm text-left" />}
      <Button asChild variant="primary" size="lg">
        <Link href={`/shoot/${shootId}`} onClick={onOpen}>
          Open my shoot
          <ArrowRight aria-hidden="true" />
        </Link>
      </Button>
    </Card>
  );
}
