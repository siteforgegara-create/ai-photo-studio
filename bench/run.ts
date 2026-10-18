/**
 * Generation (docs/07 §3–4, §6): every subject × model × 2 styles × 2 frames,
 * plus the LoRA control for one real participant.
 *
 *   npm run bench:run -- --dry-run
 *   npm run bench:run [-- --only=nb2,seedream --subjects=real-01 --run=2026-10-20 --no-lora --lora-subject=real-02 --yes]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { zipSync } from "fflate";
import { BENCH_STYLES, FRAMES_PER_STYLE, LORA, MAX_CONCURRENCY, MODELS, OUTPUT, type BenchModel } from "./config";
import { formatUsd, type PlanItem, type Size } from "./lib/cost";
import { getFalKey } from "./lib/env";
import { confirm, fail, parseCommonArgs, printPlan } from "./lib/cli";
import { execute } from "./lib/execute";
import { upload } from "./lib/fal";
import { downloadImage, normalizeSelfie } from "./lib/images";
import { Spend } from "./lib/ledger";
import {
  buildFrameInput,
  buildLoraFrameInput,
  frameCost,
  getModel,
  loraFrameCost,
  loraTrainCost,
  PLANNED_SELFIE_SIZE,
  seedFor,
  type ImagesResponse,
  type LoraTrainResponse,
} from "./lib/models";
import { framePath, resolveRunId, runDir } from "./lib/paths";
import { runPool } from "./lib/pool";
import { subjectsForPlan, validateSubject, type Subject } from "./lib/subjects";
import { generationPrompt } from "./prompts";

const args = parseCommonArgs();
const spend = new Spend();
const runId = resolveRunId(args.run);
const RUN = runDir(runId);
const LOG = path.join(RUN, "log.jsonl");

const models: BenchModel[] = (args.only?.filter((k) => k !== "lora") ?? Object.keys(MODELS)).map(getModel);
const withLora = !args.noLora && (!args.only || args.only.includes("lora"));
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

// Selfie sizes after normalisation (needed for FLUX.2 per-MP input pricing).
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
type FrameItem = PlanItem & { subject: Subject; model: BenchModel | "lora"; style: string; styleIndex: number; n: number; file: string };
const frames: FrameItem[] = [];
for (const subject of subjects) {
  for (const model of models) {
    BENCH_STYLES.forEach((style, styleIndex) => {
      for (let n = 1; n <= FRAMES_PER_STYLE; n++) {
        const file = framePath(runId, subject.id, model.key, style, n);
        frames.push({
          key: `${subject.id}/${model.key}/${style}-${n}`,
          group: model.label,
          label: `${subject.id} · ${model.label} · ${style} #${n}`,
          costUsd: frameCost(model, selfieSizes.get(subject.id) ?? []),
          cached: existsSync(file),
          subject,
          model,
          style,
          styleIndex,
          n,
          file,
        });
      }
    });
  }
}
const loraDir = loraSubject ? path.join(RUN, loraSubject.id, "lora") : "";
const loraInfoFile = loraSubject ? path.join(loraDir, "training.json") : "";
const loraTrain: PlanItem | null = loraSubject
  ? { key: `${loraSubject.id}/lora/train`, group: "LoRA training", label: `LoRA training on ${loraSubject.id} (${LORA.steps} steps)`, costUsd: loraTrainCost(), cached: existsSync(loraInfoFile) }
  : null;
if (loraSubject) {
  BENCH_STYLES.forEach((style, styleIndex) => {
    for (let n = 1; n <= FRAMES_PER_STYLE; n++) {
      const file = framePath(runId, loraSubject.id, "lora", style, n);
      frames.push({ key: `${loraSubject.id}/lora/${style}-${n}`, group: "FLUX LoRA frames", label: `${loraSubject.id} · LoRA · ${style} #${n}`, costUsd: loraFrameCost(), cached: existsSync(file), subject: loraSubject, model: "lora", style, styleIndex, n, file });
    }
  });
}

console.log(`Run: bench/runs/${runId}   Subjects: ${subjects.map((s) => s.id).join(", ")}${subjects.some((s) => s.planned) ? "  (PLANNED — no photos yet)" : ""}`);
console.log(`Models: ${models.map((m) => `${m.key} → ${m.endpoint} (${m.source.note})`).join("\n        ")}`);
if (loraSubject) console.log(`        lora → ${LORA.trainEndpoint} + ${LORA.generateEndpoint} on ${loraSubject.id}`);
console.log(`Output: ${OUTPUT.width}×${OUTPUT.height} (Seedream 1728×2160 — its minimum). Prices checked ${MODELS.nb2.source.checked}.`);
const planItems: PlanItem[] = [...(loraTrain ? [loraTrain] : []), ...frames];
const runnable = new Set(printPlan("bench:run", planItems, spend.snapshot()).map((i) => i.key));

if (args.dryRun) {
  console.log("\nDry run — nothing was called.");
  process.exit(0);
}
getFalKey(); // fail before asking for confirmation if the key is missing
if (!runnable.size) {
  console.log("\nNothing to do — every frame is already generated.");
  process.exit(0);
}
if (!(await confirm(args))) process.exit(0);

// ─── Execute ────────────────────────────────────────────────────────────────
mkdirSync(RUN, { recursive: true });
writeFileSync(path.join(RUN, "run.json"), JSON.stringify({ runId, startedAt: new Date().toISOString(), models: models.map((m) => m.key), lora: loraSubject?.id ?? null, styles: BENCH_STYLES }, null, 2));

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
    .filter((f) => f.model !== "lora" || lora)
    .map((f) => () => {
      const seed = seedFor(f.styleIndex, f.n);
      const isLora = f.model === "lora";
      const model = f.model as BenchModel;
      return execute<ImagesResponse>(
        {
          key: f.key,
          kind: "frame",
          endpoint: isLora ? LORA.generateEndpoint : model.endpoint,
          input: isLora ? buildLoraFrameInput(generationPrompt(f.style, `${LORA.triggerWord} person`), lora!, seed) : buildFrameInput(model, generationPrompt(f.style), refUrls, seed),
          costUsd: f.costUsd,
          meta: { subject: f.subject.id, model: isLora ? "lora" : model.key, style: f.style, n: f.n },
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
