"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getUseCase } from "@/config/use-cases";
import { PREVIEW_STYLE_COUNT } from "@/config/styles";
import { shootPacks } from "@/config/packs";
import { billingService, shootsService, ServiceError, type PackId } from "@/services";
import { useSession } from "@/stores/session";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Stepper } from "@/components/ui/stepper";
import { loginHref } from "@/lib/redirects";
import { clearSelfieFiles, loadSelfieFile } from "./selfie-files";
import { useWizard, WIZARD_STEPS, type WizardStep } from "./store";
import { SelfiesStep } from "./steps/selfies-step";
import { LookStep } from "./steps/look-step";
import { PreviewStep } from "./steps/preview-step";
import { PackageStep } from "./steps/package-step";
import { DoneStep } from "./steps/done-step";

const WIZARD_PATH = "/shoot/new";
const noop = () => () => {};

function useWizardHydrated() {
  return React.useSyncExternalStore(
    (cb) => useWizard.persist.onFinishHydration(cb),
    () => useWizard.persist.hasHydrated(),
    () => false,
  );
}

/**
 * `/shoot/new` — the main money path (06-shoot-flow §1).
 * Selfies → Your look → Free preview → Package → Done. State lives in a
 * persisted zustand store (metadata) + IndexedDB (files), so nothing is lost
 * when a guest signs in mid-way.
 */
