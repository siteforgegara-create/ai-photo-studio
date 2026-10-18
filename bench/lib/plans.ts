/**
 * Plan builders shared by the commands and the B0 forecast, so a dry-run, the
 * forecast and the real run always count the same calls at the same prices.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { shootStyles } from "../../src/config/styles";
import { ANALYZE, PERSONAS, UPSCALE, type BenchModel } from "../config";
import { voteAttributes, withColors, type ColorReading, type SelfieAttributes, type SubjectAttributes } from "./attributes";
import { callCost, type PlanItem, type Size } from "./cost";
import { frameCost } from "./models";
import { runDir, SUBJECTS_DIR } from "./paths";
import type { Subject } from "./subjects";
import { DEMO_EDITS, PERSONA_SPECS, SELFIE_VARIANTS, personaReferencePrompt, selfiePrompt, type PersonaSpec } from "../prompts";

export function sha1(data: string | Buffer): string {
  return createHash("sha1").update(data).digest("hex");
}

export function fileSha1(file: string): string {
  return sha1(readFileSync(file));
}

// ─── Personas ───────────────────────────────────────────────────────────────

export const personaMarkerFile = (id: string) => path.join(SUBJECTS_DIR, id, "persona.json");
export const personaRefFile = (id: string) => path.join(SUBJECTS_DIR, id, "reference.jpg");
export const personaSelfieFile = (id: string, n: number) => path.join(SUBJECTS_DIR, id, "selfies", `selfie-${n}.jpg`);

/** Fingerprint of the prompts a persona is generated with. */
export function personaPromptHash(spec: PersonaSpec): string {
  return sha1(
    JSON.stringify({
      reference: [PERSONAS.referenceEndpoint, personaReferencePrompt(spec), PERSONAS.referenceSize],
      selfies: [PERSONAS.selfieEndpoint, SELFIE_VARIANTS.slice(0, PERSONAS.selfiesPerPersona).map(selfiePrompt), PERSONAS.selfieSize],
    }),
  ).slice(0, 12);
}

/** true → the persona on disk was generated with the current prompt (bench:personas writes persona.json). */
export function personaIsCurrent(spec: PersonaSpec): boolean {
  const f = personaMarkerFile(spec.id);
  if (!existsSync(f)) return false;
  try {
    return (JSON.parse(readFileSync(f, "utf8")) as { promptHash?: string }).promptHash === personaPromptHash(spec);
  } catch {
    return false;
  }
}

/** Of the given ids, those that still need regenerating with the current prompt. */
export function pendingRedo(ids: string[]): string[] {
  return ids.filter((id) => {
    const spec = PERSONA_SPECS.find((p) => p.id === id);
    return spec ? !personaIsCurrent(spec) : false;
  });
}

export function personaPrices() {
  return {
    reference: callCost(PERSONAS.referencePricing, { output: PERSONAS.referenceSize }),
    selfie: callCost(PERSONAS.selfiePricing, { output: PERSONAS.selfieSize }),
  };
}

/** Reference + 6 selfies per persona; ids in `redo` are planned from scratch (old files are deleted before the run). */
export function personaItems(specs: PersonaSpec[], redo: Set<string> = new Set()): PlanItem[] {
  const price = personaPrices();
  return specs.flatMap((p) => [
    { key: `${p.id}/reference`, group: "reference portrait", label: `${p.id} reference`, costUsd: price.reference, cached: !redo.has(p.id) && existsSync(personaRefFile(p.id)) },
    ...SELFIE_VARIANTS.slice(0, PERSONAS.selfiesPerPersona).map((_, i) => ({
      key: `${p.id}/selfie-${i + 1}`,
      group: "bad selfies",
      label: `${p.id} selfie ${i + 1}`,
      costUsd: price.selfie,
      cached: !redo.has(p.id) && existsSync(personaSelfieFile(p.id, i + 1)),
    })),
  ]);
}

// ─── Attributes (bench:analyze) ─────────────────────────────────────────────

export type AttributesFile = SubjectAttributes & {
  endpoint: string;
  model: string;
  analyzedAt: string;
  readings: { file: string; sha1: string; reading: SelfieAttributes; actualUsd?: number }[];
  /** All-selfies color call: valid while `selfies` (name + sha1) equal the current selfies. */
  colors?: ColorReading & { selfies: { file: string; sha1: string }[]; at: string; actualUsd?: number };
};

/**
 * What the prompt uses, built from attributes.json at the moment of the run:
 * the vote recomputed from the stored per-selfie readings (current rules),
 * hair / eye color from the all-selfies call when present.
 */
export function finalAttributes(f: AttributesFile): Pick<SubjectAttributes, "kept" | "marks"> {
  const vote = f.readings?.length ? voteAttributes(f.subject, f.readings.map((r) => r.reading)) : f;
  return withColors(vote, f.colors);
}

/** name + sha1 of the selfies the color call must cover. */
export function selfieFingerprint(s: Subject): { file: string; sha1: string }[] {
  return analyzedSelfies(s).map((f) => ({ file: path.basename(f), sha1: existsSync(f) ? fileSha1(f) : "" }));
}

