/**
 * bench:run plan — main frames (every subject × model × 2 styles × 2 frames,
 * with the "Subject details" line), the LoRA control and the attribute
 * ablation group "nb21-noattr". Shared by bench:run and the B0 forecast.
 *
 * A frame counts as done only if its file exists AND the log has a successful
 * call for it with the same request fingerprint (endpoint + prompt + seed).
 * Frames from before the attribute line (the smoke test) are therefore
 * regenerated — except Nano Banana 2.1 frames, whose request is exactly the
 * ablation request: those are adopted into nb21-noattr for free.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { ABLATION, BENCH_STYLES, FRAMES_PER_STYLE, LORA, MODELS, type BenchModel } from "../config";
import { generationPrompt } from "../prompts";
import { attributesLine, type PromptAttributes } from "./attributes";
import type { PlanItem, Size } from "./cost";
import type { CallLog } from "./log";
import { frameCost, loraFrameCost, loraTrainCost, seedFor } from "./models";
import { framePath, runDir } from "./paths";
import { sha1 } from "./plans";
import type { Subject } from "./subjects";

export type FrameItem = PlanItem & {
  subject: Subject;
  /** Folder name and model key in logs, scores and the blind review (e.g. "nb21", "nb21-noattr", "lora"). */
  dir: string;
  model: BenchModel | "lora";
  style: string;
  styleIndex: number;
  n: number;
  seed: number;
  file: string;
  /** null = not known yet (attributes not analyzed) — the frame cannot be cached. */
  prompt: string | null;
  promptHash: string | null;
  /** Reuse this earlier frame instead of calling (identical request). */
  adopt?: { file: string; entry: CallLog };
};

export type RunPlan = { frames: FrameItem[]; ablation: FrameItem[]; loraTrain: PlanItem | null; loraSubject?: Subject };

export type RunPlanInput = {
  runId: string;
  subjects: Subject[];
  models: BenchModel[];
  loraSubject?: Subject;
  selfieSizes: Map<string, Size[]>;
  /** Voted attributes per subject id; missing → unknown prompt. */
  attrs: Map<string, PromptAttributes | null>;
  noAttrs: boolean;
  ablationSubjects: Subject[];
  log: CallLog[];
};

export function promptHash(endpoint: string, prompt: string, seed: number | null): string {
  return sha1(JSON.stringify([endpoint, prompt, seed])).slice(0, 16);
}

/** Subjects for the ablation: config order, a missing real id replaced by its fallback, the first `count`. */
export function ablationSubjectIds(available: Set<string>, count: number): string[] {
  const ids: string[] = [];
  for (const id of ABLATION.subjects) {
    const pick = available.has(id) ? id : ABLATION.fallback[id];
    if (pick && available.has(pick) && !ids.includes(pick)) ids.push(pick);
  }
  return ids.slice(0, count);
}

function lastOk(log: CallLog[]): Map<string, CallLog> {
  const m = new Map<string, CallLog>();
  for (const l of log) if (l.status === "ok") m.set(l.key, l);
  return m;
}

export function buildRunPlan(input: RunPlanInput): RunPlan {
  const ok = lastOk(input.log);
  const frames: FrameItem[] = [];
  const ablation: FrameItem[] = [];

  const promptFor = (subject: Subject, style: string, withAttrs: boolean, token?: string): string | null => {
    const base = generationPrompt(style, token);
    if (!withAttrs) return base;
    const a = input.attrs.get(subject.id);
    return a ? `${base} ${attributesLine(a)}` : null;
  };

  const item = (subject: Subject, dir: string, model: BenchModel | "lora", style: string, styleIndex: number, n: number, withAttrs: boolean, group: string, label: string): FrameItem => {
    const isLora = model === "lora";
    const endpoint = isLora ? LORA.generateEndpoint : model.endpoint;
    const seed = seedFor(styleIndex, n);
    const prompt = promptFor(subject, style, withAttrs, isLora ? `${LORA.triggerWord} person` : undefined);
    const hash = prompt === null ? null : promptHash(endpoint, prompt, isLora || model.seed ? seed : null);
    const file = framePath(input.runId, subject.id, dir, style, n);
    const key = `${subject.id}/${dir}/${style}-${n}`;
    const done = hash !== null && existsSync(file) && ok.get(key)?.promptHash === hash;
    return {
      key,
      group,
      label,
      costUsd: isLora ? loraFrameCost() : frameCost(model, input.selfieSizes.get(subject.id) ?? []),
      cached: done,
      subject,
      dir,
      model,
      style,
      styleIndex,
      n,
      seed,
      file,
      prompt,
      promptHash: hash,
    };
  };

  const withAttrs = !input.noAttrs;
  for (const subject of input.subjects) {
    for (const model of input.models) {
      BENCH_STYLES.forEach((style, si) => {
        for (let n = 1; n <= FRAMES_PER_STYLE; n++) frames.push(item(subject, model.key, model, style, si, n, withAttrs, model.label, `${subject.id} · ${model.label} · ${style} #${n}`));
      });
    }
  }

  let loraTrain: PlanItem | null = null;
  if (input.loraSubject) {
    const s = input.loraSubject;
    loraTrain = {
      key: `${s.id}/lora/train`,
      group: "LoRA training",
      label: `LoRA training on ${s.id} (${LORA.steps} steps)`,
      costUsd: loraTrainCost(),
      cached: existsSync(path.join(runDir(input.runId), s.id, "lora", "training.json")),
    };
    BENCH_STYLES.forEach((style, si) => {
      for (let n = 1; n <= FRAMES_PER_STYLE; n++) frames.push(item(s, "lora", "lora", style, si, n, withAttrs, "FLUX LoRA frames", `${s.id} · LoRA · ${style} #${n}`));
    });
  }

  if (!input.noAttrs) {
    const base = MODELS[ABLATION.baseModel];
    for (const subject of input.ablationSubjects) {
      BENCH_STYLES.forEach((style, si) => {
        for (let n = 1; n <= FRAMES_PER_STYLE; n++) {
          const it = item(subject, ABLATION.key, base, style, si, n, false, ABLATION.label, `${subject.id} · ${ABLATION.label} · ${style} #${n}`);
          if (!it.cached) {
            // Smoke-test frame of the base model: same endpoint, prompt (no attribute line) and seed → adopt it.
            const legacyKey = `${subject.id}/${base.key}/${style}-${n}`;
            const legacy = ok.get(legacyKey);
            const legacyFile = framePath(input.runId, subject.id, base.key, style, n);
            if (legacy && !legacy.promptHash && legacy.endpoint === base.endpoint && existsSync(legacyFile)) {
              it.adopt = { file: legacyFile, entry: legacy };
              it.cached = true;
            }
          }
          ablation.push(it);
        }
      });
    }
  }

  return { frames, ablation, loraTrain, loraSubject: input.loraSubject };
}
