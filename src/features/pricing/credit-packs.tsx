"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, X } from "lucide-react";
import { creditPacks, formatPrice } from "@/config/packs";
import { billingService, ServiceError } from "@/services";
import { useSession } from "@/stores/session";
import { Button } from "@/components/ui/button";

/** Edit credit packs (M3). Guest → login with `next`; signed in → checkout (mock) → confirmation on return. */
export function CreditPacks() {
  const router = useRouter();
  const params = useSearchParams();
  const status = useSession((s) => s.status);
  const credits = useSession((s) => s.credits);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<{ tone: "success" | "error"; text: string } | null>(null);
  const confirmed = React.useRef<string | null>(null);

  // Return from checkout: `?checkout=success&ref=…` — confirm once, then clean the URL.
  const ref = params.get("checkout") === "success" ? params.get("ref") : null;
  React.useEffect(() => {
    if (!ref || status !== "authenticated" || confirmed.current === ref) return;
    confirmed.current = ref;
    void billingService
      .confirmCreditPurchase(ref)
      .then(({ credits: added }) => {
        setNotice({ tone: "success", text: `${added} credits added to your balance.` });
        void useSession.getState().refresh();
      })
      .catch((err) => setNotice({ tone: "error", text: err instanceof ServiceError ? err.message : "We couldn't confirm this order. Please contact support." }))
      .finally(() => router.replace("/pricing#credits", { scroll: false }));
  }, [ref, status, router]);

  const buy = async (packId: string) => {
    if (status !== "authenticated") {
      router.push(`/login?next=${encodeURIComponent("/pricing#credits")}`);
      return;
    }
    setBusy(packId);
    try {
      const { url } = await billingService.startCheckout({ kind: "credits", creditPackId: packId });
      router.push(url);
    } catch (err) {
      setNotice({ tone: "error", text: err instanceof ServiceError ? err.message : "Checkout is unavailable right now. Please try again." });
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      {notice && (
        <div
          role={notice.tone === "error" ? "alert" : "status"}
          className="mt-6 flex items-center justify-between gap-3 rounded-[12px] border border-border bg-surface px-4 py-3 shadow-card"
        >
          <p className={notice.tone === "success" ? "flex items-center gap-2 text-[14px] font-semibold text-success-text" : "text-[14px] font-semibold text-danger-text"}>
            {notice.tone === "success" && <CheckCircle2 className="size-4" aria-hidden="true" />}
            {notice.text}
          </p>
          <Button variant="ghost" size="icon-sm" aria-label="Dismiss" onClick={() => setNotice(null)}>
            <X aria-hidden="true" />
          </Button>
        </div>
      )}
      {status === "authenticated" && <p className="mt-4 text-[14px] font-medium text-text">Your balance: {credits} edit credits</p>}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {creditPacks.map((cp) => (
          <div key={cp.id} className="flex items-center justify-between gap-4 rounded-[16px] border border-border bg-surface p-5 shadow-card">
            <div>
              <p className="text-[22px] leading-7 font-extrabold text-text">{cp.credits} credits</p>
              <p
                className={
                  cp.priceUsd === null
                    ? "mt-1 inline-block rounded-full bg-warning-soft px-2 py-0.5 text-[12px] font-semibold text-warning-text"
                    : "mt-1 text-small text-muted"
                }
              >
                {formatPrice(cp.priceUsd)}
              </p>
            </div>
            <Button variant="secondary" loading={busy === cp.id} onClick={() => void buy(cp.id)} aria-label={`Buy ${cp.credits} credits`}>
              Buy
            </Button>
          </div>
        ))}
      </div>
    </>
  );
}
