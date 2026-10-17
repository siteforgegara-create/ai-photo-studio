import { describe, expect, it } from "vitest";
import { assumedFace, faceCrop, formatSpecs, websiteLayout } from "./crop-math";

describe("face-centred crops", () => {
  const W = 1080;
  const H = 1350;
  const face = { x: 340, y: 340, width: 440, height: 440 };

  it("1:1 crop is square, centred on the face and inside the image", () => {
    const c = faceCrop(W, H, face, 1, formatSpecs.linkedin.faceShare!);
    expect(c.width).toBeCloseTo(c.height, 6);
    expect(c.x).toBeGreaterThanOrEqual(0);
    expect(c.y).toBeGreaterThanOrEqual(0);
    expect(c.x + c.width).toBeLessThanOrEqual(W + 1e-6);
    expect(c.y + c.height).toBeLessThanOrEqual(H + 1e-6);
    expect(Math.abs(c.x + c.width / 2 - (face.x + face.width / 2))).toBeLessThan(10); // may shift slightly when clamped
  });

  it("3:4 crop keeps the aspect and leaves headroom above the face", () => {
    const c = faceCrop(W, H, face, 3 / 4, formatSpecs.resume.faceShare!);
    expect(c.width / c.height).toBeCloseTo(0.75, 3);
    expect(face.y - c.y).toBeGreaterThan(0);
  });

  it("clamps when the face is near an edge", () => {
    const c = faceCrop(W, H, { x: 0, y: 0, width: 300, height: 300 }, 1, 0.4);
    expect(c.x).toBe(0);
    expect(c.y).toBe(0);
  });

  it("falls back to an assumed centred face", () => {
    const f = assumedFace(W, H);
    expect(f.x + f.width / 2).toBeCloseTo(W / 2, 6);
    const c = faceCrop(W, H, null, 1, 0.42);
    expect(c.width).toBeGreaterThan(0);
  });

  it("16:9 website layout places the full-height portrait on the right with space on the left", () => {
    const l = websiteLayout(W, H);
    expect(l.height).toBe(1080);
    expect(l.x).toBeGreaterThan(1920 * 0.45);
    expect(l.x + l.width).toBeLessThan(1920);
  });

  it("defines all five download formats", () => {
    expect(Object.keys(formatSpecs).sort()).toEqual(["avatar", "linkedin", "original", "resume", "website"]);
  });
});
