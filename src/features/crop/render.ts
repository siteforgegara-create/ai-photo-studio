"use client";

import { detectFaces } from "@/features/selfie-check/face-detector";
import { faceCrop, formatSpecs, websiteLayout, type DownloadFormatId } from "./crop-math";

async function loadImage(url: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.decoding = "async";
  img.src = url;
  await img.decode();
  return img;
}

function toBlob(canvas: HTMLCanvasElement, mime: string, quality = 0.92) {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), mime, quality));
}

/** Average colour of the image's left edge — background fill for the 16:9 layout. */
function edgeColor(img: HTMLImageElement) {
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 64;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, Math.max(1, img.naturalWidth * 0.04), img.naturalHeight, 0, 0, 4, 64);
  const d = ctx.getImageData(0, 0, 4, 64).data;
  let r = 0, g = 0, b = 0;
  for (let i = 0; i < d.length; i += 4) {
    r += d[i]!;
    g += d[i + 1]!;
    b += d[i + 2]!;
  }
  const n = d.length / 4;
  return `rgb(${Math.round(r / n)}, ${Math.round(g / n)}, ${Math.round(b / n)})`;
}

/**
 * Renders a download format entirely in the browser (canvas): face-centred
 * crops, round avatar (transparent PNG) and the 16:9 website layout.
 * Re-encoding drops metadata.
 */
export async function renderFormat(url: string, format: DownloadFormatId): Promise<Blob> {
  const spec = formatSpecs[format];
  const img = await loadImage(url);
  const W = img.naturalWidth;
  const H = img.naturalHeight;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  if (format === "original") {
    canvas.width = W;
    canvas.height = H;
    ctx.drawImage(img, 0, 0);
    return toBlob(canvas, spec.mime, 0.95);
  }

  canvas.width = spec.width;
  canvas.height = spec.height;

  if (format === "website") {
    ctx.fillStyle = edgeColor(img);
    ctx.fillRect(0, 0, spec.width, spec.height);
    const l = websiteLayout(W, H, spec.width, spec.height);
    ctx.drawImage(img, l.x, l.y, l.width, l.height);
    return toBlob(canvas, spec.mime);
  }

  let face = null;
  try {
    face = (await detectFaces(img))[0] ?? null;
  } catch {
    face = null; // detector unavailable → assumed centred portrait
  }
  const crop = faceCrop(W, H, face, spec.width / spec.height, spec.faceShare ?? 0.4);
  if (format === "avatar") {
    ctx.beginPath();
    ctx.arc(spec.width / 2, spec.height / 2, spec.width / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
  }
  ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, spec.width, spec.height);
  return toBlob(canvas, spec.mime);
}

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
