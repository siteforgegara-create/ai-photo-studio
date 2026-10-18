/**
 * Step A (docs/07 §2): five synthetic personas — a frontal reference portrait
 * and six "bad selfies" each, made with Qwen models (not under test):
 * Qwen Image (text-to-image) for the reference, Qwen Image Edit 2511 for the selfies.
 *
 *   npm run bench:personas -- --dry-run
 *   npm run bench:personas [-- --yes]
 */
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { PERSONAS } from "./config";
import { callCost, type PlanItem } from "./lib/cost";
import { getFalKey } from "./lib/env";
import { confirm, parseCommonArgs, printPlan } from "./lib/cli";
import { execute } from "./lib/execute";
import { downloadImage, normalizeSelfie } from "./lib/images";
import { Spend } from "./lib/ledger";
import type { ImagesResponse } from "./lib/models";
import { SUBJECTS_DIR, RUNS_DIR } from "./lib/paths";
import { runPool } from "./lib/pool";
import { upload } from "./lib/fal";
import { upsertSubjectMeta } from "./lib/subjects";
import { PERSONA_SPECS, SELFIE_VARIANTS, personaReferencePrompt, selfiePrompt } from "./prompts";
import { MAX_CONCURRENCY } from "./config";

const args = parseCommonArgs();
const spend = new Spend();
const LOG = path.join(RUNS_DIR, "personas-log.jsonl");
const refPrice = callCost(PERSONAS.referencePricing, { output: PERSONAS.referenceSize });
const selfiePrice = callCost(PERSONAS.selfiePricing, { output: PERSONAS.selfieSize });
const personas = args.subjects ? PERSONA_SPECS.filter((p) => args.subjects!.includes(p.id)) : PERSONA_SPECS;

const refFile = (id: string) => path.join(SUBJECTS_DIR, id, "reference.jpg");
const selfieFile = (id: string, n: number) => path.join(SUBJECTS_DIR, id, "selfies", `selfie-${n}.jpg`);

const items: PlanItem[] = personas.flatMap((p) => [
  { key: `${p.id}/reference`, group: "reference portrait", label: `${p.id} reference`, costUsd: refPrice, cached: existsSync(refFile(p.id)) },
  ...SELFIE_VARIANTS.slice(0, PERSONAS.selfiesPerPersona).map((_, i) => ({
    key: `${p.id}/selfie-${i + 1}`,
    group: "bad selfies",
    label: `${p.id} selfie ${i + 1}`,
    costUsd: selfiePrice,
    cached: existsSync(selfieFile(p.id, i + 1)),
  })),
]);

console.log(`Personas: ${personas.map((p) => `${p.id} (${p.gender}, ${p.ageGroup}, ${p.skinTone})`).join("; ")}`);
console.log(`Reference: ${PERSONAS.referenceEndpoint} ${PERSONAS.referenceSize.width}×${PERSONAS.referenceSize.height}, $${refPrice} each`);
console.log(`Selfies:   ${PERSONAS.selfieEndpoint} ${PERSONAS.selfieSize.width}×${PERSONAS.selfieSize.height}, $${selfiePrice} each`);
console.log(`Prices: ${PERSONAS.sources.map((s) => `${s.url} (${s.note}, checked ${s.checked})`).join("; ")}`);
const runnable = printPlan("bench:personas", items, spend.snapshot());

if (args.dryRun) {
  console.log("\nDry run — nothing was called.");
  process.exit(0);
}
getFalKey(); // fail before asking for confirmation if the key is missing
if (!runnable.length) {
  console.log("\nNothing to do.");
  process.exit(0);
}
if (!(await confirm(args))) process.exit(0);

for (const p of personas) {
  const personaIndex = PERSONA_SPECS.indexOf(p);
  mkdirSync(path.join(SUBJECTS_DIR, p.id, "selfies"), { recursive: true });
  upsertSubjectMeta({ id: p.id, type: "synth", gender: p.gender, ageGroup: p.ageGroup, skinTone: p.skinTone });
  const allowed = new Set(runnable.map((i) => i.key));

  // 1. Reference portrait (text-to-image).
  if (allowed.has(`${p.id}/reference`)) {
    await execute<ImagesResponse>(
      {
        key: `${p.id}/reference`,
        kind: "persona",
        endpoint: PERSONAS.referenceEndpoint,
        input: {
          prompt: personaReferencePrompt(p),
          image_size: PERSONAS.referenceSize,
          num_images: 1,
          seed: PERSONAS.baseSeed + personaIndex * 10,
          output_format: "jpeg",
        },
        costUsd: refPrice,
        meta: { subject: p.id },
        save: async (d) => ({ url: d.images[0]?.url, ...(await downloadImage(d.images[0]!.url, refFile(p.id))), file: refFile(p.id) }),
      },
      spend,
      LOG,
    );
  }
  if (!existsSync(refFile(p.id))) {
    console.log(`  ${p.id}: no reference portrait — selfies skipped.`);
    continue;
  }

  // 2. Six bad selfies from the reference (image edit).
  const ref = await normalizeSelfie(refFile(p.id));
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
          input: {
            prompt: selfiePrompt(variant),
            image_urls: [refUrl],
            image_size: PERSONAS.selfieSize,
            num_images: 1,
            seed: PERSONAS.baseSeed + personaIndex * 10 + n,
            output_format: "jpeg",
          },
          costUsd: selfiePrice,
          meta: { subject: p.id, n },
          save: async (d) => ({ url: d.images[0]?.url, ...(await downloadImage(d.images[0]!.url, selfieFile(p.id, n))), file: selfieFile(p.id, n) }),
        },
        spend,
        LOG,
      ),
    );
  await runPool(jobs, MAX_CONCURRENCY);
}

console.log(`\nDone. Spent so far: $${spend.spent.toFixed(3)}. Personas are in bench/subjects/synth-*/ — look at them before bench:run.`);
