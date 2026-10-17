/**
 * Compositing for the background remover — all on <canvas>, all local.
 * The matte comes from the network at ~512 px and is scaled up to the photo
 * size by the browser's bilinear sampling, which keeps hair edges soft.
 */
export type BackgroundChoice = { kind: "transparent" } | { kind: "white" } | { kind: "color"; color: string } | { kind: "blur" };

/** Float matte (0–1) → RGBA bytes with the matte in the alpha channel. */
export function matteToRgba(matte: Float32Array): Uint8ClampedArray<ArrayBuffer> {
  const out = new Uint8ClampedArray(matte.length * 4);
  for (let i = 0; i < matte.length; i++) {
    out[i * 4] = 255;
    out[i * 4 + 1] = 255;
    out[i * 4 + 2] = 255;
    out[i * 4 + 3] = Math.round(Math.min(1, Math.max(0, matte[i]!)) * 255);
  }
  return out;
}

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

export function maskCanvas(matte: Float32Array, width: number, height: number) {
  const c = canvas(width, height);
  c.getContext("2d")!.putImageData(new ImageData(matteToRgba(matte), width, height), 0, 0);
  return c;
}

/** Cut-out of the subject: the photo with the matte as its alpha channel. */
export function cutout(source: HTMLCanvasElement, mask: HTMLCanvasElement) {
  const c = canvas(source.width, source.height);
  const ctx = c.getContext("2d")!;
  ctx.drawImage(source, 0, 0);
  ctx.globalCompositeOperation = "destination-in";
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(mask, 0, 0, source.width, source.height);
  return c;
}

/**
 * Strong, cheap blur that works in every browser (no ctx.filter on older
 * Safari): downscale, then scale back up in two smooth steps.
 */
function blurred(source: HTMLCanvasElement) {
  const w = source.width;
  const h = source.height;
  const small = canvas(Math.max(8, Math.round(w / 24)), Math.max(8, Math.round(h / 24)));
  const mid = canvas(Math.max(16, Math.round(w / 6)), Math.max(16, Math.round(h / 6)));
  const out = canvas(w, h);
  for (const [dst, src] of [
    [small, source],
    [mid, small],
    [out, mid],
  ] as const) {
    const ctx = dst.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(src, 0, 0, dst.width, dst.height);
  }
  return out;
}

export function compose(source: HTMLCanvasElement, subject: HTMLCanvasElement, bg: BackgroundChoice) {
  const c = canvas(source.width, source.height);
  const ctx = c.getContext("2d")!;
  if (bg.kind === "white" || bg.kind === "color") {
    ctx.fillStyle = bg.kind === "white" ? "#ffffff" : bg.color;
    ctx.fillRect(0, 0, c.width, c.height);
  } else if (bg.kind === "blur") {
    ctx.drawImage(blurred(source), 0, 0);
  }
  ctx.drawImage(subject, 0, 0);
  return c;
}

export function toBlob(c: HTMLCanvasElement, type: "image/png" | "image/jpeg") {
  return new Promise<Blob>((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("Encoding failed"))), type, 0.92));
}
