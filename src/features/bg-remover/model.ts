/**
 * Background remover model — docs/03-pages.md §4.1.
 *
 * MODNet "photographic portrait matting" (ZHKKKe/MODNet, Apache-2.0: "The code,
 * models, and demos in this repository … are released under the Apache License
 * 2.0"). Built by scripts/build-bg-model.py (float16 weights, float32 compute).
 * Runs in the browser with ONNX Runtime Web (MIT), WASM backend; the runtime
 * is served from our own origin (/vendor/ort, copied on postinstall).
 */
export const BG_MODEL = {
  url: "/models/modnet-portrait.onnx",
  /** Shown in `Loading the AI model (one-time, ~N MB)…`. */
  approxMb: 13,
  /** Bump when the file changes so the Cache Storage entry is replaced. */
  cacheName: "aps-models-v1",
  wasmPath: "/vendor/ort/",
  /** MODNet reference size: the shorter side is scaled to 512. */
  refSize: 512,
  /** Longest side fed to the network (memory on phones). */
  maxSide: 1024,
} as const;

/**
 * Network input size for an image: shorter side → 512 (longest ≤ 1024), both
 * sides rounded down to a multiple of 32 (MODNet's stride).
 */
export function modelInputSize(width: number, height: number, ref: number = BG_MODEL.refSize, maxSide: number = BG_MODEL.maxSide) {
  let scale = ref / Math.min(width, height);
  if (Math.max(width, height) * scale > maxSide) scale = maxSide / Math.max(width, height);
  const round = (v: number) => Math.max(32, Math.floor((v * scale) / 32) * 32);
  return { width: round(width), height: round(height) };
}

export type ModelProgress = { loaded: number; total: number | null };

/**
 * Fetches the model once and keeps it in Cache Storage, so later visits load
 * it from disk. Falls back to a plain fetch where Cache Storage is unavailable.
 */
export async function loadModelBytes(onProgress?: (p: ModelProgress) => void): Promise<ArrayBuffer> {
  let cache: Cache | null = null;
  try {
    cache = "caches" in self ? await caches.open(BG_MODEL.cacheName) : null;
    const hit = await cache?.match(BG_MODEL.url);
    if (hit) {
      const buf = await hit.arrayBuffer();
      onProgress?.({ loaded: buf.byteLength, total: buf.byteLength });
      return buf;
    }
  } catch {
    cache = null;
  }

  const res = await fetch(BG_MODEL.url);
  if (!res.ok || !res.body) throw new Error(`Model download failed (${res.status})`);
  const total = Number(res.headers.get("content-length")) || null;
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.byteLength;
    onProgress?.({ loaded, total });
  }
  const bytes = new Uint8Array(loaded);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.byteLength;
  }
  try {
    await cache?.put(BG_MODEL.url, new Response(bytes.slice(0), { headers: { "content-type": "application/octet-stream" } }));
  } catch {
    // Quota or private mode — the tool still works, it just downloads again next time.
  }
  return bytes.buffer;
}
