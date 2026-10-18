/**
 * Face detection + embedding with @vladmandic/human (MIT) on the WASM
 * backend — pure JS/WASM, no native build, works on Windows. Models ship in
 * the npm package and are read from disk; nothing is downloaded.
 * InsightFace/ArcFace weights are deliberately not used (non-commercial).
 */
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import sharp from "sharp";
import { ROOT } from "./paths";

export type DetectedFace = { score: number; box: [number, number, number, number]; embedding: number[] };
export type FaceResult = { width: number; height: number; faces: DetectedFace[] };

type HumanLike = {
  load(): Promise<void>;
  warmup(): Promise<unknown>;
  detect(input: unknown): Promise<{ face: { score: number; box: [number, number, number, number]; embedding?: number[] }[] }>;
  tf: { tensor3d(data: Uint8Array, shape: [number, number, number], dtype: string): { dispose(): void } };
};

let human: HumanLike | null = null;

/** Human fetches its model files; Node's fetch cannot read file:// URLs, so serve them from disk. */
function installFileFetch() {
  const g = globalThis as { fetch: typeof fetch; __benchFileFetch?: boolean };
  if (g.__benchFileFetch) return;
  const real = g.fetch.bind(globalThis);
  g.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.startsWith("file:")) {
      const buf = await readFile(fileURLToPath(url));
      return new Response(new Uint8Array(buf), { status: 200, headers: { "content-type": url.endsWith(".json") ? "application/json" : "application/octet-stream" } });
    }
    return real(input, init);
  }) as typeof fetch;
  g.__benchFileFetch = true;
}

export async function loadFaceModel(): Promise<HumanLike> {
  if (human) return human;
  installFileFetch();
  const require = createRequire(path.join(ROOT, "package.json"));
  // The package's "exports" map lacks "./" prefixes, so resolve the WASM build by file path.
  const distDir = path.dirname(require.resolve("@vladmandic/human"));
  const { Human } = require(path.join(distDir, "human.node-wasm.js")) as { Human: new (config: unknown) => HumanLike };
  const modelDir = path.join(distDir, "..", "models") + path.sep;
  const wasmDir = path.join(path.dirname(require.resolve("@tensorflow/tfjs-backend-wasm")), path.sep);
  const h = new Human({
    backend: "wasm",
    wasmPath: wasmDir,
    modelBasePath: pathToFileURL(modelDir).href,
    debug: false,
    face: {
      enabled: true,
      detector: { rotation: true, maxDetected: 5, minConfidence: 0.3, return: false },
      mesh: { enabled: true },
      iris: { enabled: false },
      description: { enabled: true },
      emotion: { enabled: false },
      antispoof: { enabled: false },
      liveness: { enabled: false },
    },
    body: { enabled: false },
    hand: { enabled: false },
    object: { enabled: false },
    gesture: { enabled: false },
    segmentation: { enabled: false },
  });
  await h.load();
  await h.warmup();
  human = h;
  return h;
}

export async function analyzeFace(file: string): Promise<FaceResult> {
  const h = await loadFaceModel();
  const { data, info } = await sharp(file).rotate().removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const tensor = h.tf.tensor3d(new Uint8Array(data), [info.height, info.width, 3], "int32");
  try {
    const r = await h.detect(tensor);
    return {
      width: info.width,
      height: info.height,
      faces: r.face.filter((f) => f.embedding?.length).map((f) => ({ score: f.score, box: f.box, embedding: Array.from(f.embedding!) })),
    };
  } finally {
    tensor.dispose();
  }
}

// ─── Pure helpers (tested) ──────────────────────────────────────────────────

export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

/** Mean of L2-normalised embeddings, normalised again — the "average face" of a set of selfies. */
export function meanEmbedding(list: number[][]): number[] {
  if (!list.length) return [];
  const dim = list[0]!.length;
  const sum = new Array<number>(dim).fill(0);
  for (const e of list) {
    const n = Math.hypot(...e) || 1;
    for (let i = 0; i < dim; i++) sum[i]! += e[i]! / n;
  }
  const norm = Math.hypot(...sum) || 1;
  return sum.map((v) => v / norm);
}

export type Defect = "no-face" | "multiple-faces" | "face-too-small";

/** Largest face's height must be at least this share of the image height for a head-and-shoulders headshot. */
export const MIN_FACE_HEIGHT_RATIO = 0.12;

export function defectOf(r: FaceResult): Defect | null {
  if (!r.faces.length) return "no-face";
  const confident = r.faces.filter((f) => f.score >= 0.5);
  if (confident.length > 1) return "multiple-faces";
  const main = largestFace(r)!;
  if (main.box[3] / r.height < MIN_FACE_HEIGHT_RATIO) return "face-too-small";
  return null;
}

export function largestFace(r: FaceResult): DetectedFace | undefined {
  return [...r.faces].sort((a, b) => b.box[2] * b.box[3] - a.box[2] * a.box[3])[0];
}
