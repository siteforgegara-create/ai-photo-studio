/**
 * Full B0 forecast (free, local): already spent + personas --redo + analyze +
 * run (4 models, LoRA, ablation) + upscale — list price and with each model's
 * safety margin, against the $17 ceiling (ablation 4 → 2 if needed, docs/07
 * §11). The demo is shown separately: after B0, outside the ceiling.
 *
 *   npm run bench:forecast [-- --run=2026-10-18 --redo=synth-02,synth-05]
 */
import { buildB0Forecast, printB0Forecast } from "./lib/b0-forecast";
import { parseCommonArgs } from "./lib/cli";
import { formatUsd } from "./lib/cost";
import { resolveRunId } from "./lib/paths";

const args = parseCommonArgs();
const runId = resolveRunId(args.run);
console.log(`Margins per model (bench/config.ts marginFactor). Subjects missing on disk are counted as planned (3 real + 5 personas, 6 selfies each).`);
const b = await buildB0Forecast(runId, { redo: args.redo, ablationSubjects: args.ablationSubjects, demoCandidates: args.candidates });
console.log(`Subjects: ${b.subjects.map((s) => `${s.id}${s.planned ? " (planned)" : ""}`).join(", ")}`);
printB0Forecast(b, formatUsd);
