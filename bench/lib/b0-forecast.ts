/**
 * Full B0 forecast: already spent + persona redo + analysis + run (with the
 * ablation) + upscale, all with the safety margin, and the cut needed to stay
 * under the $17 ceiling (ablation 4 → 2 subjects). The demo is NOT part of B0:
 * it is shown on a separate line "after B0, outside the ceiling". Used by
 * bench:forecast and by bench:run (to size the ablation group).
 */
import path from "node:path";
import { ABLATION, DEMO, FORECAST, LORA, MODELS, PERSONAS, PLANNED_REAL_SUBJECTS, SPEND_CEILING_USD } from "../config";
import { PERSONA_SPECS } from "../prompts";
import type { SubjectAttributes } from "./attributes";
import { effectiveSpent, round, summarize, type Size } from "./cost";
import { chooseCuts, cutOptions, type CutOption, type Forecast, type ForecastStep } from "./forecast";
import { normalizeSelfie } from "./images";
import { loadLedger } from "./ledger";
import { readLog } from "./log";
import { PLANNED_SELFIE_SIZE } from "./models";
import { runDir, SUBJECTS_DIR } from "./paths";
import { analyzeItems, demoItems, pendingRedo, personaItems, readAttributes, upscaleItems } from "./plans";
import { ablationSubjectIds, buildRunPlan } from "./run-plan";
import { loadSubjects, type Subject } from "./subjects";

/** Subjects on disk, completed with the planned ones (3 real + 5 personas) that are not there yet. */
export function forecastSubjects(): Subject[] {
  const onDisk = loadSubjects();
  const ids = new Set(onDisk.map((s) => s.id));
  const planned = (id: string, type: "real" | "synth"): Subject => ({ id, type, dir: path.join(SUBJECTS_DIR, id), selfies: Array.from({ length: 6 }, (_, i) => `planned-${i + 1}.jpg`), planned: true });
  const extra: Subject[] = [];
  for (let i = 1; i <= PLANNED_REAL_SUBJECTS; i++) {
    const id = `real-${String(i).padStart(2, "0")}`;
    if (!ids.has(id)) extra.push(planned(id, "real"));
  }
  for (const p of PERSONA_SPECS) if (!ids.has(p.id)) extra.push(planned(p.id, "synth"));
  return [...onDisk, ...extra].sort((a, b) => a.id.localeCompare(b.id));
}

export type B0Forecast = {
  runId: string;
  redo: string[];
  subjects: Subject[];
  option: CutOption;
  applied: string[];
  forecast: Forecast;
  /** After B0, outside the $17 ceiling: the demo with the default and the more expensive model, and the total vs the demo guard. */
  demo: { model: string; calls: number; listUsd: number; marginUsd: number; totalMarginUsd: number }[];
  demoCeilingUsd: number;
  ablationIds: string[];
};

export async function buildB0Forecast(runId: string, opts: { redo?: string[]; ablationSubjects?: number; demoCandidates?: number } = {}): Promise<B0Forecast> {
  const ledger = loadLedger();
  const redo = opts.redo ?? pendingRedo(FORECAST.redo);
  const redoSet = new Set(redo);
  const subjects = forecastSubjects();

  const selfieSizes = new Map<string, Size[]>();
  for (const s of subjects) {
    if (s.planned || redoSet.has(s.id)) {
      selfieSizes.set(s.id, Array.from({ length: Math.min(8, s.selfies.length || PERSONAS.selfiesPerPersona) }, () => (s.type === "synth" ? PERSONAS.selfieSize : PLANNED_SELFIE_SIZE)));
      continue;
    }
    const sizes: Size[] = [];
    for (const f of s.selfies.slice(0, 8)) {
      const n = await normalizeSelfie(f);
      sizes.push({ width: n.width, height: n.height });
    }
    selfieSizes.set(s.id, sizes);
  }

  const attrs = new Map<string, SubjectAttributes | null>(subjects.map((s) => [s.id, s.planned || redoSet.has(s.id) ? null : readAttributes(runId, s.id)]));
  // Frames of personas being regenerated are deleted by --redo: never adopt them.
  const log = readLog(path.join(runDir(runId), "log.jsonl")).filter((l) => !l.subject || !redoSet.has(l.subject));
  const available = new Set(subjects.map((s) => s.id));
  const loraSubject = subjects.find((s) => s.type === "real");
  const models = Object.values(MODELS);
  const demoSizes = Array.from({ length: PERSONAS.selfiesPerPersona }, () => PERSONAS.selfieSize);

  const steps = (o: CutOption): ForecastStep[] => {
    const ablationIds = ablationSubjectIds(available, o.ablationSubjects);
    const plan = buildRunPlan({
      runId,
      subjects,
      models,
      loraSubject,
      selfieSizes,
      attrs,
      noAttrs: false,
      ablationSubjects: subjects.filter((s) => ablationIds.includes(s.id)),
      log,
    });
    return [
      { name: `personas --redo (${redo.join(", ") || "none"})`, items: personaItems(PERSONA_SPECS.filter((p) => redoSet.has(p.id)), redoSet) },
      { name: "analyze (vision, per selfie)", items: analyzeItems(subjects, runId, redoSet) },
      { name: `run: 4 models + LoRA (${LORA.steps} steps)`, items: [...(plan.loraTrain ? [plan.loraTrain] : []), ...plan.frames] },
      { name: `run: ablation ${ABLATION.key} (${ablationIds.join(", ")})`, items: plan.ablation },
      { name: "upscale", items: upscaleItems(runId) },
    ];
  };

  // Only cut: the ablation 4 → 2 subjects (docs/07 §11). The main run is never cut.
  const full: CutOption = { ablationSubjects: opts.ablationSubjects ?? ABLATION.subjects.length, demoCandidates: 1 };
  const options = opts.ablationSubjects !== undefined ? [full] : cutOptions(full, ABLATION.reducedSubjects);
  const chosen = chooseCuts(options, steps, ledger, SPEND_CEILING_USD);

  // Demo: after B0, outside the ceiling — total with margin vs DEMO.ceilingUsd.
  const candidates = opts.demoCandidates ?? DEMO.candidatesPerStyle;
  const demo = [FORECAST.demoModel, FORECAST.demoAltModel].map((k) => {
    const d = demoItems(runId, MODELS[k], MODELS[k], demoSizes, candidates);
    const sum = summarize([...d.styles, ...d.edits]);
    // Total for the demo guard: everything (B0 + demo spent so far) + this demo, all with margins.
    return { model: `${MODELS[k].label}, ${candidates}/style`, calls: sum.toRun, listUsd: sum.costUsd, marginUsd: sum.marginUsd, totalMarginUsd: round(effectiveSpent(ledger, "all") + chosen.forecast.toRunMarginUsd + sum.marginUsd) };
  });
  return {
    runId,
    redo,
    subjects,
    option: chosen.option,
    applied: chosen.applied,
    forecast: chosen.forecast,
    demo,
    demoCeilingUsd: DEMO.ceilingUsd,
    ablationIds: ablationSubjectIds(available, chosen.option.ablationSubjects),
  };
}

