/**
 * Preliminary appearance analysis (docs/07 §2a): every selfie separately with
 * a cheap vision model, then a majority vote per subject. Only visible
 * attributes — eye color, hair color / length / texture, skin tone, freckles,
 * glasses, facial hair, distinctive marks. Race, ethnic origin and numeric age
 * are never asked for and never stored (lib/attributes.ts).
 *
 *   npm run bench:analyze -- --dry-run
 *   npm run bench:analyze [-- --subjects=synth-02,synth-05 --run=… --yes]
 *
 * Output: bench/runs/<run>/<subject>/attributes.json (per-selfie readings +
 * the vote; < 60% agreement → dropped). bench:run puts the kept attributes
 * into every prompt. For synth-* the vote is compared with subjects.json
 * "truth" — accuracy per attribute in attributes-accuracy.json (and report.md).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ANALYZE, MAX_CONCURRENCY } from "./config";
import { accuracyTable, sanitizeReading, visionPrompt, VISION_SYSTEM_PROMPT, voteAttributes, attributesLine, type AttributeTruth } from "./lib/attributes";
import { confirm, fail, parseCommonArgs, printPlan } from "./lib/cli";
import { callCost, formatUsd } from "./lib/cost";
import { getFalKey } from "./lib/env";
import { execute } from "./lib/execute";
import { upload } from "./lib/fal";
import { normalizeSelfie } from "./lib/images";
import { Spend } from "./lib/ledger";
import { resolveRunId, runDir } from "./lib/paths";
import { analyzedSelfies, analyzeItems, attributesFile, fileSha1, readAttributes, type AttributesFile } from "./lib/plans";
import { runPool } from "./lib/pool";
import { subjectsForPlan, truthFor, validateSubject } from "./lib/subjects";

type VisionResponse = { output: string; usage?: { cost?: number; prompt_tokens?: number; completion_tokens?: number } };

const args = parseCommonArgs();
const spend = new Spend();
const runId = resolveRunId(args.run);
const RUN = runDir(runId);
const LOG = path.join(RUN, "analyze-log.jsonl");

const subjects = subjectsForPlan(args.subjects, args.dryRun);
if (!subjects.length) fail("No subjects in bench/subjects/. Add real-0N/selfies/ and run bench:personas first.");
const issues = subjects.filter((s) => !s.planned).flatMap(validateSubject).filter((i) => i.includes("need 4"));
if (issues.length && !args.dryRun) fail(`Fix the subjects first:\n  ${issues.join("\n  ")}`);

const items = analyzeItems(subjects, runId);
console.log(`Run: bench/runs/${runId}   Subjects: ${subjects.map((s) => s.id).join(", ")}${subjects.some((s) => s.planned) ? "  (PLANNED — no photos yet)" : ""}`);
console.log(`Vision: ${ANALYZE.endpoint} · ${ANALYZE.model}, temperature 0, planned ${formatUsd(callCost(ANALYZE.pricing))} per selfie (${ANALYZE.sources.map((s) => `${s.url}: ${s.note}`).join("; ")}; checked ${ANALYZE.sources[0]!.checked})`);
console.log("Visible attributes only — race, ethnicity and age are never requested or stored.");
const runnable = new Set(printPlan("bench:analyze", items, spend.snapshot()).map((i) => i.key));
if (args.dryRun) {
  console.log("\nDry run — nothing was called.");
  process.exit(0);
}
getFalKey();
if (runnable.size && !(await confirm(args))) process.exit(0);

const results: AttributesFile[] = [];
for (const s of subjects) {
  const prev = readAttributes(runId, s.id);
  const readings = new Map((prev?.readings ?? []).map((r) => [r.file, r]));
  const todo = items.filter((i) => i.subject.id === s.id && runnable.has(i.key));
  if (todo.length) console.log(`\n▶ ${s.id}`);
  const jobs = todo.map((it) => async () => {
    const name = path.basename(it.file);
    const sha = fileSha1(it.file);
    const url = await upload((await normalizeSelfie(it.file)).buffer, "image/jpeg", `${s.id}-${name}`);
    return execute<VisionResponse>(
      {
        key: it.key,
        kind: "analyze",
        endpoint: ANALYZE.endpoint,
        input: { model: ANALYZE.model, system_prompt: VISION_SYSTEM_PROMPT, prompt: visionPrompt(), image_urls: [url], temperature: 0, max_tokens: ANALYZE.maxTokens, reasoning: false },
        costUsd: it.costUsd,
        meta: { subject: s.id },
        save: async (d) => {
          const reading = sanitizeReading(d.output);
          if (!Object.keys(reading).length) throw new Error("no usable JSON in the model answer");
          readings.set(name, { file: name, sha1: sha, reading, actualUsd: d.usage?.cost });
          return { file: name, actualUsd: d.usage?.cost };
        },
      },
      spend,
      LOG,
    );
  });
  await runPool(jobs, MAX_CONCURRENCY);

  // Vote over the readings of the current selfies only.
  const current = analyzedSelfies(s).map((f) => readings.get(path.basename(f))).filter((r): r is NonNullable<typeof r> => Boolean(r));
  const vote = voteAttributes(s.id, current.map((r) => r.reading), analyzedSelfies(s).length);
  const out: AttributesFile = { ...vote, endpoint: ANALYZE.endpoint, model: ANALYZE.model, analyzedAt: new Date().toISOString(), readings: current };
  mkdirSync(path.dirname(attributesFile(runId, s.id)), { recursive: true });
  writeFileSync(attributesFile(runId, s.id), JSON.stringify(out, null, 2));
  results.push(out);
  console.log(`  ${s.id}: ${current.length}/${analyzedSelfies(s).length} selfies read → ${attributesLine(vote)}`);
  if (vote.dropped.length) console.log(`     dropped (< 60% agreement): ${vote.dropped.map((d) => `${d.key}${d.best ? ` (${d.best} ${Math.round(d.agreement * 100)}%)` : ""}`).join(", ")}`);
}

// Accuracy on the synthetic personas (truth = attributes they were generated with).
const truths = new Map<string, AttributeTruth>();
for (const s of subjects) if (s.type === "synth") {
  const t = truthFor(s.id);
  if (t) truths.set(s.id, t);
}
if (truths.size) {
  const table = accuracyTable(results.filter((r) => truths.has(r.subject)), truths);
  writeFileSync(path.join(RUN, "attributes-accuracy.json"), JSON.stringify({ run: runId, at: new Date().toISOString(), personas: [...truths.keys()], table }, null, 2));
  console.log(`\nAccuracy vs truth (${truths.size} personas): attribute — correct / compared (dropped)`);
  for (const r of table.filter((r) => r.compared)) console.log(`  ${r.key.padEnd(12)} ${r.correct}/${r.compared}${r.dropped ? ` (${r.dropped} dropped)` : ""}${r.wrong.length ? `  wrong: ${r.wrong.map((w) => `${w.subject} ${w.truth}→${w.got}`).join(", ")}` : ""}`);
}
console.log(`\nCounted so far: ${formatUsd(spend.spent)} at list prices. Next: npm run bench:run -- --dry-run`);
