// @vitest-environment node
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { normalizeFrame, REVIEW_SIZE } from "./images";

const frame = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: { r: 120, g: 130, b: 140 } } }).png().toBuffer();

describe("normalizeFrame (blind review + auto-likeness)", () => {
  it("brings every model's output to 880×1100 JPEG, whatever its native size", async () => {
    for (const [w, h] of [
      [1728, 2160], // Seedream 4.5
      [880, 1100], // LoRA
      [896, 1120], // 1K-class 4:5
      [1024, 1024], // off-ratio: cover-cropped, not stretched
    ] as const) {
      const meta = await sharp(await normalizeFrame(await frame(w, h))).metadata();
      expect({ w: meta.width, h: meta.height, format: meta.format }).toEqual({ w: REVIEW_SIZE.width, h: REVIEW_SIZE.height, format: "jpeg" });
    }
  });

  it("is deterministic, so review-img and bench:score see the same pixels", async () => {
    const src = await frame(1728, 2160);
    expect((await normalizeFrame(src)).equals(await normalizeFrame(src))).toBe(true);
  });

  it("keeps no metadata", async () => {
    const src = await sharp(await frame(1000, 1250)).withMetadata({ exif: { IFD0: { Make: "LeakyCam" } } }).jpeg().toBuffer();
    const meta = await sharp(await normalizeFrame(src)).metadata();
    expect(meta.exif).toBeUndefined();
  });
});
