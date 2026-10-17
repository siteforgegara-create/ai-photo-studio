"use client";

import { selfieCheckConfig } from "@/config/selfie-check";

export class SelfieFileError extends Error {
  constructor(
    public readonly code: "type" | "size" | "decode",
    message: string,
  ) {
    super(message);
  }
}

const HEIC = /\.(heic|heif)$/i;

export function isHeic(file: File) {
  return file.type === "image/heic" || file.type === "image/heif" || HEIC.test(file.name);
}

export function validateFile(file: File) {
  const okType =
    (selfieCheckConfig.acceptedMimeTypes as readonly string[]).includes(file.type) ||
    selfieCheckConfig.acceptedExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));
  if (!okType) throw new SelfieFileError("type", "Use a JPEG, PNG, WebP or HEIC photo.");
  if (file.size > selfieCheckConfig.maxFileBytes) throw new SelfieFileError("size", "This photo is larger than 15 MB.");
}

export type PreparedImage = {
  /** Re-encoded JPEG: EXIF/GPS stripped, longest side ≤ 4096 px, orientation applied. */
  blob: Blob;
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
};

/**
 * HEIC → JPEG (heic2any, dynamic import), then decode with EXIF orientation,
 * downscale to ≤ 4096 px and re-encode. Re-encoding through a canvas drops
 * all metadata, including location.
 */
export async function prepareImage(file: File): Promise<PreparedImage> {
  validateFile(file);
  let source: Blob = file;
  if (isHeic(file)) {
    const { default: heic2any } = await import("heic2any");
    const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
    source = Array.isArray(converted) ? converted[0]! : converted;
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(source, { imageOrientation: "from-image" });
  } catch {
    throw new SelfieFileError("decode", "We couldn't read this photo.");
  }

  const max = selfieCheckConfig.maxDimensionPx;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new SelfieFileError("decode", "We couldn't read this photo.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new SelfieFileError("decode", "We couldn't read this photo."))), "image/jpeg", 0.92),
  );
  return { blob, canvas, width, height };
}

/** Draws a region of a canvas into a new small canvas (longest side = size). */
export function regionToImageData(canvas: HTMLCanvasElement, rect: { x: number; y: number; width: number; height: number }, size: number): ImageData {
  const scale = size / Math.max(rect.width, rect.height);
  const w = Math.max(1, Math.round(rect.width * scale));
  const h = Math.max(1, Math.round(rect.height * scale));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(canvas, rect.x, rect.y, rect.width, rect.height, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}
