"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Check, CircleAlert, X } from "lucide-react";
import { selfieCheckConfig, SELFIE_OK_COPY } from "@/config/selfie-check";
import { checkSelfie, preloadFaceDetector, summarizeSet, SelfieFileError, validateFile } from "@/features/selfie-check";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dropzone } from "@/components/ui/dropzone";
import { SelfieTile } from "@/components/ui/selfie-tile";
import { cn } from "@/lib/utils";
import { TipIllustration, type TipKind } from "../illustrations";
import { deleteSelfieFile, saveSelfieFile } from "../selfie-files";
import { dropSelfieUrl, registerSelfieUrl, useSelfieUrl } from "../selfie-urls";
import { useWizard, type WizardSelfie } from "../store";

const good: [TipKind, string][] = [
  ["close", "Face fills the frame"],
  ["angles", "Different angles"],
  ["daylight", "Soft daylight"],
  ["no-glasses", "No glasses"],
];
const avoid: [TipKind, string][] = [
  ["group", "Group photos"],
  ["sunglasses", "Sunglasses"],
  ["filters", "Heavy filters"],
  ["covered", "Covered face"],
];

const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `s_${Date.now()}_${Math.random().toString(36).slice(2)}`);

/** Step 1 — Selfies (06-shoot-flow §1). Everything here runs locally; nothing is uploaded. */
export function SelfiesStep({ onContinue }: { onContinue: () => void }) {
  const { selfies, consent, setConsent, addSelfie, updateSelfie, removeSelfie } = useWizard();
  const [notices, setNotices] = React.useState<string[]>([]);
  const queue = React.useRef(Promise.resolve());
  const consentId = React.useId();

  React.useEffect(() => preloadFaceDetector(), []);

  const summary = summarizeSet(selfies.filter((s) => s.status === "done").map((s) => s.check!.verdict));
  const checking = selfies.some((s) => s.status === "checking");
  const canContinue = summary.missing === 0 && consent && !checking;

  const onFiles = (files: File[]) => {
    const messages: string[] = [];
    const room = selfieCheckConfig.maxSelfies - useWizard.getState().selfies.length;
    if (files.length > room) messages.push(`You can add up to ${selfieCheckConfig.maxSelfies} photos.`);
    for (const file of files.slice(0, Math.max(0, room))) {
      try {
        validateFile(file);
      } catch (e) {
        messages.push(`${file.name}: ${e instanceof Error ? e.message : "Unsupported file."}`);
        continue;
      }
      const localId = newId();
      addSelfie({ localId, name: file.name, status: "checking" });
      // Sequential, so duplicate detection sees earlier selfies.
      queue.current = queue.current.then(() => runCheck(localId, file));
    }
    setNotices(messages);
  };

  const runCheck = async (localId: string, file: File) => {
    try {
      const previous = useWizard
        .getState()
        .selfies.filter((s) => s.localId !== localId && s.hash && s.check?.verdict !== "reject")
        .map((s) => ({ localId: s.localId, hash: s.hash! }));
      const result = await checkSelfie(file, previous);
      await saveSelfieFile(localId, result.blob);
      registerSelfieUrl(localId, result.blob);
      const { reasonCodes, ...check } = result.check;
      updateSelfie(localId, { status: "done", check, reasonCodes, hash: result.hash });
    } catch (e) {
      updateSelfie(localId, {
        status: "error",
        error: e instanceof SelfieFileError ? e.message : "We couldn't check this photo. Remove it and try again.",
      });
    }
  };

  const remove = (s: WizardSelfie) => {
    removeSelfie(s.localId);
    dropSelfieUrl(s.localId);
    void deleteSelfieFile(s.localId);
  };

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-h1 text-text">Upload 4–8 selfies</h1>
        <p className="mt-2 text-[17px] leading-7 text-muted">Different angles and lighting help us capture the real you.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="flex flex-col gap-4">
          <Dropzone
            title="Drop your selfies here"
            hint={`JPEG, PNG, WebP or HEIC · up to 15 MB each · ${selfies.length} of ${selfieCheckConfig.maxSelfies} added`}
            accept={[...selfieCheckConfig.acceptedMimeTypes, ...selfieCheckConfig.acceptedExtensions].join(",")}
            disabled={selfies.length >= selfieCheckConfig.maxSelfies}
            onFiles={onFiles}
            className="min-h-64"
          >
            <span className="text-small text-muted">Checked in your browser — nothing is uploaded yet.</span>
          </Dropzone>
          {notices.length > 0 && (
            <div role="alert" className="rounded-[12px] bg-warning-soft px-4 py-3 text-[14px] text-warning-text">
              {notices.map((n) => (
                <p key={n}>{n}</p>
              ))}
            </div>
          )}
        </div>

        <Card className="flex flex-col gap-5">
          <TipColumn title="Good" tone="good" items={good} />
          <TipColumn title="Avoid" tone="avoid" items={avoid} />
        </Card>
      </div>

      {selfies.length > 0 && (
        <section aria-labelledby="selfies-title">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="selfies-title" className="text-h3 text-text">
              Your selfies
            </h2>
            <SetSummary usable={summary.usable} required={summary.required} missing={summary.missing} checking={checking} />
          </div>
          <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
            {selfies.map((s, i) => (
              <li key={s.localId}>
                <SelfieItem selfie={s} index={i} onRemove={() => remove(s)} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-col gap-4 border-t border-border pt-6 md:flex-row md:items-center md:justify-between">
        <label htmlFor={consentId} className="flex max-w-2xl cursor-pointer items-start gap-3 text-[14px] leading-[22px] text-text">
          <Checkbox id={consentId} checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" aria-required="true" />
          <span>
            These photos are of me, or I have explicit permission from the adult pictured.{" "}
            <Link href="/terms" className="font-semibold text-brand-text underline-offset-2 hover:underline" target="_blank">
              Terms
            </Link>
          </span>
        </label>
        <Button variant="primary" size="lg" disabled={!canContinue} onClick={onContinue} className="md:min-w-48">
          Continue
          <ArrowRight aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

function SelfieItem({ selfie, index, onRemove }: { selfie: WizardSelfie; index: number; onRemove: () => void }) {
  const url = useSelfieUrl(selfie.localId);
  const alt = `Selfie ${index + 1}`;
  if (selfie.status === "error") {
    return (
      <figure className="flex flex-col gap-1.5">
        <div className="relative flex aspect-square items-center justify-center rounded-[12px] border border-border bg-surface-2 text-muted">
          <CircleAlert className="size-6" aria-hidden="true" />
          <button type="button" onClick={onRemove} className="absolute top-2 right-2 flex size-8 items-center justify-center rounded-full bg-overlay-chip text-white" aria-label={`Remove ${alt}`}>
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <figcaption className="text-[12px] leading-4 font-semibold text-danger-text">{selfie.error}</figcaption>
      </figure>
    );
  }
  const verdict = selfie.status === "checking" ? "checking" : selfie.check!.verdict;
  const reason = selfie.status === "checking" ? "" : selfie.check!.reasons[0] ?? SELFIE_OK_COPY;
  return <SelfieTile src={url ?? ""} alt={alt} verdict={verdict} reason={reason} onRemove={onRemove} />;
}

function SetSummary({ usable, required, missing, checking }: { usable: number; required: number; missing: number; checking: boolean }) {
  return (
    <p className="flex items-center gap-3 text-[14px] font-semibold" aria-live="polite">
      <span className="text-text">
        {Math.min(usable, required)} of {required} required
      </span>
      {checking ? (
        <span className="text-muted">Checking…</span>
      ) : missing === 0 ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-0.5 text-success-text">
          <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
          Good set
        </span>
      ) : (
        <span className="rounded-full bg-warning-soft px-2.5 py-0.5 text-warning-text">
          Add {missing} more photo{missing === 1 ? "" : "s"}
        </span>
      )}
    </p>
  );
}

function TipColumn({ title, tone, items }: { title: string; tone: "good" | "avoid"; items: [TipKind, string][] }) {
  return (
    <div>
      <p className={cn("flex items-center gap-1.5 text-overline", tone === "good" ? "text-success-text" : "text-danger-text")}>
        {tone === "good" ? <Check className="size-3.5" strokeWidth={3} aria-hidden="true" /> : <X className="size-3.5" strokeWidth={3} aria-hidden="true" />}
        {title}
      </p>
      <ul className="mt-2 grid grid-cols-4 gap-2">
        {items.map(([kind, label]) => (
          <li key={kind} className="flex flex-col gap-1">
            <TipIllustration kind={kind} />
            <span className="text-[11px] leading-[14px] font-medium text-muted">{label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