export function ShootWizard() {
  const hydrated = useWizardHydrated();
  const mounted = React.useSyncExternalStore(noop, () => true, () => false);
  const router = useRouter();
  const params = useSearchParams();
  const { status, user } = useSession();
  const w = useWizard();
  const [gateOpen, setGateOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const handled = React.useRef<string | null>(null);

  const go = React.useCallback((step: WizardStep) => {
    useWizard.getState().setStep(step);
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, []);

  /* ── Deep links: ?pack=, ?useCase= ── */
  React.useEffect(() => {
    if (!hydrated) return;
    const pack = params.get("pack");
    if (pack && shootPacks.some((p) => p.id === pack)) useWizard.getState().setPack(pack as PackId);
    const uc = getUseCase(params.get("useCase") ?? "");
    if (uc && useWizard.getState().previewStyles.length === 0) {
      useWizard.getState().patch({ previewStyles: uc.recommendedStyles.slice(0, PREVIEW_STYLE_COUNT) });
    }
  }, [hydrated, params]);

  /* ── Server helpers ── */
  const ensureDraft = React.useCallback(async () => {
    const s = useWizard.getState();
    if (s.shootId) {
      const existing = await shootsService.get(s.shootId);
      if (existing && (existing.status === "draft" || existing.status === "preview_ready" || existing.status === "previewing")) {
        await shootsService.updateDraft(existing.id, { outfit: s.outfit ?? undefined, glasses: s.glasses });
        return existing.id;
      }
    }
    const draft = await shootsService.createDraft({ outfit: s.outfit ?? undefined, glasses: s.glasses, styleIds: s.previewStyles, pack: s.pack });
    useWizard.getState().patch({ shootId: draft.id });
    // A new draft needs every selfie uploaded again.
    useWizard.getState().patch({ selfies: useWizard.getState().selfies.map((x) => ({ ...x, uploadedId: undefined })) });
    return draft.id;
  }, []);

  const uploadPending = React.useCallback(async (shootId: string) => {
    for (const s of useWizard.getState().selfies) {
      if (s.status !== "done" || s.check?.verdict === "reject" || s.uploadedId) continue;
      const blob = await loadSelfieFile(s.localId);
      if (!blob) continue;
      const uploaded = await shootsService.uploadSelfie(shootId, blob, s.check!, s.localId);
      useWizard.getState().updateSelfie(s.localId, { uploadedId: uploaded.id });
    }
  }, []);

  const startPreview = React.useCallback(async () => {
    if (useSession.getState().status !== "authenticated") {
      useWizard.getState().patch({ intent: "preview" });
      setGateOpen(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const shootId = await ensureDraft();
      await uploadPending(shootId);
      if (useSession.getState().user?.previewUsed) {
        useWizard.getState().patch({ previewSkipped: true });
        go(3);
        return;
      }
      const s = useWizard.getState();
      await shootsService.requestPreview(shootId, [s.previewStyles[0]!, s.previewStyles[1]!]);
      await useSession.getState().refresh();
      go(2);
    } catch (e) {
      if (e instanceof ServiceError && e.code === "preview-used") {
        useWizard.getState().patch({ previewSkipped: true });
        go(3);
      } else {
        setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  }, [ensureDraft, uploadPending, go]);

  const checkout = React.useCallback(async () => {
    if (useSession.getState().status !== "authenticated") {
      setGateOpen(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const shootId = await ensureDraft();
      await uploadPending(shootId);
      const s = useWizard.getState();
      await shootsService.updateDraft(shootId, { pack: s.pack, styleIds: s.styles });
      const { url } = await billingService.startCheckout({ kind: "shoot", packId: s.pack, shootId });
      router.push(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout could not start. Please try again.");
      setBusy(false);
    }
  }, [ensureDraft, uploadPending, router]);

  /* ── Return from checkout (mock: success URL; B5: Lemon Squeezy webhook) ── */
  React.useEffect(() => {
    if (!hydrated || status !== "authenticated") return;
    const shootId = params.get("shoot");
    if (params.get("checkout") !== "success" || !shootId || handled.current === shootId) return;
    handled.current = shootId;
    const s = useWizard.getState();
    void (async () => {
      await shootsService.checkout(shootId, s.pack, s.styles);
      // Selfies are on the server now — drop the local copies.
      await clearSelfieFiles();
      useWizard.getState().patch({ step: 4, shootId, selfies: [], intent: undefined });
      await useSession.getState().refresh();
      router.replace(WIZARD_PATH);
    })();
  }, [hydrated, status, params, router]);

  /* ── Back from sign-in: continue where the guest stopped ── */
  React.useEffect(() => {
    if (!hydrated || status !== "authenticated" || w.intent !== "preview" || params.get("checkout")) return;
    // Deferred so the state updates of startPreview don't run inside the effect body.
    const t = window.setTimeout(() => {
      useWizard.getState().patch({ intent: undefined });
      if (useWizard.getState().step === 1) void startPreview();
    }, 0);
    return () => window.clearTimeout(t);
  }, [hydrated, status, w.intent, params, startPreview]);

  /* ── Guards ── */
  React.useEffect(() => {
    if (!hydrated || status === "loading") return;
    const s = useWizard.getState();
    if (status === "guest" && s.step >= 2 && s.step < 4) go(1);
    if (s.step === 2 && !s.shootId) go(1);
    if (s.step === 4 && !s.shootId) go(0);
  }, [hydrated, status, go]);

  if (!hydrated || !mounted) {
    return (
      <div aria-busy="true" className="flex flex-col gap-6">
        <div className="h-8 w-full max-w-2xl rounded skeleton" />
        <div className="h-10 w-80 rounded skeleton" />
        <div className="h-64 w-full rounded-[16px] skeleton" />
      </div>
    );
  }

  const previewUsed = !!user?.previewUsed;
  const current = w.step;

  return (
    <div className="flex flex-col gap-8">
      <Stepper steps={[...WIZARD_STEPS]} current={current} />

      {error && current !== 3 && (
        <p role="alert" className="rounded-[12px] border border-[color-mix(in_srgb,var(--danger)_35%,var(--border))] bg-surface px-4 py-3 text-[14px] font-medium text-danger-text">
          {error}
        </p>
      )}

      {current === 0 && <SelfiesStep onContinue={() => go(1)} />}
      {current === 1 && <LookStep previewUsed={previewUsed} busy={busy} onBack={() => go(0)} onContinue={() => void startPreview()} />}
      {current === 2 && w.shootId && (
        <PreviewStep
          shootId={w.shootId}
          onRetrySelfies={() => go(0)}
          onContinue={() => go(3)}
          onFailed={() => {
            void useSession.getState().refresh();
            go(1);
          }}
        />
      )}
      {current === 3 && <PackageStep busy={busy} error={error} onBack={() => go(w.previewSkipped ? 1 : 2)} onCheckout={() => void checkout()} />}
      {current === 4 && w.shootId && <DoneStep shootId={w.shootId} onOpen={() => useWizard.getState().reset()} />}

      {/* The route stays mounted (hidden) during navigation, so the gate closes explicitly and never shows to a signed-in user. */}
      <Dialog open={gateOpen && status !== "authenticated"} onOpenChange={setGateOpen}>
        <DialogContent>
          <DialogTitle>Create a free account to see your previews</DialogTitle>
          <DialogDescription>Your selfies stay on this device until you sign in. One free preview per account.</DialogDescription>
          <DialogFooter>
            <Button asChild variant="secondary">
              <Link href={loginHref(WIZARD_PATH)} onClick={() => setGateOpen(false)}>
                Log in
              </Link>
            </Button>
            <Button asChild variant="primary">
              <Link href={`/signup?next=${encodeURIComponent(WIZARD_PATH)}`} onClick={() => setGateOpen(false)}>
                Create free account
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
