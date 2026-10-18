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

/**
 * Calibration (fal.ai Usage by model, 2026-10-18): every price has its own
 * safety margin (`marginFactor`): 1.0 where the bill confirmed the list price,
 * more where it is not confirmed yet or billed by tokens. Margins apply in
 * dry-runs, in the ceiling check and in the forecast; output shows "list
 * price" and "with margin". The ceiling is checked against
 * max(Σ counted × margin, reconciled actual + Σ calls since then × margin) —
 * see effectiveSpent() and `npm run bench:reconcile -- --actual=…`.
 * A call whose key matches no known price gets DEFAULT_MARGIN.
 */
export const DEFAULT_MARGIN = 1.2;

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
  /**
   * Gemini-style token billing (Nano Banana 2.1): a 1K output image is ~1,120
   * image tokens, every input image ~1,120 input tokens; `overheadUsd` covers
   * the prompt and default ("medium") thinking tokens with a margin.
   */
  | { kind: "tokens"; outputImageUsd: number; inputImageUsd: number; overheadUsd: number }
  /** Training: price for `baseSteps`, scales linearly with steps. */
  | { kind: "training"; usd: number; baseSteps: number };

export type Source = { url: string; checked: string; note?: string };

// ─── Models under test ──────────────────────────────────────────────────────

export type ModelKey = "nb21" | "nbpro" | "seedream" | "flux3" | "lora";

export type BenchModel = {
  key: ModelKey;
  label: string;
  endpoint: string;
  pricing: Pricing;
  /** How many selfies the endpoint accepts as references. */
  maxRefs: number;
  /** Seed is honoured by the endpoint. */
  seed: boolean;
  /** Safety margin on the planned price (1.0 = confirmed by fal.ai Usage). */
  marginFactor: number;
  source: Source;
  note?: string;
};

export const MODELS: Record<Exclude<ModelKey, "lora">, BenchModel> = {
  nb21: {
    key: "nb21",
    label: "Nano Banana 2.1",
    endpoint: "google/nano-banana-2.1/edit",
    // $35.294 per 1M image output tokens × ~1,120 tokens (1K) = $0.0395; inputs $1.764 per 1M × ~1,120 = ~$0.002 each;
    // fal measured a 1K edit with default thinking at $0.0415 (2 inputs: $0.044). $0.01 overhead = prompt + thinking + margin.
    pricing: { kind: "tokens", outputImageUsd: 0.0396, inputImageUsd: 0.002, overheadUsd: 0.01 },
    maxRefs: 14,
    seed: true,
    marginFactor: 1.0, // fal.ai Usage 2026-10-18: $0.221 for 4 frames = $0.0553 per frame, below the planned $0.0616
    source: {
      url: "https://fal.ai/models/google/nano-banana-2.1/edit",
      checked: PRICES_CHECKED,
      note: "token billing: image tokens $1.764 in / $35.294 out per 1M; ~1,120 tokens per 1K image; fal test 2026-10-07: $0.0415 per 1K edit; up to 14 references. Overview: https://fal.ai/nano-banana-2.1",
    },
    note: "Replaces Nano Banana 2 (fal-ai/nano-banana-2/edit, $0.08 per 1K image). Billed by tokens, so the planned price is an estimate with a margin: compare it with the fal.ai usage page after the smoke test.",
  },
  nbpro: {
    key: "nbpro",
    label: "Nano Banana Pro",
    endpoint: "fal-ai/nano-banana-pro/edit",
    pricing: { kind: "per_image", usd: 0.15 }, // 1K/2K; 4K ×2
    maxRefs: 14,
    seed: true,
    marginFactor: 1.1, // not yet confirmed by the bill
    source: { url: "https://fal.ai/models/fal-ai/nano-banana-pro/edit", checked: PRICES_CHECKED, note: "$0.15 per image (4K: double)" },
  },
  seedream: {
    key: "seedream",
    label: "Seedream 4.5",
    endpoint: "fal-ai/bytedance/seedream/v4.5/edit",
    pricing: { kind: "per_image", usd: 0.04 },
    maxRefs: 10,
    seed: true,
    marginFactor: 1.1, // not yet confirmed by the bill
    source: { url: "https://fal.ai/models/fal-ai/bytedance/seedream/v4.5/edit", checked: PRICES_CHECKED, note: "$0.04 per image" },
    note: "Minimum output is ~3.7 MP (custom sizes need ≥ 2560×1440 pixels in total), so Seedream runs at 1728×2160 — not 1K like the others. Seedream 5.0 Pro is listed on fal.ai as text-to-image only on the check date.",
  },
  flux3: {
    key: "flux3",
    label: "FLUX 3",
    endpoint: "blackforestlabs/flux-3/edit-image",
    // 2 MP per call × $0.048 — empirical: fal.ai Usage 2026-10-18 billed 8.00 MP for 4 smoke frames
    // (output 880×1100-class < 1 MP, 6 references of ~1 MP each → the references add 1 MP per call in total).
    pricing: { kind: "per_image", usd: 0.096 },
    maxRefs: 10, // all selfies (≤ 8) — never reduced to save money, the comparison must stay fair
    seed: false, // the endpoint schema has no seed field
    marginFactor: 1.0, // confirmed at $0.096 by the bill
    source: {
      url: "https://fal.ai/models/blackforestlabs/flux-3/edit-image",
      checked: PRICES_CHECKED,
      note: "$0.048 per MP (https://fal.ai/pricing); billed 2 MP per call = $0.096 per frame — empirical, fal.ai Usage 2026-10-18 (8.00 MP for 4 calls with 6 references each). The docs do not say how inputs are counted; with 6 references (~6 MP of input) only 1 MP was added, so inputs appear to be counted as one megapixel in total. Up to 10 references.",
    },
    note: "Replaces FLUX.2 [pro] (fal-ai/flux-2-pro/edit). Planned at 2 MP per call ($0.096) from the fal.ai bill: the references add 1 MP per call (6 references gave the same +1 MP; whether 8 references do too is checked by reconcile after the run). No seed parameter, so FLUX 3 frames are not reproducible.",
  },
};

