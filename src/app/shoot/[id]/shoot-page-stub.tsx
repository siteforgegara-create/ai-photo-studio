"use client";

import * as React from "react";
import Link from "next/link";
import { getShootPack } from "@/config/packs";
import { shootsService, type Shoot } from "@/services";
import { useSession } from "@/stores/session";
import { RequireAuth } from "@/components/layout/require-auth";
import { PageHeading, StageNote } from "@/components/layout/page-stub";
import { ProgressCount } from "@/components/ui/progress-count";
import { Button } from "@/components/ui/button";
import { formatDate, pluralize } from "@/lib/utils";

export function ShootPageStub({ id }: { id: string }) {
  return (
    <RequireAuth>
      <Inner id={id} />
    </RequireAuth>
  );
}

function Inner({ id }: { id: string }) {
  const user = useSession((s) => s.user);
  const [shoot, setShoot] = React.useState<Shoot | null | undefined>(undefined);

  React.useEffect(() => {
    let alive = true;
    void shootsService.get(id).then((s) => alive && setShoot(s));
    const off = shootsService.subscribe(id, (u) => alive && setShoot(u.shoot));
    return () => {
      alive = false;
      off();
    };
  }, [id, user?.id]);

  if (shoot === undefined) {
    return (
      <div className="container-page py-12">
        <div className="h-10 w-72 rounded skeleton" />
      </div>
    );
  }
  if (shoot === null) {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="text-h1 text-text">Shoot not found</h1>
        <p className="mt-3 text-body text-muted">This shoot doesn&apos;t exist or belongs to another account.</p>
        <Button asChild variant="secondary" className="mt-6">
          <Link href="/">Go to homepage</Link>
        </Button>
      </div>
    );
  }

  const pack = getShootPack(shoot.pack);
  return (
    <div className="container-page py-8 md:py-12">
      <PageHeading
        overline="MY SHOOT"
        title={`${shoot.title ?? pack.name} · ${formatDate(shoot.createdAt)}`}
        lead={`${pluralize(shoot.targetCount, "photo")} · ${pluralize(shoot.styleIds.length, "style")} · ${shoot.editCreditsLeft} edit credits left`}
      />
      {shoot.status === "generating" && (
        <div className="mt-6 max-w-md rounded-[16px] border border-border bg-surface p-5 shadow-card">
          <ProgressCount ready={shoot.readyCount} total={shoot.targetCount} />
        </div>
      )}
      {shoot.expiresAt && (
        <p className="mt-6 rounded-[12px] bg-warning-soft px-4 py-3 text-[14px] font-medium text-warning-text">
          Photos are stored until {formatDate(shoot.expiresAt)}. Download your favorites before then.
        </p>
      )}
      <StageNote
        stage={2}
        className="mt-8"
        items={["Filters (All · ★ Favorites · styles), S/L tiles", "4:5 grid with favorite / download / Edit in Studio", "Lightbox with download formats", "ZIP, refund guarantee dialog, Delete now / Rename"]}
      />
    </div>
  );
}
