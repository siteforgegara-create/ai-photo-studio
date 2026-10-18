/**
 * Pure cost maths: price of one call, plan totals and the hard ceiling.
 * No I/O here — unit-tested in cost.test.ts.
 */
import type { Pricing } from "../config";

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
  /** Spent and recorded, across every run. */
  spentUsd: number;
  entries: { at: string; key: string; usd: number; status: "ok" | "failed-charged" | "failed-free"; requestId?: string }[];
};

export function emptyLedger(): Ledger {
  return { spentUsd: 0, entries: [] };
}

/**
 * A call may start only if everything already spent, plus everything in
 * flight (`reservedUsd`), plus this call stays within the ceiling.
 */
export function canSpend(ledger: Ledger, reservedUsd: number, costUsd: number, ceilingUsd: number): boolean {
  return round(ledger.spentUsd + reservedUsd + costUsd) <= ceilingUsd + 1e-9;
}

export function remaining(ledger: Ledger, ceilingUsd: number): number {
  return round(Math.max(0, ceilingUsd - ledger.spentUsd));
}

/**
 * Of the planned items (in order), which fit under the ceiling. Used by the
 * plan printout: anything past the first item that does not fit is cut.
 */
export function fitUnderCeiling(items: PlanItem[], ledger: Ledger, ceilingUsd: number): { fit: PlanItem[]; cut: PlanItem[] } {
  let budget = remaining(ledger, ceilingUsd);
  const fit: PlanItem[] = [];
  const cut: PlanItem[] = [];
  for (const item of items) {
    if (item.cached) {
      fit.push(item);
      continue;
    }
    if (item.costUsd <= budget + 1e-9) {
      fit.push(item);
      budget = round(budget - item.costUsd);
    } else {
      cut.push(item);
    }
  }
  return { fit, cut };
}

/** Records a finished call. Failures with an unknown outcome are counted as charged (conservative). */
export function record(ledger: Ledger, entry: Ledger["entries"][number]): Ledger {
  const charged = entry.status === "failed-free" ? 0 : entry.usd;
  return { spentUsd: round(ledger.spentUsd + charged), entries: [...ledger.entries, { ...entry, usd: charged }] };
}

export function formatUsd(usd: number): string {
  return `$${usd.toFixed(usd < 1 && usd > 0 ? 3 : 2)}`;
}
