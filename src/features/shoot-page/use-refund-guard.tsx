"use client";

import * as React from "react";
import { shootsService, type RefundEligibility } from "@/services";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { DownloadGuard } from "./download-menu";

/**
 * M6: any download ends refund eligibility. While the shoot is still
 * refundable, the first download asks once: `Downloading ends your refund
 * eligibility. Continue?`. Used by Studio (Download ▾, Crop & Export).
 */
export function useRefundGuard(shootId: string | undefined) {
  const [refund, setRefund] = React.useState<RefundEligibility | null>(null);
  const [pending, setPending] = React.useState<null | (() => Promise<void>)>(null);

  const refresh = React.useCallback(async () => {
    if (!shootId) return;
    setRefund(await shootsService.refundEligibility(shootId).catch(() => null));
  }, [shootId]);

  React.useEffect(() => {
    if (!shootId) return;
    let alive = true;
    void shootsService
      .refundEligibility(shootId)
      .catch(() => null)
      .then((r) => alive && setRefund(r));
    return () => {
      alive = false;
    };
  }, [shootId]);

  const guard: DownloadGuard = React.useCallback(
    (action) => {
      if (refund?.eligible) setPending(() => action);
      else void action();
    },
    [refund],
  );

  const dialog = (
    <ConfirmDialog
      open={pending !== null}
      onOpenChange={(o) => !o && setPending(null)}
      title="Downloading ends your refund eligibility. Continue?"
      description="Packages are fully refundable until your first download — in any format, or the ZIP."
      confirmLabel="Download"
      onConfirm={() => {
        const action = pending;
        setPending(null);
        if (action) void action().then(refresh);
      }}
    />
  );

  return { guard, dialog, refresh, eligible: !!refund?.eligible };
}
