import { describe, expect, it } from "vitest";
import { dHash, expandRect, hammingDistance, laplacianVariance, meanBrightness, resizeGray, toGray, type GrayImage } from "./image-math";
import { evaluateSelfie, findDuplicate, summarizeSet } from "./evaluate";

/** Synthetic images — no photos needed. */
const make = (w: number, h: number, f: (x: number, y: number) => number): GrayImage => {
  const data = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) data[y * w + x] = f(x, y);
  return { data, width: w, height: h };
};
const checker = (w: number, h: number, cell = 4) => make(w, h, (x, y) => ((Math.floor(x / cell) + Math.floor(y / cell)) % 2 ? 230 : 25));
const boxBlur = (g: GrayImage, r: number): GrayImage =>
  make(g.width, g.height, (x, y) => {
    let s = 0;
    let c = 0;
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        const xx = Math.min(g.width - 1, Math.max(0, x + dx));
        const yy = Math.min(g.height - 1, Math.max(0, y + dy));
        s += g.data[yy * g.width + xx]!;
        c++;
      }
    return s / c;
  });

describe("image metrics", () => {
  it("toGray uses BT.601 luma", () => {
    const g = toGray({ width: 2, height: 1, data: [255, 255, 255, 255, 255, 0, 0, 255] });
    expect(g.data[0]).toBeCloseTo(255, 3);
    expect(g.data[1]).toBeCloseTo(76.245, 2);
  });

  it("brightness separates dark and bright frames", () => {
    expect(meanBrightness(make(16, 16, () => 30))).toBe(30);
    expect(meanBrightness(make(16, 16, () => 240))).toBe(240);
  });

  it("Laplacian variance: sharp ≫ blurred, flat ≈ 0", () => {
    const sharp = checker(64, 64);
    const blurred = boxBlur(sharp, 3);
    expect(laplacianVariance(make(64, 64, () => 128))).toBeCloseTo(0, 6);
    expect(laplacianVariance(sharp)).toBeGreaterThan(laplacianVariance(blurred) * 10);
  });

  it("resizeGray preserves the mean", () => {
    const g = checker(64, 48);
    expect(meanBrightness(resizeGray(g, 16, 12))).toBeCloseTo(meanBrightness(g), 0);
  });

  it("dHash: identical → 0, slight change → small, different → large", () => {
    const a = make(90, 80, (x, y) => (x * 3 + y * 2) % 255);
    const b = make(90, 80, (x, y) => ((x * 3 + y * 2) % 255) + 4); // brightness shift
    const c = make(90, 80, (x) => 255 - ((x * 7) % 255));
    expect(dHash(a)).toHaveLength(16);
    expect(hammingDistance(dHash(a), dHash(a))).toBe(0);
    expect(hammingDistance(dHash(a), dHash(b))).toBeLessThanOrEqual(6);
    expect(hammingDistance(dHash(a), dHash(c))).toBeGreaterThan(12);
  });

  it("expandRect grows the box and clamps it to the image", () => {
    const r = expandRect({ x: 0, y: 0, width: 100, height: 100 }, 150, 150, 1.4);
    expect(r).toEqual({ x: 0, y: 0, width: 140, height: 140 });
  });
});

describe("evaluateSelfie (P1)", () => {
  const good = { faces: 1, faceRatio: 0.2, sharpness: 200, brightness: 140 };

  it("one sharp, well-lit, large face → ✓", () => {
    expect(evaluateSelfie(good)).toMatchObject({ verdict: "ok", reasons: [] });
  });
  it("no face → ✕ No face found", () => {
    expect(evaluateSelfie({ ...good, faces: 0 })).toMatchObject({ verdict: "reject", reasons: ["No face found"] });
  });
  it("two faces → ✕ More than one person", () => {
    expect(evaluateSelfie({ ...good, faces: 2 })).toMatchObject({ verdict: "reject", reasons: ["More than one person"] });
  });
  it.each([
    [{ faceRatio: 0.02 }, "Face is small — crop closer"],
    [{ sharpness: 5 }, "Slightly blurry"],
    [{ brightness: 30 }, "Too dark"],
    [{ brightness: 250 }, "Too bright — avoid direct sunlight or flash"],
    [{ duplicateOf: "a" }, "Very similar to another photo"],
  ])("%o → ⚠ %s", (patch, reason) => {
    const r = evaluateSelfie({ ...good, ...patch });
    expect(r.verdict).toBe("warn");
    expect(r.reasons).toContain(reason);
  });

  it("summarizeSet counts ✓ and ⚠, not ✕", () => {
    expect(summarizeSet(["ok", "warn", "reject"])).toEqual({ usable: 2, required: 4, missing: 2, quality: "needs-more" });
    expect(summarizeSet(["ok", "ok", "warn", "ok"])).toMatchObject({ usable: 4, missing: 0, quality: "good" });
  });

  it("findDuplicate uses the Hamming threshold", () => {
    expect(findDuplicate("ffffffffffffffff", [{ localId: "x", hash: "fffffffffffffff0" }])).toBe("x");
    expect(findDuplicate("ffffffffffffffff", [{ localId: "x", hash: "0000000000000000" }])).toBeUndefined();
  });
});
