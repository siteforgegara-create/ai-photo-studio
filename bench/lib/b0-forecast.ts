/**
 * Full B0 forecast: already spent + persona redo + analysis + run (with the
 * ablation) + upscale + demo, all with the safety margin, and the cuts needed
 * to stay under the ceiling. Used by bench:forecast and by bench:run (to size
 * the ablation group).
 */
import path from "node:path";
import { ABLATION, DEMO, FORECAST, LORA, MODELS, PERSONAS, PLANNED_REAL_SUBJECTS, SPEND_CEILING_USD } from "../config";
import { PERSONA_SPECS } from "../prompts";
import type { SubjectAttributes } from "./attributes";
import type { Size } from "./cost";
import { chooseCuts, cutOptions, forecast, type CutOption, type Forecast, type ForecastStep } from "./forecast";
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
  /** Same plan with the more expensive demo model (in case it wins). */
  altDemo: { model: string; forecast: Forecast };
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

  const steps = (o: CutOption, demoModel: keyof typeof MODELS): ForecastStep[] => {
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
    const demo = demoItems(runId, MODELS[demoModel], MODELS[demoModel], demoSizes, o.demoCandidates);
    return [
      { name: `personas --redo (${redo.join(", ") || "none"})`, items: personaItems(PERSONA_SPECS.filter((p) => redoSet.has(p.id)), redoSet) },
      { name: "analyze (vision, per selfie)", items: analyzeItems(subjects, runId, redoSet) },
      { name: `run: 4 models + LoRA (${LORA.steps} steps)`, items: [...(plan.loraTrain ? [plan.loraTrain] : []), ...plan.frames] },
      { name: `run: ablation ${ABLATION.key} (${ablationIds.join(", ")})`, items: plan.ablation },
      { name: "upscale", items: upscaleItems(runId) },
      { name: `demo (${MODELS[demoModel].label}, ${o.demoCandidates}/style)`, items: [...demo.styles, ...demo.edits] },
    ];
  };

  const full: CutOption = { ablationSubjects: opts.ablationSubjects ?? ABLATION.subjects.length, demoCandidates: opts.demoCandidates ?? DEMO.candidatesPerStyle };
  const options = opts.ablationSubjects !== undefined ? [full] : cutOptions(full, ABLATION.reducedSubjects);
  const chosen = chooseCuts(options, (o) => steps(o, FORECAST.demoModel), ledger, SPEND_CEILING_USD);
  const alt = forecast(ledger, steps(chosen.option, FORECAST.demoAltModel), SPEND_CEILING_USD);
  return {
    runId,
    redo,
    subjects,
    option: chosen.option,
    applied: chosen.applied,
    forecast: chosen.forecast,
    altDemo: { model: MODELS[FORECAST.demoAltModel].label, forecast: alt },
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
    console.log(`  ⚠ Over the ceiling even after the cuts. The ceiling will refuse the LAST calls (main run is never cut by the plan):`);
    for (const [g, v] of byGroup) console.log(`     - ${g}: ${v.n} calls (list ${fmt(v.usd)})`);
  }
  const a = b.altDemo.forecast;
  console.log(`  If ${b.altDemo.model} wins (demo with it): total with margin ${fmt(a.totalMarginUsd)}${a.fits ? " — fits" : ` — ${a.cut.length} calls over the ceiling`}.`);
}
