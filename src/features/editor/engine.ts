/**
 * Crop & Export engine — pure state + geometry (docs/02-studio.md §3.1).
 * Shared by Studio (Crop & Export) and /tools/photo-editor. No DOM here.
 */

export type CropPresetId = "free" | "1:1" | "4:5" | "3:4" | "16:9" | "9:16" | "circle" | `size:${number}x${number}`;

export type Adjustments = { brightness: number; contrast: number; saturation: number; warmth: number };

/** Crop rect in normalised coordinates (0–1) of the rotated + straightened frame. */
export type NormRect = { x: number; y: number; w: number; h: number };

export type EditorState = {
  preset: CropPresetId;
  crop: NormRect;
  /** Quarter turns, clockwise. */
  rotate: 0 | 90 | 180 | 270;
  /** Fine straighten, degrees −45…45. */
  straighten: number;
  flipH: boolean;
  flipV: boolean;
  adjust: Adjustments;
};

export const zeroAdjust: Adjustments = { brightness: 0, contrast: 0, saturation: 0, warmth: 0 };

export const initialEditorState: EditorState = {
  preset: "free",
  crop: { x: 0, y: 0, w: 1, h: 1 },
  rotate: 0,
  straighten: 0,
  flipH: false,
  flipV: false,
  adjust: zeroAdjust,
};

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Aspect ratio (w/h) of a preset, or null for free. */
export function presetAspect(preset: CropPresetId): number | null {
  if (preset === "free") return null;
  if (preset === "circle" || preset === "1:1") return 1;
  if (preset.startsWith("size:")) {
    const [w, h] = preset.slice(5).split("x").map(Number);
    return w && h ? w / h : null;
  }
  const [a, b] = preset.split(":").map(Number);
  return a && b ? a / b : null;
}

/** Fixed output size for social presets (`size:1584x396`), else null. */
export function presetSize(preset: CropPresetId): { width: number; height: number } | null {
  if (!preset.startsWith("size:")) return null;
  const [width, height] = preset.slice(5).split("x").map(Number);
  return width && height ? { width, height } : null;
}

/** Image size after the quarter-turn rotation. */
export function rotatedSize(w: number, h: number, rotate: EditorState["rotate"]) {
  return rotate === 90 || rotate === 270 ? { width: h, height: w } : { width: w, height: h };
}

/**
 * Scale needed so a frame rotated by `deg` still covers the whole W×H frame
 * (no empty corners after straightening).
 */
export function straightenScale(w: number, h: number, deg: number): number {
  const t = (Math.abs(deg) * Math.PI) / 180;
  const c = Math.cos(t);
  const s = Math.sin(t);
  return Math.max((w * c + h * s) / w, (w * s + h * c) / h);
}

/**
 * Largest centred crop with the given aspect inside a frame (in px aspect).
 * Returns normalised coordinates.
 */
export function centeredCrop(frameW: number, frameH: number, aspect: number | null): NormRect {
  if (!aspect) return { x: 0, y: 0, w: 1, h: 1 };
  const frameAspect = frameW / frameH;
  if (aspect > frameAspect) {
    const h = frameAspect / aspect;
    return { x: 0, y: (1 - h) / 2, w: 1, h };
  }
  const w = aspect / frameAspect;
  return { x: (1 - w) / 2, y: 0, w, h: 1 };
}

const MIN = 0.05;

/** Moves a crop rect, keeping it inside the frame. */
export function moveCrop(c: NormRect, dx: number, dy: number): NormRect {
  return { ...c, x: clamp(c.x + dx, 0, 1 - c.w), y: clamp(c.y + dy, 0, 1 - c.h) };
}

export type Corner = "nw" | "ne" | "sw" | "se";

/**
 * Resizes from a corner. With an aspect (px ratio), the box keeps it: width
 * drives, height follows. The opposite corner stays fixed.
 */
export function resizeCrop(c: NormRect, corner: Corner, dx: number, dy: number, aspect: number | null, frameW: number, frameH: number): NormRect {
  const left = corner === "nw" || corner === "sw";
  const top = corner === "nw" || corner === "ne";
  const ax = left ? c.x + c.w : c.x; // anchor
  const ay = top ? c.y + c.h : c.y;
  let w = clamp(c.w + (left ? -dx : dx), MIN, left ? ax : 1 - ax);
  let h = clamp(c.h + (top ? -dy : dy), MIN, top ? ay : 1 - ay);
  if (aspect) {
    // normalised aspect: (w*frameW)/(h*frameH) = aspect
    const k = (aspect * frameH) / frameW;
    h = w / k;
    const maxH = top ? ay : 1 - ay;
    if (h > maxH) {
      h = maxH;
      w = h * k;
    }
  }
  return { x: left ? ax - w : ax, y: top ? ay - h : ay, w, h };
}

/** CSS-compatible filter string for brightness/contrast/saturation (−100…100 → 0…2). */
export function filterString(a: Adjustments): string {
  const f = (v: number) => (1 + v / 100).toFixed(3);
  return `brightness(${f(a.brightness)}) contrast(${f(a.contrast)}) saturate(${f(a.saturation)})`;
}

/* ───────── History (Undo / Redo) ───────── */

export type History = { past: EditorState[]; present: EditorState; future: EditorState[] };

export const createHistory = (state: EditorState = initialEditorState): History => ({ past: [], present: state, future: [] });

export function commit(h: History, next: EditorState, limit = 50): History {
  if (JSON.stringify(next) === JSON.stringify(h.present)) return h;
  return { past: [...h.past, h.present].slice(-limit), present: next, future: [] };
}

export function undo(h: History): History {
  const prev = h.past[h.past.length - 1];
  if (!prev) return h;
  return { past: h.past.slice(0, -1), present: prev, future: [h.present, ...h.future] };
}

export function redo(h: History): History {
  const next = h.future[0];
  if (!next) return h;
  return { past: [...h.past, h.present], present: next, future: h.future.slice(1) };
}