/** One all-selfies color call per subject; cached while the selfies are unchanged. */
export function analyzeColorItems(subjects: Subject[], runId: string, invalid: Set<string> = new Set()): (PlanItem & { subject: Subject })[] {
  const price = callCost(ANALYZE.colorPricing);
  return subjects.map((s) => {
    const prev = s.planned || invalid.has(s.id) ? null : readAttributes(runId, s.id);
    const cached = Boolean(prev?.colors && !s.planned && JSON.stringify(prev.colors.selfies) === JSON.stringify(selfieFingerprint(s)));
    return { key: `${s.id}/analyze-colors/all`, group: "hair & eye color (all selfies)", label: `${s.id} · colors from ${analyzedSelfies(s).length} selfies`, costUsd: price, cached, subject: s };
  });
}

export const attributesFile = (runId: string, subject: string) => path.join(runDir(runId), subject, "attributes.json");

export function readAttributes(runId: string, subject: string): AttributesFile | null {
  const f = attributesFile(runId, subject);
  if (!existsSync(f)) return null;
  try {
    return JSON.parse(readFileSync(f, "utf8")) as AttributesFile;
  } catch {
    return null;
  }
}

/** Selfies the analysis uses (same first 8 as generation). */
export const analyzedSelfies = (s: Subject) => s.selfies.slice(0, 8);

/** One vision call per selfie; a selfie whose bytes are unchanged since the last analysis is cached. */
export function analyzeItems(subjects: Subject[], runId: string, invalid: Set<string> = new Set()): (PlanItem & { subject: Subject; file: string })[] {
  const price = callCost(ANALYZE.pricing);
  return subjects.flatMap((s) => {
    const prev = s.planned || invalid.has(s.id) ? null : readAttributes(runId, s.id);
    const done = new Set(prev?.readings.map((r) => `${r.file}|${r.sha1}`) ?? []);
    return analyzedSelfies(s).map((file) => ({
      key: `${s.id}/analyze/${path.basename(file)}`,
      group: "selfie analysis",
      label: `${s.id} · ${path.basename(file)}`,
      costUsd: price,
      cached: !s.planned && !invalid.has(s.id) && existsSync(file) && done.has(`${path.basename(file)}|${fileSha1(file)}`),
      subject: s,
      file,
    }));
  });
}

// ─── Upscale and demo (for the forecast and bench:demo) ─────────────────────

export function upscaleItems(runId: string): PlanItem[] {
  const dir = path.join(runDir(runId), "upscale");
  const done = existsSync(dir) ? readdirSync(dir).filter((f) => /\.jpe?g$/i.test(f)).length : 0;
  const cost = callCost(UPSCALE.pricing, { output: UPSCALE.plannedOutput });
  return Array.from({ length: UPSCALE.frames }, (_, i) => ({ key: `upscale/${i + 1}`, group: `upscale ${UPSCALE.targetResolution}`, label: `best frame ${i + 1} → 4K`, costUsd: cost, cached: i < done }));
}

export type DemoStyleItem = PlanItem & { style: string; k: number; seed: number };
export type DemoEditItem = PlanItem & { tool: string; option: string; prompt: string };

export const demoDir = (runId: string) => path.join(runDir(runId), "demo");
export const demoCandidateFile = (runId: string, style: string, k: number) => path.join(demoDir(runId), "candidates", `${style}-${k}.jpg`);
export const demoEditFile = (runId: string, tool: string, option: string) => path.join(demoDir(runId), "edits", `${tool}-${option}.jpg`);

/** 12 styles × candidates with the shoot model + the Studio edits with the edits model. */
export function demoItems(runId: string, model: BenchModel, editModel: BenchModel, selfieSizes: Size[], candidates: number): { styles: DemoStyleItem[]; edits: DemoEditItem[] } {
  const styleCost = frameCost(model, selfieSizes);
  const editCost = frameCost(editModel, [{ width: 880, height: 1100 }]);
  const styles = shootStyles.flatMap((s, si) =>
    Array.from({ length: candidates }, (_, i) => ({
      key: `demo/${s.id}-${i + 1}`,
      group: `demo: 12 styles · ${model.label}`,
      label: `${s.name} candidate ${i + 1}`,
      costUsd: styleCost,
      marginFactor: model.marginFactor,
      cached: existsSync(demoCandidateFile(runId, s.id, i + 1)),
      style: s.id,
      k: i + 1,
      seed: 5000 + si * 10 + i,
    })),
  );
  const edits = DEMO_EDITS.map((e) => ({
    key: `demo/edit/${e.tool}-${e.option}`,
    group: `demo: Studio edits · ${editModel.label}`,
    label: `${e.tool} → ${e.option}`,
    costUsd: editCost,
    marginFactor: editModel.marginFactor,
    cached: existsSync(demoEditFile(runId, e.tool, e.option)),
    ...e,
  }));
  return { styles, edits };
}
