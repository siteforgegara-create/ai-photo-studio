/**
 * B0 benchmark configuration — docs/07-benchmark-b0.md.
 *
 * Endpoint ids, input fields and prices were checked on the fal.ai model pages
 * (playground + /api schema) on 2026-10-18. fal.ai notes that prices may
 * change: re-check before a large run. Every price feeds the dry-run plan and
 * the hard spending ceiling, so keep this file the single source of truth.
 */

export const PRICES_CHECKED = "2026-10-18";

/** Hard ceiling for everything B0 does (docs/07: $17 of the $20 balance). */
export const SPEND_CEILING_USD = 17;

/** Generation resolution for the comparison (docs/07 §3: 1K for all). 4:5 portrait. */
export const OUTPUT = { width: 880, height: 1100 } as const; // 0.968 MP: stays inside the first megapixel for per-MP pricing

/** Selfies are normalised before upload: EXIF removed, ≤ 1 MP (keeps per-MP input billing at 1 MP each). */
export const SELFIE_MAX_PIXELS = 1_000_000;

/** Concurrency and retries (docs/07 §6). */
export const MAX_CONCURRENCY = 3;
export const MAX_RETRIES = 2;

/** Uploaded inputs and generated outputs expire on fal's CDN after a day (X-Fal-Object-Lifecycle-Preference). */
export const FAL_OBJECT_EXPIRY = "1d" as const;

/** Frames per subject × model: 2 styles × 2 frames (docs/07 §4). */
export const BENCH_STYLES = ["corporate-gray", "modern-office"] as const;
export const FRAMES_PER_STYLE = 2;
export const BASE_SEED = 1017;

/**
 * Plan used by dry-run when bench/subjects/ is still empty, so the owner sees
 * the full budget before adding photos: 3 real people (minimum of docs/07 §2)
 * + 5 synthetic personas.
 */
export const PLANNED_REAL_SUBJECTS = 3;
export const PLANNED_SYNTH_SUBJECTS = 5;

// ─── Pricing ────────────────────────────────────────────────────────────────

export type Pricing =
  /** Flat price per generated image. */
  | { kind: "per_image"; usd: number }
  /**
   * FLUX.2 [pro]: "$0.03 for the first megapixel of output, plus $0.015 per
   * extra megapixel of input and output, rounded up to the nearest megapixel".
   * We round every image up separately — the conservative reading.
   */
  | { kind: "flux2"; firstOutputMpUsd: number; extraMpUsd: number }
  /** Price per megapixel of output, rounded up per image. */
  | { kind: "per_mp"; usd: number }
  /** Training: price for `baseSteps`, scales linearly with steps. */
  | { kind: "training"; usd: number; baseSteps: number };

export type Source = { url: string; checked: string; note?: string };

// ─── Models under test ──────────────────────────────────────────────────────

export type ModelKey = "nb2" | "nbpro" | "seedream" | "flux2" | "lora";

export type BenchModel = {
  key: ModelKey;
  label: string;
  endpoint: string;
  pricing: Pricing;
  /** How many selfies the endpoint accepts as references. */
  maxRefs: number;
  /** Seed is honoured by the endpoint. */
  seed: boolean;
  source: Source;
  note?: string;
};

