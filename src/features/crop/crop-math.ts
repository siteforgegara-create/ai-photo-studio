/**
 * Face-centred crop geometry for downloads (06-shoot-flow §2) — pure, unit-tested.
 * The face box comes from the same MediaPipe detector as the selfie check;
 * without a face we assume a centred head-and-shoulders portrait.
 */
import type { Rect } from "@/features/selfie-check/image-math";

export type DownloadFormatId = "original" | "linkedin" | "resume" | "avatar" | "website";

export type FormatSpec = {
  id: DownloadFormatId;
  /** Output size in px (original keeps the source size). */
  width: number;
  height: number;
  mime: "image/jpeg" | "image/png";
  /** Face height as a share of the crop height. */
  faceShare?: number;
  suffix: string;
};

export const formatSpecs: Record<DownloadFormatId, FormatSpec> = {
  original: { id: "original", width: 0, height: 0, mime: "image/jpeg", suffix: "4k" },
  linkedin: { id: "linkedin", width: 1080, height: 1080, mime: "image/jpeg", faceShare: 0.42, suffix: "linkedin-1x1" },
  resume: { id: "resume", width: 1200, height: 1600, mime: "image/jpeg", faceShare: 0.34, suffix: "resume-3x4" },
  avatar: { id: "avatar", width: 1080, height: 1080, mime: "image/png", faceShare: 0.5, suffix: "avatar" },
  website: { id: "website", width: 1920, height: 1080, mime: "image/jpeg", suffix: "website-16x9" },
};

/** Where the face centre sits vertically in the crop (leaves headroom above). */
const FACE_CENTER_Y = 0.42;

export function assumedFace(imgW: number, imgH: number): Rect {
  const size = Math.min(imgW, imgH) * 0.38;
  return { x: imgW / 2 - size / 2, y: imgH * 0.36 - size / 2, width: size, height: size };
}

/** Crop rectangle (source px) with the target aspect, centred on the face, inside the image. */
export function faceCrop(imgW: number, imgH: number, face: Rect | null, aspect: number, faceShare: number): Rect {
  const f = face ?? assumedFace(imgW, imgH);
  let h = f.height / faceShare;
  let w = h * aspect;
  // Fit inside the image while keeping the aspect.
  const fit = Math.min(1, imgW / w, imgH / h);
  w *= fit;
  h *= fit;
  const cx = f.x + f.width / 2;
  const cy = f.y + f.height / 2;
  const x = clamp(cx - w / 2, 0, imgW - w);
  const y = clamp(cy - h * FACE_CENTER_Y, 0, imgH - h);
  return { x, y, width: w, height: h };
}

/**
 * Website 16:9 "with space": the full portrait scaled to the canvas height and
 * placed on the right, the rest filled with the photo's background colour so
 * there is room for text on the left.
 */
export function websiteLayout(imgW: number, imgH: number, outW = 1920, outH = 1080) {
  const scale = outH / imgH;
  const drawW = imgW * scale;
  const margin = Math.round(outW * 0.06);
  return { x: Math.round(outW - drawW - margin), y: 0, width: Math.round(drawW), height: outH };
}

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), Math.max(min, max));
}
