// @vitest-environment node
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { MODELS } from "../config";
import { generationPrompt } from "../prompts";
import { voteAttributes } from "./attributes";
import type { CallLog } from "./log";
import { PLANNED_SELFIE_SIZE } from "./models";
import { framePath, runDir, SUBJECTS_DIR } from "./paths";
import { ablationSubjectIds, buildRunPlan, promptHash } from "./run-plan";
import type { Subject } from "./subjects";

const RUN_ID = `vitest-runplan-${process.pid}`;
afterAll(() => rmSync(runDir(RUN_ID), { recursive: true, force: true }));

const subj = (id: string): Subject => ({ id, type: id.startsWith("real") ? "real" : "synth", dir: path.join(SUBJECTS_DIR, id), selfies: Array.from({ length: 6 }, (_, i) => `s${i}.jpg`) });
const subjects = ["synth-01", "synth-02", "synth-03", "synth-05"].map(subj);
const sizes = new Map(subjects.map((s) => [s.id, Array.from({ length: 6 }, () => PLANNED_SELFIE_SIZE)]));
const attrs = new Map(subjects.map((s) => [s.id, voteAttributes(s.id, Array.from({ length: 3 }, () => ({ eyeColor: "green", skinTone: "fair" })))]));

describe("ablation subjects", () => {
  it("uses config order and replaces missing real ids with synth-03 / synth-05", () => {
    const avail = new Set(subjects.map((s) => s.id));
    expect(ablationSubjectIds(avail, 4)).toEqual(["synth-01", "synth-02", "synth-03", "synth-05"]);
    expect(ablationSubjectIds(avail, 2)).toEqual(["synth-01", "synth-02"]);
    expect(ablationSubjectIds(new Set([...avail, "real-01", "real-02"]), 4)).toEqual(["synth-01", "synth-02", "real-01", "real-02"]);
  });
});

describe("buildRunPlan", () => {
  const base = { runId: RUN_ID, subjects, models: [MODELS.nb21, MODELS.flux3], selfieSizes: sizes, attrs, noAttrs: false, ablationSubjects: subjects, log: [] as CallLog[] };

  it("every main prompt carries the attribute line; the ablation group does not; 16 ablation frames for 4 subjects", () => {
    const p = buildRunPlan(base);
    expect(p.frames).toHaveLength(4 * 2 * 4);
    expect(p.frames.every((f) => f.prompt?.endsWith("Subject details (preserve exactly): green eyes, fair skin. Preserve apparent age exactly."))).toBe(true);
    expect(p.ablation).toHaveLength(16);
    expect(p.ablation.every((f) => f.dir === "nb21-noattr" && f.prompt === generationPrompt(f.style))).toBe(true);
  });

  it("--no-attrs: no line and no ablation", () => {
    const p = buildRunPlan({ ...base, noAttrs: true });
    expect(p.ablation).toEqual([]);
    expect(p.frames.every((f) => !f.prompt!.includes("Subject details"))).toBe(true);
  });

  it("a file on disk is cached only with a matching request fingerprint; smoke frames are adopted into the ablation", () => {
    const smokeNb21 = framePath(RUN_ID, "synth-01", "nb21", "corporate-gray", 1);
    const smokeFlux = framePath(RUN_ID, "synth-01", "flux3", "corporate-gray", 1);
    for (const f of [smokeNb21, smokeFlux]) {
      mkdirSync(path.dirname(f), { recursive: true });
      writeFileSync(f, "jpg");
    }
    const log: CallLog[] = [
      { at: "t", key: "synth-01/nb21/corporate-gray-1", kind: "frame", endpoint: MODELS.nb21.endpoint, usd: 0.0616, status: "ok", ms: 9000 },
      { at: "t", key: "synth-01/flux3/corporate-gray-1", kind: "frame", endpoint: MODELS.flux3.endpoint, usd: 0.048, status: "ok" },
    ];
    const p = buildRunPlan({ ...base, log });
    const main = p.frames.find((f) => f.key === "synth-01/nb21/corporate-gray-1")!;
    expect(main.cached).toBe(false); // old prompt without the attribute line → regenerated
    expect(p.frames.find((f) => f.key === "synth-01/flux3/corporate-gray-1")!.cached).toBe(false);
    const abl = p.ablation.find((f) => f.key === "synth-01/nb21-noattr/corporate-gray-1")!;
    expect(abl.cached).toBe(true);
    expect(abl.adopt?.file).toBe(smokeNb21);
    expect(abl.promptHash).toBe(promptHash(MODELS.nb21.endpoint, generationPrompt("corporate-gray"), abl.seed));

    // After a new call with the attribute line the main frame is cached.
    const p2 = buildRunPlan({ ...base, log: [...log, { ...log[0]!, promptHash: main.promptHash! }] });
    expect(p2.frames.find((f) => f.key === main.key)!.cached).toBe(true);
  });

  it("frames of subjects without analyzed attributes cannot be cached (prompt unknown)", () => {
    const p = buildRunPlan({ ...base, attrs: new Map() });
    expect(p.frames.every((f) => f.prompt === null && !f.cached)).toBe(true);
  });
});
