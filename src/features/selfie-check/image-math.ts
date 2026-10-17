/**
 * Pure image metrics for the in-browser selfie check (06-shoot-flow §1).
 * They work on grayscale buffers so they are unit-testable without a canvas.
 */

export type GrayImage = { data: Float32Array; width: number; height: number };
export type RgbaLike = { data: Uint8ClampedArray | Uint8Array | number[]; width: number; height: number };
export type Rect = { x: number; y: number; width: number; height: number };

/** ITU-R BT.601 luma, 0–255. */
export function toGray(img: RgbaLike): GrayImage {
  const { width, height, data } = img;
  const out = new Float32Array(width * height);
  for (let i = 0, p = 0; i < out.length; i++, p += 4) {
    out[i] = 0.299 * (data[p] ?? 0) + 0.587 * (data[p + 1] ?? 0) + 0.114 * (data[p + 2] ?? 0);
  }
  return { data: out, width, height };
}

/** Mean luminance (0–255). */
export function meanBrightness(gray: GrayImage): number {
  let sum = 0;
  for (let i = 0; i < gray.data.length; i++) sum += gray.data[i] ?? 0;
  return gray.data.length ? sum / gray.data.length : 0;
}

/**
 * Variance of the Laplacian (4-neighbour kernel). Classic focus measure:
 * sharp images have strong edges → high variance; blur flattens it.
 */
export function laplacianVariance(gray: GrayImage): number {
  const { data, width: w, height: h } = gray;
  if (w < 3 || h < 3) return 0;
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const lap = (data[i - w] ?? 0) + (data[i + w] ?? 0) + (data[i - 1] ?? 0) + (data[i + 1] ?? 0) - 4 * (data[i] ?? 0);
      sum += lap;
      sumSq += lap * lap;
      n++;
    }
  }
  const mean = sum / n;
  return sumSq / n - mean * mean;
}

/** Box-filter resize of a grayscale buffer (area averaging). */
export function resizeGray(gray: GrayImage, width: number, height: number): GrayImage {
  const out = new Float32Array(width * height);
  const sx = gray.width / width;
  const sy = gray.height / height;
  for (let y = 0; y < height; y++) {
    const y0 = Math.floor(y * sy);
    const y1 = Math.max(y0 + 1, Math.floor((y + 1) * sy));
    for (let x = 0; x < width; x++) {
      const x0 = Math.floor(x * sx);
      const x1 = Math.max(x0 + 1, Math.floor((x + 1) * sx));
      let s = 0;
      let c = 0;
      for (let yy = y0; yy < y1 && yy < gray.height; yy++) {
        for (let xx = x0; xx < x1 && xx < gray.width; xx++) {
          s += gray.data[yy * gray.width + xx] ?? 0;
          c++;
        }
      }
      out[y * width + x] = c ? s / c : 0;
    }
  }
  return { data: out, width, height };
}

/**
 * dHash: 64-bit perceptual hash (9×8 grid, compare horizontal neighbours).
 * Returned as a 16-char hex string.
 */
export function dHash(gray: GrayImage): string {
  const small = resizeGray(gray, 9, 8);
  let bits = "";
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      bits += (small.data[y * 9 + x] ?? 0) > (small.data[y * 9 + x + 1] ?? 0) ? "1" : "0";
    }
  }
  let hex = "";
  for (let i = 0; i < 64; i += 4) hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  return hex;
}

export function hammingDistance(a: string, b: string): number {
  if (a.length !== b.length) return Infinity;
  let d = 0;
  for (let i = 0; i < a.length; i++) {
    let x = parseInt(a[i]!, 16) ^ parseInt(b[i]!, 16);
    while (x) {
      d += x & 1;
      x >>= 1;
    }
  }
  return d;
}

/** Expands a face box (more context: forehead, chin) and clamps it to the image. */
export function expandRect(rect: Rect, imgW: number, imgH: number, factor = 1.2): Rect {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const w = Math.min(imgW, rect.width * factor);
  const h = Math.min(imgH, rect.height * factor);
  const x = Math.min(Math.max(0, cx - w / 2), imgW - w);
  const y = Math.min(Math.max(0, cy - h / 2), imgH - h);
  return { x, y, width: w, height: h };
}
