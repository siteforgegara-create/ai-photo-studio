/**
 * Step A (docs/07 §2): five synthetic personas — a frontal reference portrait
 * and six "bad selfies" each, made with Qwen models (not under test):
 * Qwen Image (text-to-image) for the reference, Qwen Image Edit 2511 for the selfies.
 * The appearance is spelled out per persona (prompts.ts PERSONA_SPECS).
 *
 *   npm run bench:personas -- --dry-run
 *   npm run bench:personas [-- --yes]
 *   npm run bench:personas -- --redo=synth-02,synth-05 [--dry-run]
 *
 * --redo regenerates the reference and all 6 selfies of those personas only:
 * plan and y/N first, then their old reference/selfies (and their frames in
 * bench/runs/*, which no longer match the face) are deleted and regenerated.
 * Every call goes through spend.json and the ceiling as usual.
 */
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { MAX_CONCURRENCY, PERSONAS } from "./config";
import { confirm, fail, parseCommonArgs, printPlan } from "./lib/cli";
import { getFalKey } from "./lib/env";
import { execute } from "./lib/execute";
import { upload } from "./lib/fal";
import { downloadImage, normalizeSelfie } from "./lib/images";
import { Spend } from "./lib/ledger";
import type { ImagesResponse } from "./lib/models";
import { listRuns, RUNS_DIR, runDir, SUBJECTS_DIR } from "./lib/paths";
import { personaItems, personaMarkerFile, personaPrices, personaPromptHash, personaRefFile, personaSelfieFile } from "./lib/plans";
import { runPool } from "./lib/pool";
import { upsertSubjectMeta } from "./lib/subjects";
import { PERSONA_SPECS, SELFIE_VARIANTS, personaReferencePrompt, selfiePrompt } from "./prompts";

const args = parseCommonArgs();
const spend = new Spend();
const LOG = path.join(RUNS_DIR, "personas-log.jsonl");
const price = personaPrices();

const unknown = (args.redo ?? []).filter((id) => !PERSONA_SPECS.some((p) => p.id === id));
if (unknown.length) fail(`--redo: unknown persona ${unknown.join(", ")}. Use ids from ${PERSONA_SPECS.map((p) => p.id).join(", ")}.`);
const redo = new Set(args.redo ?? []);
const selected = args.redo ? args.redo : args.subjects;
const personas = selected ? PERSONA_SPECS.filter((p) => selected.includes(p.id)) : PERSONA_SPECS;

const items = personaItems(personas, redo);

console.log(`Personas: ${personas.map((p) => `${p.id} (${p.gender}, ${p.ageGroup}, ${p.skinTone})${redo.has(p.id) ? " — REDO" : ""}`).join("; ")}`);
for (const p of personas) console.log(`  ${p.id}: ${p.description}`);
console.log(`Reference: ${PERSONAS.referenceEndpoint} ${PERSONAS.referenceSize.width}×${PERSONAS.referenceSize.height}, $${price.reference} each`);
console.log(`Selfies:   ${PERSONAS.selfieEndpoint} ${PERSONAS.selfieSize.width}×${PERSONAS.selfieSize.height}, $${price.selfie} each`);
console.log(`Prices: ${PERSONAS.sources.map((s) => `${s.url} (${s.note}, checked ${s.checked})`).join("; ")}`);
if (redo.size) {
  const frames = listRuns().filter((r) => [...redo].some((id) => existsSync(path.join(runDir(r), id))));
  console.log(`--redo deletes before generating: reference.jpg + selfies/ of ${[...redo].join(", ")}${frames.length ? `, and their frames in bench/runs/{${frames.join(",")}}/<id>/` : ""}.`);
}
const runnable = printPlan(redo.size ? "bench:personas --redo" : "bench:personas", items, spend.snapshot());

if (args.dryRun) {
  console.log("\nDry run — nothing was called or deleted.");
  process.exit(0);
}
getFalKey(); // fail before asking for confirmation if the key is missing

// subjects.json: metadata + "truth" for every persona (also the ones not regenerated now).
for (const p of PERSONA_SPECS) upsertSubjectMeta({ id: p.id, type: "synth", gender: p.gender, ageGroup: p.ageGroup, skinTone: p.skinTone, truth: p.truth });

