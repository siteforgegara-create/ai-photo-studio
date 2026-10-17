"use client";

import * as React from "react";
import { alwaysConfirmAboveCredits } from "@/config/packs";
import { editsService, ServiceError, type EditInput, type EditJob, type Quote, type ShootPhoto } from "@/services";
import { useSession } from "@/stores/session";
import { CUSTOM_OPTION, useStudio } from "./store";

export type JobView = { id: string; status: EditJob["status"]; variants: number; results: ShootPhoto[]; error?: string; createdAt: number };

const newKey = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `k_${Date.now()}_${Math.random().toString(36).slice(2)}`);

/** Builds the EditInput for the current tool / option / custom fields. */
export function buildInput(photoId: string): EditInput | null {
  const s = useStudio.getState();
  const optionId = s.optionByTool[s.tool];
  if (!optionId) return null;
  const custom = s.customByTool[s.tool] ?? {};
  if (optionId === CUSTOM_OPTION) {
    if (s.tool === "place") {
      if (!custom.sceneUploadId) return null;
      return { photoId, tool: s.tool, optionId, sceneUploadId: custom.sceneUploadId, customText: custom.placement?.trim() || undefined, variants: s.variants };
    }
    if (!custom.text?.trim()) return null;
    return { photoId, tool: s.tool, optionId, customText: custom.text.trim(), variants: s.variants };
  }
  const extras =
    s.tool === "retouch"
      ? Object.entries(s.toggles)
          .filter(([, on]) => on)
          .map(([id]) => id)
          .join(",")
      : s.tool === "background" && optionId === "solid-color"
        ? custom.color
        : undefined;
  return { photoId, tool: s.tool, optionId, customText: extras || undefined, variants: s.variants };
}

/**
 * Generate flow (02-studio §2, M7): quote → confirmation modal (`Don't ask
 * again`; always shown above 6 credits) → create(input, idempotencyKey) →
 * results in Edits. The idempotency key is created when the modal opens.
 * Only used in real mode — the demo never reaches this code.
 */
export function useGenerate({ photo, onResults }: { photo: ShootPhoto | null; onResults: (results: ShootPhoto[]) => void }) {
  const [confirm, setConfirm] = React.useState<{ quote: Quote; key: string; input: EditInput } | null>(null);
  // Jobs belong to one photo; switching photos shows that photo's own (empty) list.
  const [jobState, setJobState] = React.useState<{ photoId?: string; list: JobView[] }>({ list: [] });
  const jobs = jobState.photoId === photo?.id ? jobState.list : [];
  const photoId = photo?.id;
  const setJobs = React.useCallback(
    (fn: (list: JobView[]) => JobView[]) => setJobState((st) => ({ photoId, list: fn(st.photoId === photoId ? st.list : []) })),
    [photoId],
  );
  const subs = React.useRef(new Map<string, () => void>());

  React.useEffect(() => {
    const map = subs.current;
    return () => map.forEach((off) => off());
  }, []);

  const run = React.useCallback(
    async (input: EditInput, key: string, quote: Quote) => {
      const have = useSession.getState().credits;
      if (quote.credits > have) {
        useStudio.getState().patch({ job: { state: "insufficient-credits", needed: quote.credits, have } });
        return;
      }
      useStudio.getState().patch({ job: { state: "generating" } });
      try {
        const job = await editsService.create(input, key);
        setJobs((list) => [{ id: job.id, status: job.status, variants: input.variants, results: [], createdAt: Date.now() }, ...list.filter((j) => j.id !== job.id)]);
        useStudio.getState().patch({ job: { state: "generating", id: job.id } });
        const off = editsService.subscribe(job.id, (j) => {
          setJobs((list) => list.map((x) => (x.id === j.id ? { ...x, status: j.status, results: j.results, error: j.error?.message } : x)));
          if (j.status === "completed") {
            useStudio.getState().patch({ job: { state: "completed", id: j.id }, selectedEditId: j.results[0]?.id });
            const st = useStudio.getState();
            if (st.panel === "closed" && st.panelClosedByUser) st.patch({ panelDot: true });
            else st.patch({ tab: "edits" });
            onResults(j.results);
            subs.current.get(j.id)?.();
            subs.current.delete(j.id);
          } else if (j.status === "failed" || j.status === "blocked") {
            useStudio.getState().patch({ job: { state: "failed", id: j.id, error: "We couldn't complete this edit. Your credits were returned." } });
            void useSession.getState().refresh();
            subs.current.get(j.id)?.();
            subs.current.delete(j.id);
          }
        });
        subs.current.set(job.id, off);
      } catch (e) {
        if (e instanceof ServiceError && e.code === "insufficient-credits") {
          useStudio.getState().patch({ job: { state: "insufficient-credits", needed: quote.credits, have: useSession.getState().credits } });
        } else {
          useStudio.getState().patch({ job: { state: "failed", error: "We couldn't complete this edit. Your credits were returned." } });
        }
      }
    },
    [onResults, setJobs],
  );

  /** `Generate · N credits` was pressed. */
  const request = React.useCallback(async () => {
    if (!photo) return;
    const input = buildInput(photo.id);
    if (!input) return;
    const quote = await editsService.quote(input);
    const key = newKey();
    const { skipConfirm } = useStudio.getState();
    if (skipConfirm && quote.credits <= alwaysConfirmAboveCredits) {
      void run(input, key, quote);
    } else {
      useStudio.getState().patch({ job: { state: "awaiting-confirmation" } });
      setConfirm({ quote, key, input });
    }
  }, [photo, run]);

  const confirmRun = React.useCallback(
    (dontAskAgain: boolean) => {
      if (!confirm) return;
      if (dontAskAgain) useStudio.getState().patch({ skipConfirm: true });
      const c = confirm;
      setConfirm(null);
      void run(c.input, c.key, c.quote);
    },
    [confirm, run],
  );

  const cancel = React.useCallback(() => {
    setConfirm(null);
    useStudio.getState().patch({ job: { state: "idle" } });
  }, []);

  return { confirm, jobs, request, confirmRun, cancel };
}
