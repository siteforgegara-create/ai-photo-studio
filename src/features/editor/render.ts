/**
 * Canvas pipeline for Crop & Export — works with HTMLCanvasElement (preview,
 * fallback export) and OffscreenCanvas (export in a Worker). Re-encoding through
 * a canvas drops all metadata, so exported files carry no EXIF/GPS.
 */
import { filterString, presetSize, rotatedSize, straightenScale, type EditorState } from "./engine";

export type AnyCanvas = HTMLCanvasElement | OffscreenCanvas;
type AnyCtx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
export type ExportFormat = "jpeg" | "png";

/** Longest side of an export (keeps memory sane on phones). */
export const MAX_EXPORT_SIDE = 4096;

/**
 * Draws the rotated / straightened / flipped / adjusted frame (no crop) into
 * the current transform at `frameW × frameH`.
 */
export function drawFrame(ctx: AnyCtx, src: CanvasImageSource, srcW: number, srcH: number, s: EditorState, frameW: number, frameH: number) {
  const scale = straightenScale(frameW, frameH, s.straighten);
  ctx.save();
  ctx.filter = filterString(s.adjust);
  ctx.translate(frameW / 2, frameH / 2);
  ctx.scale(s.flipH ? -1 : 1, s.flipV ? -1 : 1); // flips in screen space (after rotation)
  ctx.rotate(((s.rotate + s.straighten) * Math.PI) / 180);
  ctx.scale(scale, scale);
  // After a quarter turn the source keeps its own size; the frame is already swapped.
  const k = s.rotate === 90 || s.rotate === 270 ? Math.min(frameH / srcW, frameW / srcH) : Math.min(frameW / srcW, frameH / srcH);
  ctx.drawImage(src, (-srcW * k) / 2, (-srcH * k) / 2, srcW * k, srcH * k);
  ctx.restore();

  const w = s.adjust.warmth;
  if (w !== 0) {
    ctx.save();
    ctx.globalCompositeOperation = "soft-light";
    ctx.fillStyle = w > 0 ? `rgba(255, 140, 40, ${(w / 100) * 0.55})` : `rgba(60, 130, 255, ${(-w / 100) * 0.55})`;
    ctx.fillRect(0, 0, frameW, frameH);
    ctx.restore();
  }
}

/** Output size for an export: social preset size, else the crop in source pixels (capped). */
export function outputSize(srcW: number, srcH: number, s: EditorState) {
  const fixed = presetSize(s.preset);
  if (fixed) return fixed;
  const frame = rotatedSize(srcW, srcH, s.rotate);
  let width = Math.max(1, Math.round(s.crop.w * frame.width));
  let height = Math.max(1, Math.round(s.crop.h * frame.height));
  const k = Math.min(1, MAX_EXPORT_SIDE / Math.max(width, height));
  width = Math.round(width * k);
  height = Math.round(height * k);
  return { width, height };
}

/** Full export render: transform, crop, optional circle mask. */
export function renderExport(src: CanvasImageSource, srcW: number, srcH: number, s: EditorState, format: ExportFormat, makeCanvas: (w: number, h: number) => AnyCanvas): AnyCanvas {
  const frame = rotatedSize(srcW, srcH, s.rotate);
  const out = outputSize(srcW, srcH, s);
  const canvas = makeCanvas(out.width, out.height);
  const ctx = canvas.getContext("2d") as AnyCtx | null;
  if (!ctx) throw new Error("Canvas 2D is not available");

  if (s.preset === "circle") {
    if (format === "jpeg") {
      // JPEG has no transparency: outside the circle becomes white.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, out.width, out.height);
    }
    ctx.beginPath();
    ctx.arc(out.width / 2, out.height / 2, Math.min(out.width, out.height) / 2, 0, Math.PI * 2);
    ctx.clip();
  }

  const cropX = s.crop.x * frame.width;
  const cropY = s.crop.y * frame.height;
  const cropW = s.crop.w * frame.width;
  const cropH = s.crop.h * frame.height;
  ctx.save();
  ctx.scale(out.width / cropW, out.height / cropH);
  ctx.translate(-cropX, -cropY);
  drawFrame(ctx, src, srcW, srcH, s, frame.width, frame.height);
  ctx.restore();
  return canvas;
}

export const mimeOf = (f: ExportFormat) => (f === "png" ? "image/png" : "image/jpeg");
