/**
 * Pure cost maths: price of one call, plan totals and the hard ceiling.
 * No I/O here — unit-tested in cost.test.ts.
 */
import { COST_SAFETY_FACTOR, type Pricing } from "../config";

export type Size = { width: number; height: number };

/** 1 MP as fal counts it for FLUX.2: its examples ($0.03 for 1024×1024, $0.045 for 1920×1080) only add up with 1024×1024 px. */
export const MP_FLUX = 1024 * 1024;
/** Other per-MP prices have no worked example — 1,000,000 px is the conservative reading (bills more, never less). */
export const MP_DECIMAL = 1_000_000;

/** Megapixels rounded up to a whole megapixel (fal bills per started MP). */
export function billedMp(size: Size, unit = MP_DECIMAL): number {
  return Math.max(1, Math.ceil((size.width * size.height) / unit - 1e-9));
}

/**
 * Price of one call.
 * - `output`: size of each generated image (per-MP pricing).
 * - `inputs`: sizes of input images (FLUX.2 bills them).
 * - `images`: number of images the call returns.
 * - `steps`: training steps.
 */
export function callCost(
  pricing: Pricing,
  opts: { output?: Size; inputs?: Size[]; images?: number; steps?: number } = {},
): number {
  const images = opts.images ?? 1;
  switch (pricing.kind) {
    case "per_image":
      return round(pricing.usd * images);
    case "per_mp": {
      if (!opts.output) throw new Error("per_mp pricing needs an output size");
      return round(pricing.usd * billedMp(opts.output) * images);
    }
    case "flux2": {
      if (!opts.output) throw new Error("flux2 pricing needs an output size");
      const outMp = billedMp(opts.output, MP_FLUX);
      const inMp = (opts.inputs ?? []).reduce((sum, s) => sum + billedMp(s, MP_FLUX), 0);
      const perImage = pricing.firstOutputMpUsd + pricing.extraMpUsd * (outMp - 1 + inMp);
      return round(perImage * images);
    }
    case "tokens": {
      const inputs = opts.inputs?.length ?? 0;
      return round((pricing.outputImageUsd + pricing.overheadUsd + pricing.inputImageUsd * inputs) * images);
    }
    case "training": {
      const steps = opts.steps ?? pricing.baseSteps;
      return round((pricing.usd * steps) / pricing.baseSteps);
    }
  }
}

/** Rounds to 1/10000 of a dollar to keep sums stable. */
export function round(usd: number): number {
  return Math.round(usd * 10_000) / 10_000;
}

export type PlanItem = {
  /** Stable cache key: <subject>/<model>/<style>-<n> etc. */
  key: string;
  group: string;
  label: string;
  costUsd: number;
  /** Already done (cached) — costs nothing now. */
  cached?: boolean;
};

export type PlanSummary = {
  items: number;
  toRun: number;
  cached: number;
  costUsd: number;
  byGroup: { group: string; calls: number; costUsd: number }[];
};

export function summarize(items: PlanItem[]): PlanSummary {
  const todo = items.filter((i) => !i.cached);
  const groups = new Map<string, { calls: number; costUsd: number }>();
  for (const i of todo) {
    const g = groups.get(i.group) ?? { calls: 0, costUsd: 0 };
    g.calls += 1;
    g.costUsd = round(g.costUsd + i.costUsd);
    groups.set(i.group, g);
  }
  return {
    items: items.length,
    toRun: todo.length,
    cached: items.length - todo.length,
    costUsd: round(todo.reduce((s, i) => s + i.costUsd, 0)),
    byGroup: [...groups.entries()].map(([group, v]) => ({ group, ...v })),
  };
}

// ─── Ceiling ────────────────────────────────────────────────────────────────

export type Ledger = {
  /** Counted at list prices and recorded, across every run. */
  spentUsd: number;
  entries: { at: string; key: string; usd: number; status: "ok" | "failed-charged" | "failed-free"; requestId?: string }[];
  /**
   * Actual spend from the fal.ai Usage page, entered by the owner
   * (npm run bench:reconcile -- --actual=1.61). `countedUsd` = what the ledger
   * had counted at that moment, so later calls are added on top of `actualUsd`.
   */
  reconciled?: { actualUsd: number; countedUsd: number; at: string };
};

export function emptyLedger(): Ledger {
  return { spentUsd: 0, entries: [] };
}

/** List price × safety factor (fal's real bill ran ~12% above list prices in the smoke test). */
export function withMargin(usd: number, factor = COST_SAFETY_FACTOR): number {
  return round(usd * factor);
}

/**
 * What the ceiling is checked against:
 * max(counted × factor, reconciled actual + (counted since reconcile) × factor).
 */
export function effectiveSpent(ledger: Ledger, factor = COST_SAFETY_FACTOR): number {
  const counted = ledger.spentUsd * factor;
  const r = ledger.reconciled;
  const fromActual = r ? r.actualUsd + Math.max(0, ledger.spentUsd - r.countedUsd) * factor : 0;
  return round(Math.max(counted, fromActual));
}

/**
 * A call may start only if the effective spend, plus everything in flight
 * (`reservedUsd`, list prices), plus this call — both with the safety
 * factor — stays within the ceiling.
 */
export function canSpend(ledger: Ledger, reservedUsd: number, costUsd: number, ceilingUsd: number, factor = COST_SAFETY_FACTOR): boolean {
  return round(effectiveSpent(ledger, factor) + (reservedUsd + costUsd) * factor) <= ceilingUsd + 1e-9;
}

/** Ceiling minus the effective spend (in margin dollars). */
export function remaining(ledger: Ledger, ceilingUsd: number, factor = COST_SAFETY_FACTOR): number {
  return round(Math.max(0, ceilingUsd - effectiveSpent(ledger, factor)));
}

/**
 * Of the planned items (in order), which fit under the ceiling (each item
 * costs list price × factor). Used by the plan printout and the B0 forecast.
 */
export function fitUnderCeiling(items: PlanItem[], ledger: Ledger, ceilingUsd: number, factor = COST_SAFETY_FACTOR): { fit: PlanItem[]; cut: PlanItem[] } {
  let budget = remaining(ledger, ceilingUsd, factor);
  const fit: PlanItem[] = [];
  const cut: PlanItem[] = [];
  for (const item of items) {
    if (item.cached) {
      fit.push(item);
      continue;
    }
    const cost = item.costUsd * factor;
    if (cost <= budget + 1e-9) {
      fit.push(item);
      budget = round(budget - cost);
    } else {
      cut.push(item);
    }
  }
  return { fit, cut };
}

/** Records a finished call. Failures with an unknown outcome are counted as charged (conservative). */
export function record(ledger: Ledger, entry: Ledger["entries"][number]): Ledger {
  const charged = entry.status === "failed-free" ? 0 : entry.usd;
  return { ...ledger, spentUsd: round(ledger.spentUsd + charged), entries: [...ledger.entries, { ...entry, usd: charged }] };
}

/** Stores the actual fal.ai total; the ceiling then counts from it. */
export function reconcile(ledger: Ledger, actualUsd: number, at = new Date().toISOString()): Ledger {
  if (!(actualUsd >= 0) || !Number.isFinite(actualUsd)) throw new Error(`--actual must be a dollar amount, got ${actualUsd}`);
  return { ...ledger, reconciled: { actualUsd: round(actualUsd), countedUsd: ledger.spentUsd, at } };
}

export function formatUsd(usd: number): string {
  return `$${usd.toFixed(usd < 1 && usd > 0 ? 3 : 2)}`;
}
