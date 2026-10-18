import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Project root and bench folders. Subjects and runs are git-ignored (docs/07 §1). */
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const BENCH = path.join(ROOT, "bench");
export const SUBJECTS_DIR = path.join(BENCH, "subjects");
export const RUNS_DIR = path.join(BENCH, "runs");
export const SPEND_FILE = path.join(RUNS_DIR, "spend.json");
export const ENV_FILE = path.join(ROOT, ".env.local");

export const IMAGE_EXT = /\.(jpe?g|png|webp|heic|heif)$/i;

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Existing run folders (YYYY-MM-DD…), oldest first. */
export function listRuns(): string[] {
  if (!existsSync(RUNS_DIR)) return [];
  return readdirSync(RUNS_DIR)
    .filter((d) => /^\d{4}-\d{2}-\d{2}/.test(d) && statSync(path.join(RUNS_DIR, d)).isDirectory())
    .sort();
}

/**
 * Run folder: `--run=<id>` if given, otherwise the latest existing run (so a
 * re-run tomorrow continues the same cache), otherwise today's date.
 */
export function resolveRunId(arg?: string): string {
  if (arg) return arg;
  return listRuns().at(-1) ?? today();
}

export function runDir(runId: string): string {
  return path.join(RUNS_DIR, runId);
}

export function framePath(runId: string, subject: string, model: string, style: string, n: number): string {
  return path.join(runDir(runId), subject, model, `${style}-${n}.jpg`);
}

export function listImages(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => IMAGE_EXT.test(f))
    .sort()
    .map((f) => path.join(dir, f));
}

/** Path relative to a base, with forward slashes (for HTML and logs). */
export function rel(from: string, to: string): string {
  return path.relative(from, to).split(path.sep).join("/");
}
