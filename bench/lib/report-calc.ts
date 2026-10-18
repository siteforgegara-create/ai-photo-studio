/**
 * Report maths (docs/07 §7) — pure, tested in report.test.ts.
 * Joins auto scores, the blind ratings (via review-key) and call logs.
 */
import type { FrameScore, Rating, RatingsFile, ReviewKey } from "./types";

export type Row = FrameScore & { rating?: Rating; group?: { gender?: string; ageGroup?: string; skinTone?: string } };

export type ModelStats = {
  model: string;
  frames: number;
  autoSimilarity: number | null;
  defectRate: number;
  rated: number;
  manualSimilarity: number | null;
  manualQuality: number | null;
  sellableShare: number | null;
  /** Frames marked "sellable" in the blind review. */
  sellableCount: number;
  avgSeconds: number | null;
  costPerFrame: number | null;
  /** = cost per frame / sellable share. */
  costPerSellable: number | null;
};

export function joinRows(
  frames: FrameScore[],
  ratings: RatingsFile | null,
  key: ReviewKey | null,
  meta: Map<string, { gender?: string; ageGroup?: string; skinTone?: string }>,
): Row[] {
  const byFile = new Map<string, Rating>();
  if (ratings && key) for (const [id, r] of Object.entries(ratings.ratings)) if (key[id]) byFile.set(key[id]!.file, r);
  return frames.map((f) => ({ ...f, rating: byFile.get(f.file), group: meta.get(f.subject) }));
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function statsFor(model: string, rows: Row[]): ModelStats {
  const rs = rows.filter((r) => r.model === model);
  const rated = rs.filter((r) => r.rating?.similarity && r.rating?.quality);
  const sellable = rated.length ? rated.filter((r) => r.rating!.sellable).length / rated.length : null;
  const costs = rs.map((r) => r.usd).filter((v): v is number => typeof v === "number");
  const costPerFrame = mean(costs);
  return {
    model,
    frames: rs.length,
    autoSimilarity: mean(rs.map((r) => r.similarity).filter((v): v is number => v !== null)),
    defectRate: rs.length ? rs.filter((r) => r.defect).length / rs.length : 0,
    rated: rated.length,
    manualSimilarity: mean(rated.map((r) => r.rating!.similarity!)),
    manualQuality: mean(rated.map((r) => r.rating!.quality!)),
    sellableShare: sellable,
    sellableCount: rated.filter((r) => r.rating!.sellable).length,
    avgSeconds: mean(rs.map((r) => r.ms).filter((v): v is number => typeof v === "number").map((ms) => ms / 1000)),
    costPerFrame,
    costPerSellable: costPerFrame !== null && sellable ? costPerFrame / sellable : null,
  };
}

export function allStats(rows: Row[]): ModelStats[] {
  return [...new Set(rows.map((r) => r.model))].sort().map((m) => statsFor(m, rows));
}

export type ThresholdRow = { threshold: number; badRemoved: number; goodKept: number; framesKept: number };

/**
 * For candidate auto-likeness thresholds: share of frames rated similarity ≤ 2
 * that would be filtered out, and share of frames rated ≥ 4 that survive.
 */
export function thresholdTable(rows: Row[], candidates?: number[]): ThresholdRow[] {
  const rated = rows.filter((r) => r.rating?.similarity && r.similarity !== null);
  const bad = rated.filter((r) => r.rating!.similarity! <= 2);
  const good = rated.filter((r) => r.rating!.similarity! >= 4);
  const ts = candidates ?? [...new Set(rated.map((r) => Math.floor(r.similarity! * 100) / 100))].sort((a, b) => a - b);
  return ts.map((t) => ({
    threshold: t,
    badRemoved: bad.length ? bad.filter((r) => r.similarity! < t).length / bad.length : 1,
    goodKept: good.length ? good.filter((r) => r.similarity! >= t).length / good.length : 1,
    framesKept: rated.length ? rated.filter((r) => r.similarity! >= t).length / rated.length : 1,
  }));
}

/** Lowest threshold that removes ≥ `target` of the frames humans rated ≤ 2. */
export function recommendThreshold(rows: Row[], target = 0.9): ThresholdRow | null {
  return thresholdTable(rows).find((t) => t.badRemoved >= target) ?? null;
}

/**
 * Max auto-likeness threshold "against obvious rejects": the highest value that
 * still keeps ≥ `keep` (95%) of the frames humans rated likeness ≥ 4. It only
 * cuts what is clearly worse than every good frame. null below `minGood` good frames.
 */
export function safeThreshold(rows: Row[], keep = 0.95, minGood = 5): (ThresholdRow & { goodFrames: number }) | null {
  const rated = rows.filter((r) => r.rating?.similarity && r.similarity !== null);
  const good = rated.filter((r) => r.rating!.similarity! >= 4).map((r) => r.similarity!).sort((a, b) => a - b);
  if (good.length < minGood) return null;
  const drop = Math.floor((1 - keep) * good.length + 1e-9);
  const threshold = Math.floor(good[drop]! * 1000) / 1000; // floored, so the frame at the cut stays kept
  const row = thresholdTable(rows, [threshold])[0]!;
  return { ...row, goodFrames: good.length };
}

/** Minimum sellable frames before a model can be recommended. */
export const MIN_SELLABLE = 3;

/** Models that may be recommended: at least MIN_SELLABLE sellable frames in the blind review. */
export function eligibleForShoot(stats: ModelStats[], min = MIN_SELLABLE): ModelStats[] {
  return stats.filter((s) => s.sellableCount >= min);
}

/** Ranking for the shoot model: share of sellable frames on real people first, then cost per sellable frame. */
export function rankForShoot(stats: ModelStats[]): ModelStats[] {
  return [...stats]
    .filter((s) => s.model !== "lora")
    .sort((a, b) => {
      const sa = a.sellableShare ?? -1;
      const sb = b.sellableShare ?? -1;
      if (Math.abs(sa - sb) > 0.05) return sb - sa;
      if (a.sellableShare === null && b.sellableShare === null) return (b.autoSimilarity ?? 0) - (a.autoSimilarity ?? 0);
      return (a.costPerSellable ?? Infinity) - (b.costPerSellable ?? Infinity);
    });
}

/**
 * Edits keep one finished photo and change a detail, so likeness drift matters
 * less than price: the cheapest model whose manual likeness is within 0.3 of the best.
 */
export function pickForEdits(stats: ModelStats[]): ModelStats | null {
  const usable = stats.filter((s) => s.model !== "lora" && s.costPerFrame !== null);
  if (!usable.length) return null;
  const metric = (s: ModelStats) => s.manualSimilarity ?? (s.autoSimilarity ?? 0) * 5;
  const best = Math.max(...usable.map(metric));
  return usable.filter((s) => metric(s) >= best - 0.3).sort((a, b) => a.costPerFrame! - b.costPerFrame!)[0] ?? null;
}

export function percentile(xs: number[], p: number): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]!;
}
