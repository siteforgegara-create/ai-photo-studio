/**
 * Builds the blind review page (docs/07 §5). Free, local.
 *
 *   npm run bench:review [-- --run=2026-10-20]
 *
 * Output in bench/runs/<run>/:
 *   review.html      open in a browser, rate, press "Сохранить оценки"
 *   review-img/      frames copied under opaque ids (file names would reveal the model)
 *   review-key.json  id → model (read by bench:report; don't open before rating)
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fail, parseCommonArgs } from "./lib/cli";
import { buildReviewHtml, prepareReview, REVIEW_IMG_DIR, type FrameRef } from "./lib/review-html";
import { listImages, rel, resolveRunId, runDir } from "./lib/paths";
import { loadSubjects } from "./lib/subjects";

const args = parseCommonArgs();
const runId = resolveRunId(args.run);
const RUN = runDir(runId);
if (args.dryRun) {
  console.log(`bench:review — local, no fal.ai calls, cost $0.00.\nWould write bench/runs/${runId}/review.html, review-img/ and review-key.json.`);
  process.exit(0);
}
if (!existsSync(RUN)) fail(`No run folder bench/runs/${runId}.`);

const subjects = loadSubjects(args.subjects);
const frames: FrameRef[] = [];
for (const s of subjects) {
  const sdir = path.join(RUN, s.id);
  if (!existsSync(sdir)) continue;
  for (const model of readdirSync(sdir).filter((d) => statSync(path.join(sdir, d)).isDirectory())) {
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
);

const imgDir = path.join(RUN, REVIEW_IMG_DIR);
rmSync(imgDir, { recursive: true, force: true });
mkdirSync(imgDir, { recursive: true });
for (const [id, k] of Object.entries(key)) copyFileSync(path.join(RUN, k.file), path.join(imgDir, `${id}.jpg`));

writeFileSync(path.join(RUN, "review.html"), buildReviewHtml(data));
writeFileSync(path.join(RUN, "review-key.json"), JSON.stringify(key, null, 2));
console.log(`review.html: ${frames.length} frames from ${data.subjects.length} subjects.`);
console.log(`Open bench/runs/${runId}/review.html in a browser, rate every frame, press "Сохранить оценки" and put ratings.json into bench/runs/${runId}/.`);
console.log(`Then: npm run bench:report`);
