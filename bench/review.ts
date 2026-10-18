/**
 * Builds the blind review page (docs/07 §5). Free, local.
 *
 *   npm run bench:review [-- --run=2026-10-20]
 *   npm run bench:review -- --set=b05     B0.5: real-01 and real-02 only — the nb21 and flux3
 *                                         frames (anchors, not regenerated) + the 3 variants,
 *                                         under NEW ids → review-b05.html, review-img-b05/,
 *                                         review-key-b05.json; ratings go to ratings-b05.json
 *                                         (the B0 ratings.json is never touched)
 *
 * Output in bench/runs/<run>/:
 *   review.html      open in a browser, rate, press "Сохранить оценки"
 *   review-img/      frames under opaque ids (file names would reveal the model),
 *                    all normalised to 880×1100 JPEG q90 (resolution/sharpness would too)
 *   review-key.json  id → model (read by bench:report; don't open before rating)
 */
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fail, parseCommonArgs } from "./lib/cli";
import { B05, VARIANT_KEYS } from "./config";
import { buildReviewHtml, prepareReview, reviewFiles, type FrameRef } from "./lib/review-html";
import { normalizeFrame, REVIEW_SIZE } from "./lib/images";
import { listImages, rel, resolveRunId, runDir } from "./lib/paths";
import { loadSubjects } from "./lib/subjects";

const args = parseCommonArgs();
const runId = resolveRunId(args.run);
const RUN = runDir(runId);
if (args.set && args.set !== "b05") fail(`Unknown review set "${args.set}". Known: b05.`);
const SET = args.set;
const FILES = reviewFiles(SET);
// B0.5: only real-01/02 and only the anchors + variants.
const setModels: string[] | null = SET === "b05" ? [...B05.anchors, ...VARIANT_KEYS] : null;
if (args.dryRun) {
  console.log(`bench:review — local, no fal.ai calls, cost $0.00.\nWould write bench/runs/${runId}/${FILES.html}, ${FILES.imgDir}/ (frames normalised to 880×1100 JPEG q90) and ${FILES.key}.${setModels ? ` Set ${SET}: ${B05.subjects.join(", ")} × ${setModels.join(", ")}.` : ""}`);
  process.exit(0);
}
if (!existsSync(RUN)) fail(`No run folder bench/runs/${runId}.`);

const subjects = loadSubjects(SET === "b05" ? B05.subjects : args.subjects);
const frames: FrameRef[] = [];
for (const s of subjects) {
  const sdir = path.join(RUN, s.id);
  if (!existsSync(sdir)) continue;
  for (const model of readdirSync(sdir).filter((d) => statSync(path.join(sdir, d)).isDirectory() && (!setModels || setModels.includes(d)))) {
    for (const file of listImages(path.join(sdir, model))) {
      const m = path.basename(file).match(/^(.+)-(\d+)\.jpg$/);
      if (m) frames.push({ file: rel(RUN, file), subject: s.id, model, style: m[1]!, n: Number(m[2]) });
    }
  }
}
if (!frames.length) fail(`No frames in bench/runs/${runId}. Run bench:run first.`);

const { data, key } = prepareReview(
  runId,
  subjects.map((s) => ({ id: s.id, type: s.type, selfies: s.selfies.map((f) => rel(RUN, f)) })),
  frames,
  SET,
);

const imgDir = path.join(RUN, FILES.imgDir);
rmSync(imgDir, { recursive: true, force: true });
mkdirSync(imgDir, { recursive: true });
for (const [id, k] of Object.entries(key)) writeFileSync(path.join(imgDir, `${id}.jpg`), await normalizeFrame(path.join(RUN, k.file)));

writeFileSync(path.join(RUN, FILES.html), buildReviewHtml(data));
writeFileSync(path.join(RUN, FILES.key), JSON.stringify(key, null, 2));
if (setModels) {
  const per = setModels.map((m) => `${m} ${frames.filter((f) => f.model === m).length}`).join(", ");
  console.log(`Set ${SET}: ${per}${setModels.some((m) => !frames.some((f) => f.model === m)) ? "  ⚠ some variants have no frames yet" : ""}`);
}
console.log(`${FILES.html}: ${frames.length} frames from ${data.subjects.length} subjects, all at ${REVIEW_SIZE.width}×${REVIEW_SIZE.height} JPEG.`);
console.log(`Open bench/runs/${runId}/${FILES.html} in a browser, rate every frame, press "Сохранить оценки" and put ${FILES.ratings} into bench/runs/${runId}/.`);
console.log(`Then: npm run bench:report`);
