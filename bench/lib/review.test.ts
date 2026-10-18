// @vitest-environment node
import { describe, expect, it } from "vitest";
import { MODELS } from "../config";
import { allStats, joinRows, rankForShoot, recommendThreshold, thresholdTable } from "./report-calc";
import { buildReviewHtml, frameId, prepareReview, shuffle, type FrameRef } from "./review-html";
import type { FrameScore } from "./types";

const models = ["nb21", "nbpro", "seedream", "flux3", "lora"];
const frames: FrameRef[] = ["real-01", "synth-01"].flatMap((subject) =>
  models.flatMap((model) =>
    ["corporate-gray", "modern-office"].flatMap((style) => [1, 2].map((n) => ({ file: `${subject}/${model}/${style}-${n}.jpg`, subject, model, style, n }))),
  ),
);
const subjects = [
  { id: "real-01", type: "real" as const, selfies: ["../../subjects/real-01/selfies/a.jpg"] },
  { id: "synth-01", type: "synth" as const, selfies: ["../../subjects/synth-01/selfies/a.jpg"] },
];

describe("review.html (blind)", () => {
  const { data, key } = prepareReview("2026-10-20", subjects, frames);
  const html = buildReviewHtml(data);

  it("lists every frame once, with an opaque id", () => {
    expect(Object.keys(key)).toHaveLength(frames.length);
    for (const id of Object.keys(key)) {
      expect(id).toMatch(/^f[0-9a-f]{10}$/);
      expect(html.match(new RegExp(`data-id="${id}"`, "g"))).toHaveLength(1);
    }
  });

  it("never reveals the model: no model key, label or original path in the page", () => {
    for (const m of models) expect(html).not.toMatch(new RegExp(`[/"'\\s]${m}[/"'\\s-]`));
    for (const m of Object.values(MODELS)) expect(html).not.toContain(m.label);
    expect(html).not.toContain("corporate-gray-1.jpg");
    expect(html).toContain("review-img/");
  });

  it("the key maps ids back to model and file", () => {
    const id = frameId("2026-10-20", "real-01/nb21/corporate-gray-1.jpg");
    expect(key[id]).toEqual({ file: "real-01/nb21/corporate-gray-1.jpg", subject: "real-01", model: "nb21", style: "corporate-gray", n: 1 });
  });

  it("shuffles deterministically, and models are mixed", () => {
    expect(shuffle([1, 2, 3, 4, 5, 6], "x")).toEqual(shuffle([1, 2, 3, 4, 5, 6], "x"));
    const order = data.subjects[0]!.frames.slice(0, 4).map((f) => key[f.id]!.model);
    expect(new Set(order).size).toBeGreaterThan(1);
  });

  it("has the rating controls and the save button", () => {
    expect(html).toContain('id="save"');
    expect(html.match(/data-k="similarity"/g)).toHaveLength(frames.length * 5);
    expect(html.match(/data-k="quality"/g)).toHaveLength(frames.length * 5);
    expect(html).toContain("Годный для продажи");
    expect(html).not.toMatch(/<script[^>]+src=/); // self-contained, works offline
  });
});

describe("report maths", () => {
  const scores: FrameScore[] = [
    { file: "a", subject: "real-01", subjectType: "real", model: "nb21", style: "s", n: 1, faces: 1, defect: null, similarity: 0.8, usd: 0.08, ms: 5000 },
    { file: "b", subject: "real-01", subjectType: "real", model: "nb21", style: "s", n: 2, faces: 1, defect: null, similarity: 0.75, usd: 0.08, ms: 7000 },
    { file: "c", subject: "real-01", subjectType: "real", model: "seedream", style: "s", n: 1, faces: 1, defect: null, similarity: 0.4, usd: 0.04 },
    { file: "d", subject: "real-01", subjectType: "real", model: "seedream", style: "s", n: 2, faces: 0, defect: "no-face", similarity: null, usd: 0.04 },
  ];
  const key = { i1: { file: "a", subject: "", model: "", style: "", n: 1 }, i2: { file: "b", subject: "", model: "", style: "", n: 1 }, i3: { file: "c", subject: "", model: "", style: "", n: 1 } };
  const ratings = { run: "r", savedAt: "", ratings: { i1: { similarity: 5, quality: 4, sellable: true }, i2: { similarity: 4, quality: 3, sellable: false }, i3: { similarity: 2, quality: 4, sellable: false } } };
  const rows = joinRows(scores, ratings, key, new Map());

  it("per-model stats and cost per sellable frame", () => {
    const [nb21, seedream] = allStats(rows);
    expect(nb21).toMatchObject({ model: "nb21", frames: 2, rated: 2, sellableShare: 0.5, costPerFrame: 0.08, costPerSellable: 0.16, avgSeconds: 6 });
    expect(seedream).toMatchObject({ model: "seedream", defectRate: 0.5, sellableShare: 0, costPerSellable: null });
    expect(rankForShoot([seedream!, nb21!])[0]!.model).toBe("nb21");
  });

  it("threshold removes frames humans rated ≤ 2", () => {
    const t = recommendThreshold(rows)!;
    expect(t.threshold).toBeGreaterThan(0.4);
    expect(t.badRemoved).toBe(1);
    expect(t.goodKept).toBe(1);
    expect(thresholdTable(rows, [0.9])[0]).toMatchObject({ badRemoved: 1, goodKept: 0 });
  });
});