/** Control "like competitors": fast FLUX LoRA training on the selfies + generation (docs/07 §3). */
export const LORA = {
  key: "lora" as const,
  label: "FLUX LoRA (control)",
  trainEndpoint: "fal-ai/flux-lora-fast-training",
  trainPricing: { kind: "training", usd: 2, baseSteps: 1000 } as Pricing,
  trainMargin: 1.1, // not yet confirmed by the bill
  steps: 1000,
  triggerWord: "TOKPERSON",
  generateEndpoint: "fal-ai/flux-lora",
  generatePricing: { kind: "per_mp", usd: 0.035 } as Pricing,
  generateMargin: 1.1, // not yet confirmed by the bill
  sources: [
    { url: "https://fal.ai/models/fal-ai/flux-lora-fast-training", checked: PRICES_CHECKED, note: "$2 per training run, scales linearly with steps (default 1000)" },
    { url: "https://fal.ai/models/fal-ai/flux-lora", checked: PRICES_CHECKED, note: "$0.035 per megapixel, rounded up" },
  ] as Source[],
};

/**
 * Synthetic personas (docs/07 §2 step A): Qwen models — a different family
 * from every model under test, so none of them gets a head start on synthetic
 * faces. Text-to-image for the reference, image edit for the 6 "bad selfies".
 * Sizes are multiples of 16 and under 1,000,000 px, so each image is billed as 1 MP.
 */
export const PERSONAS = {
  referenceEndpoint: "fal-ai/qwen-image",
  referencePricing: { kind: "per_mp", usd: 0.02 } as Pricing,
  referenceMargin: 1.0, // fal.ai Usage 2026-10-18: 5.00 MP × $0.02 = $0.10, as planned
  referenceSize: { width: 864, height: 1088 },
  selfieEndpoint: "fal-ai/qwen-image-edit-2511",
  selfiePricing: { kind: "per_mp", usd: 0.03 } as Pricing,
  selfieMargin: 1.0, // fal.ai Usage 2026-10-18: 30.00 MP × $0.03 = $0.90, as planned — input images are not billed
  selfieSize: { width: 864, height: 1152 },
  selfiesPerPersona: 6,
  baseSeed: 4242,
  sources: [
    { url: "https://fal.ai/models/fal-ai/qwen-image", checked: PRICES_CHECKED, note: "$0.02 per megapixel (confirmed by fal.ai Usage 2026-10-18)" },
    { url: "https://fal.ai/models/fal-ai/qwen-image-edit-2511", checked: PRICES_CHECKED, note: "$0.03 per megapixel of output, input images not billed (confirmed by fal.ai Usage 2026-10-18); image_urls, image_size, seed" },
  ] as Source[],
};

/**
 * Visible-appearance analysis (bench:analyze): every selfie separately, then a
 * majority vote per subject. Only visible attributes — never race, ethnic
 * origin or a numeric age (lib/attributes.ts enforces the vocabulary).
 *
 * fal.ai "OpenRouter Vision" router, Gemini 2.5 Flash, temperature 0. Billed
 * by tokens at OpenRouter rates ($0.30 per 1M input, $2.50 per 1M output):
 * one ~1 MP selfie (~1,000–1,300 image tokens) + ~450 prompt tokens + ≤ 300
 * output tokens ≈ $0.0012. Planned at $0.003 per selfie (×2.5 headroom);
 * the response also reports usage.cost, which is written to the log.
 * Alternative with a flat price: fal-ai/any-llm/vision, "$0.01 per requests".
 */
