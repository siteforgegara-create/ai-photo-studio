/**
 * Demo set (docs/07 §8), after the winner is chosen:
 * one synthetic persona in all 12 styles of src/config/styles.ts + before/after
 * pairs for the Studio tools (Background ×2, Outfit, Retouch, Relight) made with
 * the edits model. Every candidate goes through the same auto-likeness filter.
 *
 *   npm run bench:demo -- --model=nb21 --dry-run
 *   npm run bench:demo -- --model=nb21 [--edit-model=seedream --persona=synth-03 --candidates=2 --yes]
 *
 * Output: public/demo/headshot/<styleId>.webp, public/demo/headshot/selfie.webp,
 * public/demo/edits/<tool>-<option>.webp (1080×1350) + a manifest snippet in
 * bench/runs/<run>/demo/. New file names only — nothing existing is overwritten.
 * The owner reviews them and adds them to git.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { shootStyles } from "../src/config/styles";
import { DEMO, MAX_CONCURRENCY } from "./config";
import { formatUsd, type Size } from "./lib/cost";
import { getFalKey } from "./lib/env";
import { confirm, fail, parseCommonArgs, printPlan } from "./lib/cli";
import { execute } from "./lib/execute";
import { upload } from "./lib/fal";
import { analyzeFace, cosine, defectOf, largestFace } from "./lib/face";
import { downloadImage, exportWebp, normalizeSelfie } from "./lib/images";
import { Spend } from "./lib/ledger";
import { buildFrameInput, getModel, PLANNED_SELFIE_SIZE, type ImagesResponse } from "./lib/models";
import { demoCandidateFile, demoEditFile, demoItems } from "./lib/plans";
import { ROOT, resolveRunId, runDir } from "./lib/paths";
import { runPool } from "./lib/pool";
import { loadSubjects, type Subject } from "./lib/subjects";
import type { ScoresFile } from "./lib/types";
import { DEMO_EDITS, generationPrompt } from "./prompts";

const args = parseCommonArgs();
if (!args.model) fail("Pass the winning model: npm run bench:demo -- --model=<nb21|nbpro|seedream|flux3>");
const model = getModel(args.model);
const editModel = getModel(args.editModel ?? args.model);
const spend = new Spend();
const runId = resolveRunId(args.run);
const RUN = runDir(runId);
const DIR = path.join(RUN, "demo");
const LOG = path.join(DIR, "log.jsonl");
const CANDIDATES = args.candidates ?? DEMO.candidatesPerStyle;
const PUBLIC = path.join(ROOT, "public", "demo");

// Persona: --persona, else the synth subject with the best auto likeness for this model, else synth-01.
const scoresFile = path.join(RUN, "scores.json");
const scores = existsSync(scoresFile) ? (JSON.parse(readFileSync(scoresFile, "utf8")) as ScoresFile) : null;
function bestPersona(): string {
  if (!scores) return "synth-01";
  const bySubject = new Map<string, number[]>();
  for (const f of scores.frames) if (f.subjectType === "synth" && f.model === model.key && f.similarity !== null) bySubject.set(f.subject, [...(bySubject.get(f.subject) ?? []), f.similarity]);
  const ranked = [...bySubject.entries()].map(([id, xs]) => [id, xs.reduce((a, b) => a + b, 0) / xs.length] as const).sort((a, b) => b[1] - a[1]);
  return ranked[0]?.[0] ?? "synth-01";
}
const personaId = args.persona ?? bestPersona();
const persona: Subject | undefined = loadSubjects([personaId])[0];
if (!persona && !args.dryRun) fail(`${personaId} not found in bench/subjects/ — run bench:personas first.`);
if (persona && persona.type !== "synth") fail("The demo heroine must be a synthetic persona (synth-*), never a real person.");

const selfieSizes: Size[] = persona ? await Promise.all(persona.selfies.slice(0, 8).map(async (f) => normalizeSelfie(f).then((n) => ({ width: n.width, height: n.height })))) : Array.from({ length: 6 }, () => PLANNED_SELFIE_SIZE);
const { styles: styleItems, edits: editItems } = demoItems(runId, model, editModel, selfieSizes, CANDIDATES);
const candFile = (style: string, k: number) => demoCandidateFile(runId, style, k);
const editFile = (tool: string, option: string) => demoEditFile(runId, tool, option);

console.log(`Demo heroine: ${personaId}${persona ? "" : " (planned)"} · shoot model: ${model.label} · edits model: ${editModel.label}`);
const runnable = new Set(printPlan("bench:demo", [...styleItems, ...editItems], spend.snapshot()).map((i) => i.key));
if (args.dryRun) {
  console.log("\nDry run — nothing was called.");
  process.exit(0);
}
getFalKey(); // fail before asking for confirmation if the key is missing
if (!persona) process.exit(1);
if (runnable.size && !(await confirm(args))) process.exit(0);

// Reference embedding of the heroine and the auto-likeness floor.
const refFace = largestFace(await analyzeFace(persona.reference ?? persona.selfies[0]!));
if (!refFace) fail(`No face found in ${personaId}'s reference.`);
const impostor = scores?.baseline.impostor ?? [];
const floor = impostor.length ? [...impostor].sort((a, b) => a - b)[Math.floor(impostor.length * 0.9)]! : 0;

// 1. Twelve styles.
const refUrls: string[] = [];
for (const [i, f] of persona.selfies.slice(0, 8).entries()) refUrls.push(await upload((await normalizeSelfie(f)).buffer, "image/jpeg", `${personaId}-selfie-${i + 1}.jpg`));
await runPool(
  styleItems
    .filter((it) => runnable.has(it.key))
    .map((it) => () =>
      execute<ImagesResponse>(
        {
          key: it.key,
          kind: "demo",
          endpoint: model.endpoint,
          input: buildFrameInput(model, generationPrompt(it.style), refUrls, it.seed),
          costUsd: it.costUsd,
          meta: { subject: personaId, model: model.key, style: it.style, n: it.k },
          save: async (d) => ({ url: d.images[0]!.url, ...(await downloadImage(d.images[0]!.url, candFile(it.style, it.k))) }),
        },
        spend,
        LOG,
      ),
    ),
  MAX_CONCURRENCY,
);

// Pick the best candidate per style by auto likeness; export 1080×1350 WebP.
const picked: Record<string, { file: string; similarity: number } | null> = {};
for (const s of shootStyles) {
  let best: { file: string; similarity: number } | null = null;
  for (let k = 1; k <= CANDIDATES; k++) {
    const f = candFile(s.id, k);
    if (!existsSync(f)) continue;
    const r = await analyzeFace(f);
    const face = largestFace(r);
    if (defectOf(r) || !face) continue;
    const sim = cosine(face.embedding, refFace.embedding);
    if (!best || sim > best.similarity) best = { file: f, similarity: sim };
  }
  picked[s.id] = best && best.similarity >= floor ? best : null;
  if (best && best.similarity >= floor) await exportWebp(best.file, path.join(PUBLIC, "headshot", `${s.id}.webp`), DEMO.size);
  console.log(`  ${s.id.padEnd(20)} ${best ? `likeness ${best.similarity.toFixed(3)}${best.similarity < floor ? " — below the filter, NOT exported" : " → exported"}` : "no usable candidate"}`);
}
await exportWebp(persona.selfies[0]!, path.join(PUBLIC, "headshot", "selfie.webp"), DEMO.size);

// 2. Studio edits on the corporate-gray frame.
const base = picked["corporate-gray"];
if (base) {
  const baseUrl = await upload((await normalizeSelfie(base.file)).buffer, "image/jpeg", "demo-base.jpg");
  await runPool(
    editItems
      .filter((it) => runnable.has(it.key))
      .map((it) => () =>
        execute<ImagesResponse>(
          {
            key: it.key,
            kind: "demo",
            endpoint: editModel.endpoint,
            input: buildFrameInput(editModel, it.prompt, [baseUrl], 7001),
            costUsd: it.costUsd,
            meta: { subject: personaId, model: editModel.key, style: `${it.tool}-${it.option}` },
            save: async (d) => ({ url: d.images[0]!.url, ...(await downloadImage(d.images[0]!.url, editFile(it.tool, it.option))) }),
          },
          spend,
          LOG,
        ),
      ),
    MAX_CONCURRENCY,
  );
  for (const e of editItems) {
    const f = editFile(e.tool, e.option);
    if (!existsSync(f)) continue;
    const face = largestFace(await analyzeFace(f));
    const sim = face ? cosine(face.embedding, refFace.embedding) : 0;
    if (sim >= floor) await exportWebp(f, path.join(PUBLIC, "edits", `${e.tool}-${e.option}.webp`), DEMO.size);
    console.log(`  edit ${`${e.tool}-${e.option}`.padEnd(24)} likeness ${sim.toFixed(3)}${sim < floor ? " — below the filter, NOT exported" : " → exported"}`);
  }
} else {
  console.log("  corporate-gray has no usable frame — Studio edits skipped.");
}

// Manifest snippet for src/config/demo-manifest.ts (the owner pastes it after review).
mkdirSync(DIR, { recursive: true });
const shootLines = shootStyles.filter((s) => picked[s.id]).map((s) => `    "${s.id}": "/demo/headshot/${s.id}.webp",`);
const editLines = DEMO_EDITS.filter((e) => existsSync(path.join(PUBLIC, "edits", `${e.tool}-${e.option}.webp`))).map(
  (e) => `  // ${e.tool}\n  "${e.option}": { before: "/demo/headshot/corporate-gray.webp", after: "/demo/edits/${e.tool}-${e.option}.webp", alt: "Example: …", aligned: true },`,
);
writeFileSync(
  path.join(DIR, "manifest-suggestion.ts"),
  `// Generated by bench:demo (${new Date().toISOString()}), heroine ${personaId}, ${model.label} / edits ${editModel.label}.\n// Review the images in public/demo/ first, then copy what you keep into src/config/demo-manifest.ts.\n\nshoot: {\n${shootLines.join("\n")}\n},\nselfie: "/demo/headshot/selfie.webp",\n\n// edits (per tool):\n${editLines.join("\n")}\n`,
);
writeFileSync(path.join(DIR, "demo-scores.json"), JSON.stringify({ persona: personaId, model: model.key, editModel: editModel.key, floor, picked }, null, 2));
console.log(`\nExported to public/demo/ (not in git yet). Manifest snippet: bench/runs/${runId}/demo/manifest-suggestion.ts. Spent in total: ${formatUsd(spend.spent)}.`);
