import { describe, expect, it } from "vitest";
import {
  centeredCrop,
  commit,
  createHistory,
  filterString,
  initialEditorState,
  moveCrop,
  presetAspect,
  presetSize,
  redo,
  resizeCrop,
  rotatedSize,
  straightenScale,
  undo,
} from "./engine";
import { outputSize } from "./render";

describe("editor engine", () => {
  it("preset aspects", () => {
    expect(presetAspect("free")).toBeNull();
    expect(presetAspect("1:1")).toBe(1);
    expect(presetAspect("circle")).toBe(1);
    expect(presetAspect("3:4")).toBeCloseTo(0.75);
    expect(presetAspect("size:1584x396")).toBe(4);
    expect(presetSize("size:400x400")).toEqual({ width: 400, height: 400 });
  });

  it("quarter turns swap the frame", () => {
    expect(rotatedSize(1080, 1350, 90)).toEqual({ width: 1350, height: 1080 });
    expect(rotatedSize(1080, 1350, 180)).toEqual({ width: 1080, height: 1350 });
  });

  it("straighten scale is 1 at 0° and grows with the angle", () => {
    expect(straightenScale(1000, 800, 0)).toBe(1);
    expect(straightenScale(1000, 800, 10)).toBeGreaterThan(1);
    expect(straightenScale(1000, 800, -10)).toBeCloseTo(straightenScale(1000, 800, 10));
  });

  it("centred crop keeps the aspect in pixels", () => {
    const c = centeredCrop(1080, 1350, 1);
    expect((c.w * 1080) / (c.h * 1350)).toBeCloseTo(1, 6);
    expect(c.x).toBe(0);
    const wide = centeredCrop(1080, 1350, 16 / 9);
    expect((wide.w * 1080) / (wide.h * 1350)).toBeCloseTo(16 / 9, 6);
  });

  it("moving keeps the crop inside the frame", () => {
    expect(moveCrop({ x: 0.5, y: 0.5, w: 0.4, h: 0.4 }, 1, 1)).toEqual({ x: 0.6, y: 0.6, w: 0.4, h: 0.4 });
  });

  it("resizing with an aspect keeps it and anchors the opposite corner", () => {
    const start = centeredCrop(1000, 1000, 1);
    const r = resizeCrop(start, "se", -0.2, 0, 1, 1000, 1000);
    expect(r.w).toBeCloseTo(0.8);
    expect(r.h).toBeCloseTo(0.8);
    expect(r.x).toBe(0);
    expect(r.y).toBe(0);
  });

  it("filters map −100…100 to 0…2", () => {
    expect(filterString({ brightness: 0, contrast: 100, saturation: -100, warmth: 0 })).toBe("brightness(1.000) contrast(2.000) saturate(0.000)");
  });

  it("undo / redo", () => {
    let h = createHistory();
    h = commit(h, { ...initialEditorState, rotate: 90 });
    h = commit(h, { ...initialEditorState, rotate: 180 });
    expect(h.present.rotate).toBe(180);
    h = undo(h);
    expect(h.present.rotate).toBe(90);
    h = redo(h);
    expect(h.present.rotate).toBe(180);
    h = commit(undo(h), { ...initialEditorState, flipH: true });
    expect(h.future).toHaveLength(0);
  });

  it("identical commits don't add history", () => {
    const h = createHistory();
    expect(commit(h, { ...initialEditorState })).toBe(h);
  });

  it("output size follows the crop, social presets are exact, cap at 4096", () => {
    expect(outputSize(1080, 1350, { ...initialEditorState, crop: { x: 0, y: 0, w: 0.5, h: 0.5 } })).toEqual({ width: 540, height: 675 });
    expect(outputSize(1080, 1350, { ...initialEditorState, preset: "size:1584x396" })).toEqual({ width: 1584, height: 396 });
    expect(Math.max(...Object.values(outputSize(8000, 6000, initialEditorState)))).toBe(4096);
  });
});
