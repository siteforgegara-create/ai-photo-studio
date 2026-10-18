// @vitest-environment node
import { describe, expect, it } from "vitest";
import { MODELS } from "../config";
import { allStats, eligibleForShoot, joinRows, MIN_SELLABLE, rankForShoot, recommendThreshold, safeThreshold, thresholdTable, type Row } from "./report-calc";
import { buildReviewHtml, frameId, prepareReview, reviewFiles, shuffle, type FrameRef } from "./review-html";
import type { FrameScore } from "./types";

const models = ["nb21", "nbpro", "seedream", "flux3", "lora", "nb21-strict"];
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

describe("B0.5 review set", () => {
  const b05Frames = frames.filter((f) => f.subject === "real-01" && (f.model === "nb21" || f.model === "nb21-strict" || f.model === "flux3"));
  const { data, key } = prepareReview("2026-10-20", [{ id: "real-01", type: "real", selfies: [] }], b05Frames, "b05");
  const { key: mainKey } = prepareReview("2026-10-20", [{ id: "real-01", type: "real", selfies: [] }], b05Frames);

  it("gets new ids, its own image folder, storage key and ratings file", () => {
    expect(Object.keys(key).some((id) => id in mainKey)).toBe(false);
    expect(reviewFiles("b05")).toEqual({ html: "review-b05.html", imgDir: "review-img-b05", key: "review-key-b05.json", ratings: "ratings-b05.json" });
    const html = buildReviewHtml(data);
    expect(html).toContain("review-img-b05/");
    expect(html).toContain('a.download = "ratings-b05.json"');
    expect(html).toContain('"set":"b05"');
    expect(html).toContain("B0.5 · слепая оценка");
    for (const m of ["nb21-strict", "strict", "flux3", "nb21"]) expect(html).not.toContain(m);
  });

  it("the main review keeps ratings.json", () => {
    const html = buildReviewHtml(prepareReview("2026-10-20", [{ id: "real-01", type: "real", selfies: [] }], b05Frames).data);
    expect(html).toContain('a.download = "ratings.json"');
  });
});

describe("recommendation rules", () => {
  const r = (model: string, sim: number, q: number, sellable: boolean, similarity = 0.9): Row => ({ file: `${model}-${Math.random()}`, subject: "real-01", subjectType: "real", model, style: "s", n: 1, faces: 1, defect: null, similarity, usd: 0.1, ms: 1000, rating: { similarity: sim, quality: q, sellable } });

  it("a model with fewer than 3 sellable frames is not recommended", () => {
    const rows = [r("a", 4, 4, true), r("a", 4, 4, true), r("b", 3, 3, true), r("b", 3, 3, true), r("b", 3, 3, true), r("b", 2, 2, false)];
    const stats = allStats(rows);
    expect(stats.map((s) => [s.model, s.sellableCount])).toEqual([["a", 2], ["b", 3]]);
    expect(eligibleForShoot(stats).map((s) => s.model)).toEqual(["b"]); // a has 100% sellable but only 2 frames
    expect(eligibleForShoot(allStats(rows.slice(0, 2)))).toEqual([]);
    expect(MIN_SELLABLE).toBe(3);
  });

  it("threshold against obvious rejects keeps ≥ 95% of frames rated ≥ 4", () => {
    const good = Array.from({ length: 20 }, (_, i) => r("a", 4, 4, true, 0.8 + i * 0.01)); // 0.80 … 0.99
    const bad = [r("a", 1, 3, false, 0.5), r("a", 2, 3, false, 0.79)];
    const t = safeThreshold([...good, ...bad])!;
    expect(t.threshold).toBe(0.81); // drops at most 1 of 20 good frames (the 0.80 one)
    expect(t.goodKept).toBe(0.95);
    expect(t.badRemoved).toBe(1);
    expect(safeThreshold(good.slice(0, 4))).toBeNull(); // < 5 good frames → not enough data
  });
});
