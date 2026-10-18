import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PLANNED_REAL_SUBJECTS, PLANNED_SYNTH_SUBJECTS } from "../config";
import { PERSONA_SPECS } from "../prompts";
import { listImages, SUBJECTS_DIR } from "./paths";

/**
 * bench/subjects/
 *   real-01/selfies/*.jpg        owner's photos (git-ignored)
 *   synth-01/reference.jpg + selfies/*.jpg   created by bench:personas
 *   subjects.json                id, type, gender, age group, skin tone
 */
export type SubjectMeta = {
  id: string;
  type: "real" | "synth";
  gender?: string;
  ageGroup?: string;
  skinTone?: string;
};

export type Subject = SubjectMeta & {
  dir: string;
  selfies: string[];
  /** synth only: the generated portrait similarity is measured against. */
  reference?: string;
  /** Not real files: dry-run placeholders when bench/subjects/ is empty. */
  planned?: boolean;
};

export const SUBJECTS_JSON = path.join(SUBJECTS_DIR, "subjects.json");

export function readSubjectsMeta(): SubjectMeta[] {
  if (!existsSync(SUBJECTS_JSON)) return [];
  return JSON.parse(readFileSync(SUBJECTS_JSON, "utf8")) as SubjectMeta[];
}

export function writeSubjectsMeta(list: SubjectMeta[]) {
  mkdirSync(SUBJECTS_DIR, { recursive: true });
  const sorted = [...list].sort((a, b) => a.id.localeCompare(b.id));
  writeFileSync(SUBJECTS_JSON, JSON.stringify(sorted, null, 2) + "\n");
}

export function upsertSubjectMeta(meta: SubjectMeta) {
  const list = readSubjectsMeta().filter((m) => m.id !== meta.id);
  writeSubjectsMeta([...list, meta]);
}

/** Subjects present on disk (folders real-*, synth-*), merged with subjects.json. */
export function loadSubjects(filter?: string[]): Subject[] {
  if (!existsSync(SUBJECTS_DIR)) return [];
  const meta = new Map(readSubjectsMeta().map((m) => [m.id, m]));
  const subjects = readdirSync(SUBJECTS_DIR)
    .filter((d) => /^(real|synth)-/.test(d) && statSync(path.join(SUBJECTS_DIR, d)).isDirectory())
    .sort()
    .map((id): Subject => {
      const dir = path.join(SUBJECTS_DIR, id);
      const type = id.startsWith("real-") ? "real" : "synth";
      const reference = ["reference.jpg", "reference.png", "reference.webp"].map((f) => path.join(dir, f)).find((f) => existsSync(f));
      return { id, type, ...meta.get(id), dir, selfies: listImages(path.join(dir, "selfies")), reference };
    })
    .filter((s) => s.selfies.length > 0);
  return filter ? subjects.filter((s) => filter.includes(s.id)) : subjects;
}

/** Problems that block a real run (4–8 selfies per person, docs/07 §2). */
export function validateSubject(s: Subject): string[] {
  const issues: string[] = [];
  if (s.selfies.length < 4) issues.push(`${s.id}: ${s.selfies.length} selfies — need 4 to 8`);
  if (s.selfies.length > 8) issues.push(`${s.id}: ${s.selfies.length} selfies — only the first 8 are used`);
  if (s.type === "synth" && !s.reference) issues.push(`${s.id}: reference.jpg missing (run bench:personas)`);
  return issues;
}

/**
 * Dry-run before any photos exist: show the budget for the planned set
 * (3 real people + 5 personas, 6 selfies each).
 */
export function plannedSubjects(): Subject[] {
  const real = Array.from({ length: PLANNED_REAL_SUBJECTS }, (_, i) => `real-${String(i + 1).padStart(2, "0")}`);
  const synth = PERSONA_SPECS.slice(0, PLANNED_SYNTH_SUBJECTS).map((p) => p.id);
  return [...real, ...synth].map((id) => ({
    id,
    type: id.startsWith("real") ? "real" : "synth",
    dir: path.join(SUBJECTS_DIR, id),
    selfies: Array.from({ length: 6 }, (_, i) => `planned-${i + 1}.jpg`),
    planned: true,
  }));
}

/** Subjects for a command: on disk, or the planned set for a dry-run when nothing is there yet. */
export function subjectsForPlan(filter: string[] | undefined, dryRun: boolean): Subject[] {
  const onDisk = loadSubjects(filter);
  if (onDisk.length || !dryRun) return onDisk;
  const planned = plannedSubjects();
  return filter ? planned.filter((s) => filter.includes(s.id)) : planned;
}