export const ANALYZE = {
  endpoint: "openrouter/router/vision",
  model: "google/gemini-2.5-flash",
  pricing: { kind: "per_image", usd: 0.003 } as Pricing,
  marginFactor: 1.5, // token billing, not yet confirmed by the bill
  maxTokens: 400,
  /**
   * Second call per subject: all selfies (≤ 8) in one request, hair and eye
   * color only, judged across the photos with lighting discounted. ~8 images ×
   * ~1,300 tokens + prompt ≈ 11k input tokens ($0.0033) + ≤ 120 output tokens
   * → planned at $0.006 per subject (same ×1.5 margin; the first 30 per-selfie
   * calls cost $0.09 at plan = fal.ai Usage, so the plan is not optimistic).
   */
  colorPricing: { kind: "per_image", usd: 0.006 } as Pricing,
  colorMaxTokens: 120,
  sources: [
    { url: "https://fal.ai/models/openrouter/router/vision", checked: PRICES_CHECKED, note: "charged by input and output tokens; returns usage.cost" },
    { url: "https://openrouter.ai/google/gemini-2.5-flash", checked: PRICES_CHECKED, note: "$0.30 per 1M input tokens, $2.50 per 1M output tokens" },
    { url: "https://fal.ai/models/fal-ai/any-llm/vision", checked: PRICES_CHECKED, note: "alternative: $0.01 per request flat" },
  ] as Source[],
};

/**
 * Attribute ablation (bench:run group "nb21-noattr"): Nano Banana 2.1 without
 * the "Subject details" line, 2 styles × 2 frames per subject. Subjects in
 * this order; a real id that is not on disk yet is replaced by its fallback.
 * The B0 forecast cuts it to the first 2 subjects when the full plan with the
 * margin would cross the ceiling.
 */
export const ABLATION = {
  baseModel: "nb21" as const,
  key: "nb21-noattr",
  label: "Nano Banana 2.1 · no attrs",
  subjects: ["synth-01", "synth-02", "real-01", "real-02"],
  fallback: { "real-01": "synth-03", "real-02": "synth-05" } as Record<string, string>,
  reducedSubjects: 2,
};

/**
 * B0 forecast (bench:forecast): personas still to regenerate (unless already
 * redone with the current prompt) and the model assumed for the demo step.
 */
export const FORECAST = {
  redo: ["synth-02", "synth-05"],
  demoModel: "nb21" as const,
  demoAltModel: "nbpro" as const,
};

/** Upscale mini-test (docs/07 §3): 3 best frames → 4K. */
export const UPSCALE = {
  endpoint: "fal-ai/seedvr/upscale/image",
  pricing: { kind: "per_mp", usd: 0.001 } as Pricing,
  marginFactor: 1.2,
  /** 4K class: SeedVR2 "target" mode, 2160p. Cost is planned for a 3840×4800 output (conservative). */
  targetResolution: "2160p" as const,
  plannedOutput: { width: 3840, height: 4800 },
  frames: 3,
  source: { url: "https://fal.ai/models/fal-ai/seedvr/upscale/image/llms.txt", checked: PRICES_CHECKED, note: "$0.001 per megapixel" } as Source,
};

/**
 * Demo set (docs/07 §8): candidates per style (`--candidates=N`); the best by
 * auto-likeness is exported. 1 by default (`--candidates=2` fits the budget
 * for the cheaper winners — the plan shows it).
 */
export const DEMO = {
  /**
   * The demo is NOT part of B0 (owner's decision, 18.10.2026): it is left out
   * of bench:forecast and of the $17 ceiling and runs later, on request. Its
   * own guard: the TOTAL spend (B0 + demo, with the margin) stays within the
   * fal.ai balance of $20. Its calls are recorded in spend.json as phase "demo".
   */
  ceilingUsd: 20,
  candidatesPerStyle: 1,
  size: { width: 1080, height: 1350 },
};

/** What fal.ai documents about storage of uploaded files (docs/07 §9) — quoted in the report. */
export const FAL_RETENTION_NOTE =
  "fal.ai (docs: Media Expiration, checked 2026-10-18): uploaded inputs and generated outputs live on the fal CDN; retention is configurable per request with the X-Fal-Object-Lifecycle-Preference header — the bench sets 1 day. Request inputs/outputs are also kept in request history for 90 days by default; the bench sends X-Fal-Store-IO: 0 so they are not stored there. Expired files are permanently deleted.";
