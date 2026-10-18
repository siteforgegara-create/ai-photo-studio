import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { SELFIE_MAX_PIXELS } from "../config";
import type { Size } from "./cost";

/**
 * Selfie → upload-ready JPEG: EXIF orientation applied, metadata (incl. GPS)
 * removed, at most SELFIE_MAX_PIXELS so per-megapixel input pricing stays at 1 MP.
 */
export async function normalizeSelfie(file: string): Promise<{ buffer: Buffer } & Size> {
  const img = sharp(file).rotate();
  const meta = await img.metadata();
  const w = meta.autoOrient?.width ?? meta.width ?? 1024;
  const h = meta.autoOrient?.height ?? meta.height ?? 1024;
  const scale = Math.min(1, Math.sqrt(SELFIE_MAX_PIXELS / (w * h)));
  const width = Math.floor(w * scale);
  const height = Math.floor(h * scale);
  const buffer = await img.resize(width, height).jpeg({ quality: 92 }).toBuffer();
  return { buffer, width, height };
}

/** Downloads a result URL and saves it as JPEG. Returns its size. */
export async function downloadImage(url: string, file: string): Promise<Size> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`);
  const input = Buffer.from(await res.arrayBuffer());
  mkdirSync(path.dirname(file), { recursive: true });
  const out = sharp(input).rotate();
  const { width = 0, height = 0 } = await out.metadata();
  writeFileSync(file, await out.jpeg({ quality: 95 }).toBuffer());
  return { width, height };
}

/** Center-cover crop to an exact size, WebP — for the demo set (1080×1350). */
export async function exportWebp(src: string, dest: string, size: Size) {
  mkdirSync(path.dirname(dest), { recursive: true });
  await sharp(src).rotate().resize(size.width, size.height, { fit: "cover", position: "attention" }).webp({ quality: 86 }).toFile(dest);
}