export const MODELS: Record<Exclude<ModelKey, "lora">, BenchModel> = {
  nb2: {
    key: "nb2",
    label: "Nano Banana 2",
    endpoint: "fal-ai/nano-banana-2/edit",
    pricing: { kind: "per_image", usd: 0.08 }, // 1K; 2K ×1.5, 4K ×2
    maxRefs: 14,
    seed: true,
    source: { url: "https://fal.ai/models/fal-ai/nano-banana-2/edit", checked: PRICES_CHECKED, note: "$0.08 per image at 1K" },
  },
  nbpro: {
    key: "nbpro",
    label: "Nano Banana Pro",
    endpoint: "fal-ai/nano-banana-pro/edit",
    pricing: { kind: "per_image", usd: 0.15 }, // 1K/2K; 4K ×2
    maxRefs: 14,
    seed: true,
    source: { url: "https://fal.ai/models/fal-ai/nano-banana-pro/edit", checked: PRICES_CHECKED, note: "$0.15 per image (4K: double)" },
  },
  seedream: {
    key: "seedream",
    label: "Seedream 4.5",
    endpoint: "fal-ai/bytedance/seedream/v4.5/edit",
    pricing: { kind: "per_image", usd: 0.04 },
    maxRefs: 10,
    seed: true,
    source: { url: "https://fal.ai/models/fal-ai/bytedance/seedream/v4.5/edit", checked: PRICES_CHECKED, note: "$0.04 per image" },
    note: "Minimum output is ~3.7 MP (custom sizes need ≥ 2560×1440 pixels in total), so Seedream runs at 1728×2160 — not 1K like the others. Seedream 5.0 Pro is listed on fal.ai as text-to-image only on the check date.",
  },
  flux2: {
    key: "flux2",
    label: "FLUX.2 [pro]",
    endpoint: "fal-ai/flux-2-pro/edit",
    pricing: { kind: "flux2", firstOutputMpUsd: 0.03, extraMpUsd: 0.015 },
    maxRefs: 4, // endpoint takes up to 9; 4 keeps the per-MP input cost inside the budget (see README)
    seed: true,
    source: {
      url: "https://fal.ai/models/fal-ai/flux-2-pro/edit",
      checked: PRICES_CHECKED,
      note: "$0.03 first MP of output + $0.015 per extra MP of input and output, rounded up; up to 9 references",
    },
  },
};

/** Control "like competitors": fast FLUX LoRA training on the selfies + generation (docs/07 §3). */
export const LORA = {
  key: "lora" as const,
  label: "FLUX LoRA (control)",
  trainEndpoint: "fal-ai/flux-lora-fast-training",
  trainPricing: { kind: "training", usd: 2, baseSteps: 1000 } as Pricing,
  steps: 1000,
  triggerWord: "TOKPERSON",
  generateEndpoint: "fal-ai/flux-lora",
  generatePricing: { kind: "per_mp", usd: 0.035 } as Pricing,
  sources: [
    { url: "https://fal.ai/models/fal-ai/flux-lora-fast-training", checked: PRICES_CHECKED, note: "$2 per training run, scales linearly with steps (default 1000)" },
    { url: "https://fal.ai/models/fal-ai/flux-lora", checked: PRICES_CHECKED, note: "$0.035 per megapixel, rounded up" },
  ] as Source[],
};

/** Synthetic personas (docs/07 §2 step A): a model that is NOT under test, to limit bias. */
export const PERSONAS = {
  referenceEndpoint: "fal-ai/nano-banana",
  selfieEndpoint: "fal-ai/nano-banana/edit",
  pricing: { kind: "per_image", usd: 0.039 } as Pricing,
  selfiesPerPersona: 6,
  source: { url: "https://fal.ai/models/fal-ai/nano-banana/edit", checked: PRICES_CHECKED, note: "$0.039 per image (original Nano Banana)" } as Source,
};

/** Upscale mini-test (docs/07 §3): 3 best frames → 4K. */
export const UPSCALE = {
  endpoint: "fal-ai/seedvr/upscale/image",
  pricing: { kind: "per_mp", usd: 0.001 } as Pricing,
  /** 4K class: SeedVR2 "target" mode, 2160p. Cost is planned for a 3840×4800 output (conservative). */
  targetResolution: "2160p" as const,
  plannedOutput: { width: 3840, height: 4800 },
  frames: 3,
  source: { url: "https://fal.ai/models/fal-ai/seedvr/upscale/image/llms.txt", checked: PRICES_CHECKED, note: "$0.001 per megapixel" } as Source,
};

/**
 * Demo set (docs/07 §8): candidates per style (`--candidates=N`); the best by
 * auto-likeness is exported. 1 by default: after personas + run + upscale
 * (~$15.1) about $1.9 is left under the ceiling.
 */
export const DEMO = {
  candidatesPerStyle: 1,
  size: { width: 1080, height: 1350 },
};

/** What fal.ai documents about storage of uploaded files (docs/07 §9) — quoted in the report. */
export const FAL_RETENTION_NOTE =
  "fal.ai (docs: Media Expiration, checked 2026-10-18): uploaded inputs and generated outputs live on the fal CDN; retention is configurable per request with the X-Fal-Object-Lifecycle-Preference header — the bench sets 1 day. Request inputs/outputs are also kept in request history for 90 days by default; the bench sends X-Fal-Store-IO: 0 so they are not stored there. Expired files are permanently deleted.";