/** Table: list price and with margin per step, spent, total vs ceiling, cuts. */
export function printB0Forecast(b: B0Forecast, fmt: (usd: number) => string) {
  const f = b.forecast;
  const w = Math.max(...f.rows.map((r) => r.name.length), 28);
  console.log(`\n=== B0 forecast (run ${b.runId}) ===`);
  console.log(`  ${"step".padEnd(w)}  calls   list price  with margin`);
  const spentNote = f.reconciledUsd !== undefined ? `counted ${fmt(f.spentCountedUsd)}, fal.ai Usage ${fmt(f.reconciledUsd)}` : `counted ${fmt(f.spentCountedUsd)}`;
  console.log(`  ${"already spent".padEnd(w)}      —  ${fmt(f.spentCountedUsd).padStart(11)}  ${fmt(f.spentEffectiveUsd).padStart(11)}   (${spentNote})`);
  for (const r of f.rows) console.log(`  ${r.name.padEnd(w)}  ${String(r.calls).padStart(5)}  ${fmt(r.listUsd).padStart(11)}  ${fmt(r.marginUsd).padStart(11)}`);
  console.log(`  ${"-".repeat(w + 34)}`);
  console.log(`  ${"to run".padEnd(w)}  ${String(f.rows.reduce((a, r) => a + r.calls, 0)).padStart(5)}  ${fmt(f.toRunListUsd).padStart(11)}  ${fmt(f.toRunMarginUsd).padStart(11)}`);
  console.log(`  ${"TOTAL B0 (spent + to run)".padEnd(w)}         ${fmt(f.spentCountedUsd + f.toRunListUsd).padStart(11)}  ${fmt(f.totalMarginUsd).padStart(11)}   ceiling ${fmt(f.ceilingUsd)}`);
  if (b.applied.length) console.log(`  Cuts applied (docs/07 §11 order): ${b.applied.join("; ")}`);
  if (f.fits) console.log(`  ✓ Fits under the ceiling with the margin.`);
  else {
    const byGroup = new Map<string, { n: number; usd: number }>();
    for (const i of f.cut) {
      const g = byGroup.get(i.group) ?? { n: 0, usd: 0 };
      byGroup.set(i.group, { n: g.n + 1, usd: g.usd + i.costUsd });
    }
    console.log(`  ⚠ Over the ceiling even after the cut. The ceiling will refuse the LAST calls (the main run is never cut by the plan):`);
    for (const [g, v] of byGroup) console.log(`     - ${g}: ${v.n} calls (list ${fmt(v.usd)})`);
  }
  console.log(`\n  After B0, outside the ${fmt(f.ceilingUsd)} ceiling (bench:demo, runs only on your decision; guard: total ≤ ${fmt(b.demoCeilingUsd)}):`);
  for (const d of b.demo) console.log(`  ${`demo (${d.model})`.padEnd(w)}  ${String(d.calls).padStart(5)}  ${fmt(d.listUsd).padStart(11)}  ${fmt(d.marginUsd).padStart(11)}   → B0 + demo ${fmt(d.totalMarginUsd)} of ${fmt(b.demoCeilingUsd)}${d.totalMarginUsd <= b.demoCeilingUsd + 1e-9 ? "" : " ⚠ over"}`);
}
