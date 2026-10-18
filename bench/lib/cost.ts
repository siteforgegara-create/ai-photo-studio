/**
 * Pure cost maths: price of one call, plan totals and the hard ceiling.
 * No I/O here — unit-tested in cost.test.ts.
 */
import type { Pricing } from "../config";
import { marginForKey } from "./margins";

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
  /** List price. */
  costUsd: number;
  /** Safety margin; default: marginForKey(key). */
  marginFactor?: number;
  /** Already done (cached) — costs nothing now. */
  cached?: boolean;
};

export function itemMargin(item: Pick<PlanItem, "key" | "marginFactor">): number {
  return item.marginFactor ?? marginForKey(item.key);
}

/** List price × margin. */
export function withMargin(usd: number, factor: number): number {
  return round(usd * factor);
}

export type PlanSummary = {
  items: number;
  toRun: number;
  cached: number;
  costUsd: number;
  marginUsd: number;
  byGroup: { group: string; calls: number; costUsd: number; marginUsd: number }[];
};

export function summarize(items: PlanItem[]): PlanSummary {
  const todo = items.filter((i) => !i.cached);
  const groups = new Map<string, { calls: number; costUsd: number; marginUsd: number }>();
  for (const i of todo) {
    const g = groups.get(i.group) ?? { calls: 0, costUsd: 0, marginUsd: 0 };
    g.calls += 1;
    g.costUsd = round(g.costUsd + i.costUsd);
    g.marginUsd = round(g.marginUsd + i.costUsd * itemMargin(i));
    groups.set(i.group, g);
  }
  return {
    items: items.length,
    toRun: todo.length,
    cached: items.length - todo.length,
    costUsd: round(todo.reduce((s, i) => s + i.costUsd, 0)),
    marginUsd: round(todo.reduce((s, i) => s + i.costUsd * itemMargin(i), 0)),
    byGroup: [...groups.entries()].map(([group, v]) => ({ group, ...v })),
  };
}

// ─── Ceiling ────────────────────────────────────────────────────────────────

export type LedgerEntry = {
  at: string;
  key: string;
  /** List price counted for the call (0 for failures rejected at submit). */
  usd: number;
  status: "ok" | "failed-charged" | "failed-free";
  requestId?: string;
  phase?: Phase;
  /** Margin at the time of the call; older entries: marginForKey(key). */
  margin?: number;
};

export type Ledger = {
  /** Counted at list prices and recorded, across every run. */
  spentUsd: number;
  entries: LedgerEntry[];
  /**
   * Actual spend from the fal.ai Usage page, entered by the owner
   * (npm run bench:reconcile -- --actual=1.61). Calls recorded after it
   * (entries[entryCount…]) are added on top of `actualUsd` with their margin.
   * `demoUsd` = demo spend counted at that moment (left out for the B0 ceiling).
   */
  reconciled?: { actualUsd: number; countedUsd: number; at: string; demoUsd?: number; entryCount?: number };
};

/** B0 calls vs the demo set (bench:demo runs after B0, outside the $17 ceiling). Missing = "b0". */
export type Phase = "b0" | "demo";

/**
 * Which spend a ceiling looks at: "b0" — everything except demo calls (the
 * $17 B0 ceiling); "all" — everything (the demo's own guard on the total).
 */
export type Scope = "b0" | "all";

export function emptyLedger(): Ledger {
  return { spentUsd: 0, entries: [] };
}

export function entryMargin(e: LedgerEntry): number {
  return e.margin ?? marginForKey(e.key);
}

/** Counted (list price) spend of demo calls. */
export function demoSpent(ledger: Ledger): number {
  return round(ledger.entries.filter((e) => e.phase === "demo").reduce((a, e) => a + e.usd, 0));
}

function sinceReconcile(ledger: Ledger): LedgerEntry[] {
  const r = ledger.reconciled;
  if (!r) return [];
  if (r.entryCount !== undefined) return ledger.entries.slice(r.entryCount);
  return ledger.entries.filter((e) => e.at > r.at);
}

/**
 * What the ceiling is checked against:
 * max(Σ counted × margin, reconciled actual + Σ calls since then × margin).
 * Scope "b0" leaves demo calls out (from a reconciled total the demo's
 * list-price spend at that moment is subtracted — if the demo really cost
 * more, the rest stays on B0, which is the safe side).
 */
export function effectiveSpent(ledger: Ledger, scope: Scope = "b0"): number {
  const inScope = (e: LedgerEntry) => scope === "all" || e.phase !== "demo";
  const counted = ledger.entries.filter(inScope).reduce((a, e) => a + e.usd * entryMargin(e), 0);
  const r = ledger.reconciled;
  if (!r) return round(counted);
  const rDemo = scope === "b0" ? (r.demoUsd ?? 0) : 0;
  const since = sinceReconcile(ledger).filter(inScope).reduce((a, e) => a + e.usd * entryMargin(e), 0);
  return round(Math.max(counted, r.actualUsd - rDemo + since));
}

/**
 * A call may start only if the effective spend + everything in flight
 * (`reservedUsd`, with margin) + this call (`costUsd`, with margin) stays
 * within the ceiling.
 */
export function canSpend(ledger: Ledger, reservedUsd: number, costUsd: number, ceilingUsd: number, scope: Scope = "b0"): boolean {
  return round(effectiveSpent(ledger, scope) + reservedUsd + costUsd) <= ceilingUsd + 1e-9;
}

/** Ceiling minus the effective spend (in margin dollars). */
export function remaining(ledger: Ledger, ceilingUsd: number, scope: Scope = "b0"): number {
  return round(Math.max(0, ceilingUsd - effectiveSpent(ledger, scope)));
}

/**
 * Of the planned items (in order), which fit under the ceiling (each item
 * costs list price × its margin). Used by the plan printout and the forecast.
 */
export function fitUnderCeiling(items: PlanItem[], ledger: Ledger, ceilingUsd: number, scope: Scope = "b0"): { fit: PlanItem[]; cut: PlanItem[] } {
  let budget = remaining(ledger, ceilingUsd, scope);
  const fit: PlanItem[] = [];
  const cut: PlanItem[] = [];
  for (const item of items) {
    if (item.cached) {
      fit.push(item);
      continue;
    }
    const cost = item.costUsd * itemMargin(item);
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
export function record(ledger: Ledger, entry: LedgerEntry): Ledger {
  const charged = entry.status === "failed-free" ? 0 : entry.usd;
  return { ...ledger, spentUsd: round(ledger.spentUsd + charged), entries: [...ledger.entries, { ...entry, usd: charged }] };
}

/** Stores the actual fal.ai total; the ceiling then counts from it. */
export function reconcile(ledger: Ledger, actualUsd: number, at = new Date().toISOString()): Ledger {
  if (!(actualUsd >= 0) || !Number.isFinite(actualUsd)) throw new Error(`--actual must be a dollar amount, got ${actualUsd}`);
  return { ...ledger, reconciled: { actualUsd: round(actualUsd), countedUsd: ledger.spentUsd, at, demoUsd: demoSpent(ledger), entryCount: ledger.entries.length } };
}

export function formatUsd(usd: number): string {
  return `$${usd.toFixed(usd < 1 && usd > 0 ? 3 : 2)}`;
}
