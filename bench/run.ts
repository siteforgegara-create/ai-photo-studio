/**
 * Generation (docs/07 §3–4, §6): every subject × model × 2 styles × 2 frames,
 * plus the LoRA control for one real participant and the attribute ablation
 * (nb21-noattr: Nano Banana 2.1 without the "Subject details" line).
 *
 * Every prompt (LoRA included) ends with the subject's voted attributes from
 * bench:analyze, e.g. "Subject details (preserve exactly): green eyes, auburn
 * shoulder-length straight hair, fair skin with freckles. Preserve apparent
 * age exactly." — `--no-attrs` leaves the line out and skips the ablation.
 *
 *   npm run bench:run -- --dry-run
 *   npm run bench:run [-- --only=nb21,seedream,nb21-noattr --subjects=real-01 --run=2026-10-20 --no-lora --lora-subject=real-02 --no-attrs --ablation-subjects=2 --yes]
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { zipSync } from "fflate";
import { ABLATION, LORA, MAX_CONCURRENCY, MODELS, OUTPUT, type BenchModel } from "./config";
import type { SubjectAttributes } from "./lib/attributes";
import { buildB0Forecast } from "./lib/b0-forecast";
import { formatUsd, type PlanItem, type Size } from "./lib/cost";
import { getFalKey } from "./lib/env";
import { confirm, fail, parseCommonArgs, printPlan } from "./lib/cli";
import { execute } from "./lib/execute";
import { upload } from "./lib/fal";
import { downloadImage, normalizeSelfie } from "./lib/images";
import { Spend } from "./lib/ledger";
import { appendLog, readLog } from "./lib/log";
import { buildFrameInput, buildLoraFrameInput, getModel, PLANNED_SELFIE_SIZE, type ImagesResponse, type LoraTrainResponse } from "./lib/models";
import { resolveRunId, runDir } from "./lib/paths";
import { readAttributes } from "./lib/plans";
import { runPool } from "./lib/pool";
import { ablationSubjectIds, buildRunPlan, type FrameItem } from "./lib/run-plan";
import { subjectsForPlan, validateSubject, type Subject } from "./lib/subjects";

const args = parseCommonArgs();
const spend = new Spend();
const runId = resolveRunId(args.run);
const RUN = runDir(runId);
const LOG = path.join(RUN, "log.jsonl");

const models: BenchModel[] = (args.only?.filter((k) => k !== "lora" && k !== ABLATION.key) ?? Object.keys(MODELS)).map(getModel);
const withLora = !args.noLora && (!args.only || args.only.includes("lora"));
const withAblation = !args.noAttrs && (!args.only || args.only.includes(ABLATION.key));
const subjects = subjectsForPlan(args.subjects, args.dryRun);
if (!subjects.length) fail("No subjects in bench/subjects/. Add real-01/selfies/*.jpg (4–8 photos) and run bench:personas first — see bench/README.md.");

const issues = subjects.filter((s) => !s.planned).flatMap(validateSubject);
if (issues.length) {
  console.log("Subject check:");
  issues.forEach((i) => console.log(`  ⚠ ${i}`));
  if (!args.dryRun && issues.some((i) => i.includes("need 4") || i.includes("missing"))) fail("Fix the subjects above first.");
}

const loraSubject: Subject | undefined = withLora
  ? (args.loraSubject ? subjects.find((s) => s.id === args.loraSubject) : subjects.find((s) => s.type === "real"))
  : undefined;
if (withLora && args.loraSubject && !loraSubject) fail(`--lora-subject=${args.loraSubject} is not among the subjects.`);

// Attributes from bench:analyze (the "Subject details" line).
const attrs = new Map<string, SubjectAttributes | null>();
const missingAttrs: string[] = [];
for (const s of subjects) {
  const a = args.noAttrs || s.planned ? null : readAttributes(runId, s.id);
  attrs.set(s.id, a);
  if (!args.noAttrs && !a) missingAttrs.push(s.id);
}
if (missingAttrs.length) {
  const msg = `No attributes for ${missingAttrs.join(", ")} in bench/runs/${runId}/ — run npm run bench:analyze first (or pass --no-attrs).`;
  if (args.dryRun) console.log(`⚠ ${msg} Their frames are planned as new.`);
  else fail(msg);
}

// Selfie sizes after normalisation (per-MP input pricing).
const selfieSizes = new Map<string, Size[]>();
for (const s of subjects) {
  if (s.planned) {
    selfieSizes.set(s.id, s.selfies.map(() => PLANNED_SELFIE_SIZE));
  } else {
    const sizes: Size[] = [];
    for (const f of s.selfies.slice(0, 8)) {
      const n = await normalizeSelfie(f);
      sizes.push({ width: n.width, height: n.height });
    }
    selfieSizes.set(s.id, sizes);
  }
}

// ─── Plan ───────────────────────────────────────────────────────────────────
// Ablation size: --ablation-subjects, else what the full B0 forecast allows (4, or 2 when over the ceiling).
let ablationCount = 0;
if (withAblation) {
  if (args.ablationSubjects !== undefined) ablationCount = args.ablationSubjects;
  else {
    const b0 = await buildB0Forecast(runId);
    ablationCount = b0.option.ablationSubjects;
    console.log(`Ablation ${ABLATION.key}: ${ablationCount} subjects (B0 forecast with margin: ${formatUsd(b0.forecast.totalMarginUsd)} of ${formatUsd(b0.forecast.ceilingUsd)}${b0.applied.length ? `; cuts: ${b0.applied.join("; ")}` : ""}). Details: npm run bench:forecast`);
  }
}
const ablationIds = ablationSubjectIds(new Set(subjects.map((s) => s.id)), ablationCount);
const plan = buildRunPlan({
  runId,
  subjects,
  models,
  loraSubject,
  selfieSizes,
  attrs,
  noAttrs: args.noAttrs,
  ablationSubjects: subjects.filter((s) => ablationIds.includes(s.id)),
  log: readLog(LOG),
});
const frames: FrameItem[] = [...plan.frames, ...plan.ablation];
const loraTrain = plan.loraTrain;
const loraDir = loraSubject ? path.join(RUN, loraSubject.id, "lora") : "";
const loraInfoFile = loraSubject ? path.join(loraDir, "training.json") : "";

console.log(`Run: bench/runs/${runId}   Subjects: ${subjects.map((s) => s.id).join(", ")}${subjects.some((s) => s.planned) ? "  (PLANNED — no photos yet)" : ""}`);
console.log(`Models: ${models.map((m) => `${m.key} → ${m.endpoint} (${m.source.note})`).join("\n        ")}`);
if (loraSubject) console.log(`        lora → ${LORA.trainEndpoint} + ${LORA.generateEndpoint} on ${loraSubject.id}`);
if (plan.ablation.length) console.log(`        ${ABLATION.key} → ${MODELS[ABLATION.baseModel].endpoint} without the attribute line, on ${ablationIds.join(", ")}${plan.ablation.some((f) => f.adopt) ? ` (${plan.ablation.filter((f) => f.adopt).length} smoke-test frames reused — identical request)` : ""}`);
console.log(`Prompts: ${args.noAttrs ? "WITHOUT the attribute line (--no-attrs)" : "with the voted attributes of each subject"}.`);
for (const s of subjects) if (attrs.get(s.id)) console.log(`  ${s.id}: ${plan.frames.find((f) => f.subject.id === s.id && f.prompt)?.prompt?.match(/Subject details[^]*$/)?.[0] ?? ""}`);
console.log(`Output: ${OUTPUT.width}×${OUTPUT.height} class (Seedream 1728×2160 — its minimum). Prices checked ${MODELS.nb21.source.checked}.`);
for (const m of Object.values(MODELS)) if (m.note) console.log(`  · ${m.label}: ${m.note}`);
const planItems: PlanItem[] = [...(loraTrain ? [loraTrain] : []), ...frames];
const runnable = new Set(printPlan("bench:run", planItems, spend.snapshot()).map((i) => i.key));

if (args.dryRun) {
  console.log("\nDry run — nothing was called.");
  process.exit(0);
}
getFalKey(); // fail before asking for confirmation if the key is missing

// Smoke-test frames with exactly the ablation request: copy them into nb21-noattr (free, logged).
for (const f of plan.ablation.filter((f) => f.adopt && !existsSync(f.file))) {
  mkdirSync(path.dirname(f.file), { recursive: true });
  copyFileSync(f.adopt!.file, f.file);
  const e = f.adopt!.entry;
  appendLog(LOG, { ...e, at: new Date().toISOString(), key: f.key, model: f.dir, promptHash: f.promptHash ?? undefined, adoptedFrom: e.key, output: { ...e.output, file: path.relative(RUN, f.file) } });
  console.log(`  ↺ ${f.key}: reused ${e.key} (same endpoint, prompt and seed; no new call)`);
}

if (!runnable.size) {
  console.log("\nNothing to do — every frame is already generated.");
  process.exit(0);
}
if (!(await confirm(args))) process.exit(0);

// ─── Execute ────────────────────────────────────────────────────────────────
mkdirSync(RUN, { recursive: true });
writeFileSync(path.join(RUN, "run.json"), JSON.stringify({ runId, startedAt: new Date().toISOString(), models: models.map((m) => m.key), lora: loraSubject?.id ?? null, attributes: !args.noAttrs, ablation: ablationIds }, null, 2));

/** Selfies uploaded once per subject per run; URLs expire after a day, so they are re-uploaded after 20 h. */
async function uploadedSelfies(subject: Subject): Promise<string[]> {
  const cache = path.join(RUN, subject.id, "uploads.json");
  if (existsSync(cache)) {
    const c = JSON.parse(readFileSync(cache, "utf8")) as { at: string; urls: string[] };
    if (Date.now() - Date.parse(c.at) < 20 * 3600_000 && c.urls.length === Math.min(8, subject.selfies.length)) return c.urls;
  }
  const urls: string[] = [];
  for (const [i, f] of subject.selfies.slice(0, 8).entries()) {
    const n = await normalizeSelfie(f);
    urls.push(await upload(n.buffer, "image/jpeg", `${subject.id}-selfie-${i + 1}.jpg`));
  }
  mkdirSync(path.dirname(cache), { recursive: true });
  writeFileSync(cache, JSON.stringify({ at: new Date().toISOString(), urls }, null, 2));
  return urls;
}

