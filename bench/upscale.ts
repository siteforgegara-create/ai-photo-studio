/**
 * Upscale mini-test (docs/07 §3): the 3 best frames → 4K on fal.ai, to see
 * price and quality. "Best" = blind ratings when ratings.json exists,
 * otherwise auto likeness.
 *
 *   npm run bench:upscale -- --dry-run
 *   npm run bench:upscale [-- --run=… --yes]
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { UPSCALE } from "./config";
import { callCost, formatUsd, type PlanItem } from "./lib/cost";
import { getFalKey } from "./lib/env";
import { confirm, fail, parseCommonArgs, printPlan } from "./lib/cli";
import { execute } from "./lib/execute";
import { upload } from "./lib/fal";
import { downloadImage } from "./lib/images";
import { Spend } from "./lib/ledger";
import type { UpscaleResponse } from "./lib/models";
import { resolveRunId, runDir } from "./lib/paths";
import type { RatingsFile, ReviewKey, ScoresFile } from "./lib/types";

const args = parseCommonArgs();
const spend = new Spend();
const runId = resolveRunId(args.run);
const RUN = runDir(runId);
const OUT = path.join(RUN, "upscale");
const cost = callCost(UPSCALE.pricing, { output: UPSCALE.plannedOutput });

const scoresFile = path.join(RUN, "scores.json");
let picks: { file: string; why: string }[] = [];
if (existsSync(scoresFile)) {
  const scores = JSON.parse(readFileSync(scoresFile, "utf8")) as ScoresFile;
  const ratingsFile = path.join(RUN, "ratings.json");
  const keyFile = path.join(RUN, "review-key.json");
  if (existsSync(ratingsFile) && existsSync(keyFile)) {
    const ratings = JSON.parse(readFileSync(ratingsFile, "utf8")) as RatingsFile;
    const key = JSON.parse(readFileSync(keyFile, "utf8")) as ReviewKey;
    picks = Object.entries(ratings.ratings)
      .filter(([id]) => key[id])
      .map(([id, r]) => ({ file: key[id]!.file, r }))
      .sort((a, b) => Number(b.r.sellable ?? 0) - Number(a.r.sellable ?? 0) || (b.r.similarity ?? 0) - (a.r.similarity ?? 0) || (b.r.quality ?? 0) - (a.r.quality ?? 0))
      .slice(0, UPSCALE.frames)
      .map((p) => ({ file: p.file, why: `rated: likeness ${p.r.similarity}, quality ${p.r.quality}${p.r.sellable ? ", sellable" : ""}` }));
  } else {
    picks = scores.frames
      .filter((f) => !f.defect && f.similarity !== null)
      .sort((a, b) => b.similarity! - a.similarity!)
      .slice(0, UPSCALE.frames)
      .map((f) => ({ file: f.file, why: `auto likeness ${f.similarity!.toFixed(3)} (no ratings.json yet)` }));
  }
}

const items: PlanItem[] = (picks.length ? picks : Array.from({ length: UPSCALE.frames }, (_, i) => ({ file: `best-frame-${i + 1}.jpg`, why: "planned" }))).map((p) => ({
  key: `upscale/${p.file}`,
  group: `upscale ${UPSCALE.targetResolution}`,
  label: `${p.file} (${p.why})`,
  costUsd: cost,
  cached: existsSync(path.join(OUT, p.file.replace(/[\\/]/g, "_"))),
}));

console.log(`Upscaler: ${UPSCALE.endpoint} — ${UPSCALE.source.note} (${UPSCALE.source.url}, checked ${UPSCALE.source.checked})`);
items.forEach((i) => console.log(`  • ${i.label}`));
const runnable = new Set(printPlan("bench:upscale", items, spend.snapshot()).map((i) => i.key));
if (args.dryRun) {
  console.log("\nDry run — nothing was called.");
  process.exit(0);
}
getFalKey(); // fail before asking for confirmation if the key is missing
if (!picks.length) fail(`No scores.json in bench/runs/${runId} — run bench:score first.`);
if (!runnable.size || !(await confirm(args))) process.exit(0);

for (const p of picks) {
  const key = `upscale/${p.file}`;
  if (!runnable.has(key)) continue;
  const dest = path.join(OUT, p.file.replace(/[\\/]/g, "_"));
  const url = await upload(readFileSync(path.join(RUN, p.file)), "image/jpeg", path.basename(p.file));
  await execute<UpscaleResponse>(
    {
      key,
      kind: "upscale",
      endpoint: UPSCALE.endpoint,
      input: { image_url: url, upscale_mode: "target", target_resolution: UPSCALE.targetResolution, output_format: "jpg" },
      costUsd: cost,
      save: async (d) => ({ url: d.image.url, file: path.relative(RUN, dest), ...(await downloadImage(d.image.url, dest)) }),
    },
    spend,
    path.join(OUT, "log.jsonl"),
  );
}
console.log(`\nUpscaled frames: bench/runs/${runId}/upscale/. Spent in total: ${formatUsd(spend.spent)}.`);
