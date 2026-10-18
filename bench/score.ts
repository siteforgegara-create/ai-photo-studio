/**
 * Automatic metrics (docs/07 §5): face likeness, technical defects, time and
 * cost per frame. Free — runs locally, no fal calls.
 *
 *   npm run bench:score [-- --run=2026-10-20]
 *
 * Likeness = cosine similarity of face embeddings: frame ↔ reference.jpg
 * (synthetic) or frame ↔ mean of the selfies (real). It also measures the
 * "same person" vs "different person" distributions on the selfies, so the
 * numbers can be read against a baseline.
 */
import { existsSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fail, parseCommonArgs } from "./lib/cli";
import { analyzeFace, cosine, defectOf, largestFace, meanEmbedding } from "./lib/face";
import { readLog } from "./lib/log";
import { listImages, rel, resolveRunId, runDir } from "./lib/paths";
import { loadSubjects, type Subject } from "./lib/subjects";
import type { FrameScore, ScoresFile } from "./lib/types";

const args = parseCommonArgs();
const runId = resolveRunId(args.run);
const RUN = runDir(runId);
if (args.dryRun) {
  console.log(`bench:score — local face analysis, no fal.ai calls, cost $0.00.\nWould read bench/runs/${runId}/<subject>/<model>/*.jpg and bench/subjects/, and write bench/runs/${runId}/scores.json.`);
  process.exit(0);
}
if (!existsSync(RUN)) fail(`No run folder bench/runs/${runId}. Run bench:run first.`);

const subjects = loadSubjects(args.subjects);
if (!subjects.length) fail("No subjects in bench/subjects/.");
console.log(`Scoring bench/runs/${runId} — loading the face model (local, ~5 s)…`);

// Reference embedding per subject.
const refs = new Map<string, number[]>();
const selfieEmb = new Map<string, number[][]>();
const subjectInfo: ScoresFile["subjects"] = [];
for (const s of subjects) {
  const embs: number[][] = [];
  for (const f of s.selfies) {
    const face = largestFace(await analyzeFace(f));
    if (face) embs.push(face.embedding);
  }
  selfieEmb.set(s.id, embs);
  let ref: number[] = [];
  let from = "mean of selfies";
  if (s.type === "synth" && s.reference) {
    const face = largestFace(await analyzeFace(s.reference));
    if (face) {
      ref = face.embedding;
      from = "reference.jpg";
    }
  }
  if (!ref.length) ref = meanEmbedding(embs);
  refs.set(s.id, ref);
  subjectInfo.push({ id: s.id, type: s.type, referenceFrom: from, selfiesWithFace: embs.length, selfiesTotal: s.selfies.length });
  console.log(`  ${s.id}: reference = ${from} (${embs.length}/${s.selfies.length} selfies with a face)`);
}

// Baseline: selfie ↔ own reference (genuine) vs selfie ↔ other subjects (impostor).
const genuine: number[] = [];
const impostor: number[] = [];
for (const s of subjects) {
  for (const e of selfieEmb.get(s.id) ?? []) {
    for (const other of subjects) {
      const r = refs.get(other.id);
      if (!r?.length) continue;
      (other.id === s.id ? genuine : impostor).push(round(cosine(e, r)));
    }
  }
}

// Frames.
const log = readLog(path.join(RUN, "log.jsonl"));
const byKey = new Map(log.filter((l) => l.status === "ok").map((l) => [l.key, l]));
const frames: FrameScore[] = [];
for (const s of subjects) {
  const sdir = path.join(RUN, s.id);
  if (!existsSync(sdir)) continue;
  for (const model of readdirSync(sdir).filter((d) => statSync(path.join(sdir, d)).isDirectory() && d !== "lora-train")) {
    for (const file of listImages(path.join(sdir, model))) {
      const m = path.basename(file).match(/^(.+)-(\d+)\.jpg$/);
      if (!m) continue;
      const [, style, n] = m;
      const r = await analyzeFace(file);
      const defect = defectOf(r);
      const face = largestFace(r);
      const ref = refs.get(s.id);
      const key = `${s.id}/${model}/${style}-${n}`;
      frames.push({
        file: rel(RUN, file),
        subject: s.id,
        subjectType: (s as Subject).type,
        model,
        style: style!,
        n: Number(n),
        faces: r.faces.length,
        defect,
        similarity: face && ref?.length ? round(cosine(face.embedding, ref)) : null,
        ms: byKey.get(key)?.ms,
        usd: byKey.get(key)?.usd,
      });
    }
  }
}

const out: ScoresFile = {
  run: runId,
  scoredAt: new Date().toISOString(),
  method: "@vladmandic/human (WASM): BlazeFace detector + FaceRes embedding (1024-d), cosine similarity",
  baseline: { genuine, impostor },
  subjects: subjectInfo,
  frames,
};
writeFileSync(path.join(RUN, "scores.json"), JSON.stringify(out, null, 2));

const pct = (arr: number[], p: number) => (arr.length ? [...arr].sort((a, b) => a - b)[Math.min(arr.length - 1, Math.floor((p / 100) * arr.length))]! : NaN);
console.log(`\nBaseline (selfies): same person median ${pct(genuine, 50).toFixed(3)} (p10 ${pct(genuine, 10).toFixed(3)}), different people median ${pct(impostor, 50).toFixed(3)} (p90 ${pct(impostor, 90).toFixed(3)})`);
const models = [...new Set(frames.map((f) => f.model))];
for (const m of models) {
  const fs = frames.filter((f) => f.model === m);
  const sims = fs.map((f) => f.similarity).filter((v): v is number => v !== null);
  const avg = sims.reduce((a, b) => a + b, 0) / (sims.length || 1);
  console.log(`  ${m.padEnd(9)} ${String(fs.length).padStart(3)} frames  mean likeness ${avg.toFixed(3)}  defects ${fs.filter((f) => f.defect).length}`);
}
console.log(`\nSaved bench/runs/${runId}/scores.json. Next: npm run bench:review`);

function round(v: number) {
  return Math.round(v * 10000) / 10000;
}