async function loraUrl(subject: Subject): Promise<string | null> {
  if (existsSync(loraInfoFile)) return (JSON.parse(readFileSync(loraInfoFile, "utf8")) as { url: string }).url;
  if (!loraTrain || !runnable.has(loraTrain.key)) return null;
  const files: Record<string, Uint8Array> = {};
  for (const [i, f] of subject.selfies.slice(0, 8).entries()) files[`selfie-${i + 1}.jpg`] = new Uint8Array((await normalizeSelfie(f)).buffer);
  const zipUrl = await upload(Buffer.from(zipSync(files)), "application/zip", `${subject.id}-selfies.zip`);
  let url: string | null = null;
  await execute<LoraTrainResponse>(
    {
      key: loraTrain.key,
      kind: "lora-train",
      endpoint: LORA.trainEndpoint,
      input: { images_data_url: zipUrl, trigger_word: LORA.triggerWord, steps: LORA.steps },
      costUsd: loraTrain.costUsd,
      meta: { subject: subject.id, model: "lora" },
      save: async (d) => {
        url = d.diffusers_lora_file.url;
        mkdirSync(loraDir, { recursive: true });
        writeFileSync(loraInfoFile, JSON.stringify({ url, trainedAt: new Date().toISOString(), steps: LORA.steps }, null, 2));
        return { url };
      },
    },
    spend,
    LOG,
  );
  return url;
}

