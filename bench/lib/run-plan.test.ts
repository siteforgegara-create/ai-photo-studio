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
    expect(p.frames.every((f) => f.prompt?.endsWith("Subject details (preserve exactly): green eyes. Keep the exact skin tone and hair color from the photos. Preserve apparent age exactly."))).toBe(true);
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

describe("finalAttributes — the prompt line is built from attributes.json at run time", () => {
  it("re-votes the stored readings with the current rules and applies the all-selfies colors", async () => {
    const { finalAttributes } = await import("./plans");
    const { attributesLine } = await import("./attributes");
    const file = {
      ...voteAttributes("synth-01", []), // stale stored vote: nothing kept
      endpoint: "e",
      model: "m",
      analyzedAt: "t",
      readings: [1, 2, 3].map((i) => ({ file: `s${i}.jpg`, sha1: String(i), reading: { eyeColor: "hazel", hairColor: "red", skinTone: "fair", freckles: "yes" } })),
      colors: { hairColor: "auburn", eyeColor: "green", selfies: [], at: "t" },
    };
    expect(attributesLine(finalAttributes(file))).toBe("Subject details (preserve exactly): green eyes, auburn hair, freckles. Keep the exact skin tone and hair color from the photos. Preserve apparent age exactly.");
  });
});

describe("B0.5 variants", () => {
  const reals = ["real-01", "real-02"].map(subj);
  const rsizes = new Map(reals.map((s) => [s.id, Array.from({ length: 6 }, () => PLANNED_SELFIE_SIZE)]));
  const rattrs = new Map(reals.map((s) => [s.id, voteAttributes(s.id, Array.from({ length: 3 }, () => ({ eyeColor: "brown" })))]));
  const base = { runId: RUN_ID, subjects: reals, models: [], selfieSizes: rsizes, attrs: rattrs, noAttrs: false, ablationSubjects: [], log: [] as CallLog[], variantSubjects: reals };

  it("8 frames per variant; strict / premium = usual prompt + attribute line + suffix", () => {
    const p = buildRunPlan({ ...base, variants: ["nb21-strict", "flux3-premium"] });
    expect(p.frames).toEqual([]);
    expect(p.variants.filter((f) => f.dir === "nb21-strict")).toHaveLength(8);
    expect(p.variants.filter((f) => f.dir === "flux3-premium")).toHaveLength(8);
    const strict = p.variants.find((f) => f.dir === "nb21-strict")!;
    expect(strict.prompt).toContain("Subject details (preserve exactly): brown eyes.");
    expect(strict.prompt!.endsWith("Keep the natural neutral expression unless the style says otherwise.")).toBe(true);
    expect(strict.model).toBe(MODELS.nb21);
    expect(strict.costUsd).toBe(0.0616);
    const premium = p.variants.find((f) => f.dir === "flux3-premium")!;
    expect(premium.prompt!.endsWith("shallow depth of field, shot on 85mm.")).toBe(true);
    expect(premium.costUsd).toBe(0.096);
  });

  it("flux3-nbfix edits the existing flux3 frame — blocked when it is missing, never generated", () => {
    const p = buildRunPlan({ ...base, variants: ["flux3-nbfix"] });
    expect(p.variants).toEqual([]);
    expect(p.blocked).toHaveLength(8);
    const f = framePath(RUN_ID, "real-01", "flux3", "corporate-gray", 1);
    mkdirSync(path.dirname(f), { recursive: true });
    writeFileSync(f, "jpg");
    const p2 = buildRunPlan({ ...base, variants: ["flux3-nbfix"] });
    expect(p2.variants).toHaveLength(1);
    expect(p2.blocked).toHaveLength(7);
    expect(p2.variants[0]).toMatchObject({ dir: "flux3-nbfix", inputFile: f, costUsd: 0.0636 }); // 7 inputs (frame + 6 selfies) × $0.002 + $0.0396 + $0.01
    expect(p2.variants[0]!.prompt).toMatch(/^Improve only lighting/);
  });

  it("margins follow the base model", async () => {
    const { marginForKey } = await import("./margins");
    expect(marginForKey("real-01/nb21-strict/corporate-gray-1")).toBe(1.0);
    expect(marginForKey("real-01/flux3-premium/corporate-gray-1")).toBe(1.0);
    expect(marginForKey("real-01/flux3-nbfix/corporate-gray-1")).toBe(1.0);
  });
});
