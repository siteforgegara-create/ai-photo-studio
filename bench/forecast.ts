/**
 * Full B0 forecast (free, local): already spent + personas --redo + analyze +
 * run (4 models, LoRA, ablation) + upscale + demo — list price and with the
 * ×COST_SAFETY_FACTOR margin, against the $17 ceiling, with the cuts of
 * docs/07 §11 applied.
 *
 *   npm run bench:forecast [-- --run=2026-10-18 --redo=synth-02,synth-05]
 */
import { COST_SAFETY_FACTOR } from "./config";
import { buildB0Forecast, printB0Forecast } from "./lib/b0-forecast";
import { parseCommonArgs } from "./lib/cli";
import { formatUsd } from "./lib/cost";
import { resolveRunId } from "./lib/paths";

const args = parseCommonArgs();
const runId = resolveRunId(args.run);
console.log(`Margin: ×${COST_SAFETY_FACTOR} on every list price. Subjects missing on disk are counted as planned (3 real + 5 personas, 6 selfies each).`);
const b = await buildB0Forecast(runId, { redo: args.redo, ablationSubjects: args.ablationSubjects, demoCandidates: args.candidates });
console.log(`Subjects: ${b.subjects.map((s) => `${s.id}${s.planned ? " (planned)" : ""}`).join(", ")}`);
printB0Forecast(b, formatUsd);