const results = { ok: 0, failed: 0, skipped: 0 };
for (const subject of subjects) {
  const todo = frames.filter((f) => f.subject.id === subject.id && runnable.has(f.key));
  if (!todo.length && !(loraTrain && loraSubject?.id === subject.id && runnable.has(loraTrain.key))) continue;
  console.log(`\n▶ ${subject.id}`);
  const refUrls = todo.some((f) => f.model !== "lora") ? await uploadedSelfies(subject) : [];
  const lora = loraSubject?.id === subject.id ? await loraUrl(subject) : null;

  const jobs = todo
    .filter((f) => (f.model !== "lora" || lora) && f.prompt)
    .map((f) => () => {
      const seed = f.seed;
      const isLora = f.model === "lora";
      const model = f.model as BenchModel;
      return execute<ImagesResponse>(
        {
          key: f.key,
          kind: "frame",
          endpoint: isLora ? LORA.generateEndpoint : model.endpoint,
          input: isLora ? buildLoraFrameInput(f.prompt!, lora!, seed) : buildFrameInput(model, f.prompt!, refUrls, seed),
          costUsd: f.costUsd,
          meta: { subject: f.subject.id, model: f.dir, style: f.style, n: f.n, promptHash: f.promptHash ?? undefined },
          save: async (d) => {
            const img = d.images?.[0];
            if (!img?.url) throw new Error("no image in the response");
            return { url: img.url, file: path.relative(RUN, f.file), ...(await downloadImage(img.url, f.file)) };
          },
        },
        spend,
        LOG,
      );
    });
  for (const r of await runPool(jobs, MAX_CONCURRENCY)) {
    if (r.status === "fulfilled") results[r.value] += 1;
    else results.failed += 1;
  }
}

console.log(`\nDone: ${results.ok} ok, ${results.failed} failed, ${results.skipped} skipped by the ceiling. Spent in total: ${formatUsd(spend.spent)}.`);
console.log(`Frames: bench/runs/${runId}/   Next: npm run bench:score`);