if (!runnable.length) {
  console.log("\nNothing to generate (subjects.json updated with the persona truth).");
  process.exit(0);
}
if (!(await confirm(args))) process.exit(0);

// --redo: remove the old persona and every frame made from it.
for (const id of redo) {
  rmSync(personaRefFile(id), { force: true });
  rmSync(path.join(SUBJECTS_DIR, id, "selfies"), { recursive: true, force: true });
  rmSync(personaMarkerFile(id), { force: true });
  for (const r of listRuns()) {
    const dir = path.join(runDir(r), id);
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true, force: true });
      console.log(`  removed bench/runs/${r}/${id}/ (frames of the old ${id})`);
    }
  }
}

const allowed = new Set(runnable.map((i) => i.key));
for (const p of personas) {
  const personaIndex = PERSONA_SPECS.indexOf(p);
  mkdirSync(path.join(SUBJECTS_DIR, p.id, "selfies"), { recursive: true });

  // 1. Reference portrait (text-to-image).
  if (allowed.has(`${p.id}/reference`)) {
    await execute<ImagesResponse>(
      {
        key: `${p.id}/reference`,
        kind: "persona",
        endpoint: PERSONAS.referenceEndpoint,
        input: { prompt: personaReferencePrompt(p), image_size: PERSONAS.referenceSize, num_images: 1, seed: PERSONAS.baseSeed + personaIndex * 10, output_format: "jpeg" },
        costUsd: price.reference,
        meta: { subject: p.id },
        save: async (d) => ({ url: d.images[0]?.url, ...(await downloadImage(d.images[0]!.url, personaRefFile(p.id))), file: personaRefFile(p.id) }),
      },
      spend,
      LOG,
    );
  }
  if (!existsSync(personaRefFile(p.id))) {
    console.log(`  ${p.id}: no reference portrait — selfies skipped.`);
    continue;
  }

  // 2. Six bad selfies from the reference (image edit).
  const ref = await normalizeSelfie(personaRefFile(p.id));
  const refUrl = await upload(ref.buffer, "image/jpeg", `${p.id}-reference.jpg`);
  const jobs = SELFIE_VARIANTS.slice(0, PERSONAS.selfiesPerPersona)
    .map((variant, i) => ({ variant, n: i + 1 }))
    .filter(({ n }) => allowed.has(`${p.id}/selfie-${n}`))
    .map(({ variant, n }) => () =>
      execute<ImagesResponse>(
        {
          key: `${p.id}/selfie-${n}`,
          kind: "persona",
          endpoint: PERSONAS.selfieEndpoint,
          input: { prompt: selfiePrompt(variant), image_urls: [refUrl], image_size: PERSONAS.selfieSize, num_images: 1, seed: PERSONAS.baseSeed + personaIndex * 10 + n, output_format: "jpeg" },
          costUsd: price.selfie,
          meta: { subject: p.id, n },
          save: async (d) => ({ url: d.images[0]?.url, ...(await downloadImage(d.images[0]!.url, personaSelfieFile(p.id, n))), file: personaSelfieFile(p.id, n) }),
        },
        spend,
        LOG,
      ),
    );
  await runPool(jobs, MAX_CONCURRENCY);

  const complete = existsSync(personaRefFile(p.id)) && SELFIE_VARIANTS.slice(0, PERSONAS.selfiesPerPersona).every((_, i) => existsSync(personaSelfieFile(p.id, i + 1)));
  // Marker only when the reference was generated now, i.e. with the current prompt.
  if (complete && allowed.has(`${p.id}/reference`)) {
    writeFileSync(personaMarkerFile(p.id), JSON.stringify({ id: p.id, promptHash: personaPromptHash(p), generatedAt: new Date().toISOString(), referenceEndpoint: PERSONAS.referenceEndpoint, selfieEndpoint: PERSONAS.selfieEndpoint }, null, 2));
  }
}

console.log(`\nDone. Counted so far: $${spend.spent.toFixed(3)} at list prices (ceiling check: $${spend.effective.toFixed(3)} with margin).`);
console.log(`Personas are in bench/subjects/synth-*/ — look at them, then: npm run bench:analyze`);
