// @vitest-environment node
import { describe, expect, it } from "vitest";
import { LORA, MODELS, OUTPUT, PERSONAS, SPEND_CEILING_USD, UPSCALE } from "../config";
import type { Pricing } from "../config";
import { billedMp, callCost, MP_FLUX, canSpend, effectiveSpent, emptyLedger, fitUnderCeiling, reconcile, record, remaining, summarize, withMargin, type PlanItem } from "./cost";
import { COST_SAFETY_FACTOR } from "../config";
import { frameCost, loraFrameCost, loraTrainCost, PLANNED_SELFIE_SIZE } from "./models";

describe("callCost", () => {
  it("bills started megapixels", () => {
    expect(billedMp({ width: 1024, height: 1024 })).toBe(2); // 1.048 decimal MP (conservative unit)
    expect(billedMp({ width: 1024, height: 1024 }, MP_FLUX)).toBe(1);
    expect(billedMp(OUTPUT)).toBe(1); // 880×1100 = 0.968 MP — stays in the first MP in either unit
    expect(billedMp({ width: 512, height: 512 })).toBe(1);
  });

  it("FLUX.2-style pricing matches the examples on fal.ai (kept for re-adding FLUX.2)", () => {
    const p: Pricing = { kind: "flux2", firstOutputMpUsd: 0.03, extraMpUsd: 0.015 };
    // fal.ai examples: 1024×1024 → $0.03, 1920×1080 → $0.045, 512×512 → $0.03
    expect(callCost(p, { output: { width: 1024, height: 1024 } })).toBe(0.03);
    expect(callCost(p, { output: { width: 512, height: 512 } })).toBe(0.03);
    expect(callCost(p, { output: { width: 1920, height: 1080 } })).toBe(0.045);
    // + every input image billed per started megapixel
    expect(callCost(p, { output: OUTPUT, inputs: [PLANNED_SELFIE_SIZE, PLANNED_SELFIE_SIZE] })).toBe(0.06);
  });

  it("per-image models and refs limit", () => {
    const refs = Array.from({ length: 6 }, () => PLANNED_SELFIE_SIZE);
    expect(frameCost(MODELS.nb21, refs)).toBe(0.0616); // tokens: 0.0396 out + 6 × 0.002 in + 0.01 overhead
    expect(frameCost(MODELS.nb21, refs.slice(0, 2))).toBeGreaterThanOrEqual(0.044); // ≥ fal's measured 2-input 1K edit
    expect(frameCost(MODELS.nbpro, refs)).toBe(0.15);
    expect(frameCost(MODELS.seedream, refs)).toBe(0.04);
    expect(frameCost(MODELS.flux3, refs)).toBe(0.048); // flat 1k tier
  });

  it("LoRA training scales with steps; generation per MP", () => {
    expect(loraTrainCost()).toBe(2);
    expect(callCost(LORA.trainPricing, { steps: 500 })).toBe(1);
    expect(loraFrameCost()).toBe(0.035);
  });

  it("personas (Qwen) and upscale", () => {
    expect(callCost(PERSONAS.referencePricing, { output: PERSONAS.referenceSize })).toBe(0.02); // 864×1088 < 1 MP
    expect(callCost(PERSONAS.selfiePricing, { output: PERSONAS.selfieSize })).toBe(0.03); // 864×1152 < 1 MP
    expect(callCost(UPSCALE.pricing, { output: UPSCALE.plannedOutput })).toBe(0.019);
  });
});

describe("plan and ceiling", () => {
  const items: PlanItem[] = [
    { key: "a", group: "g1", label: "a", costUsd: 5 },
    { key: "b", group: "g1", label: "b", costUsd: 5, cached: true },
    { key: "c", group: "g2", label: "c", costUsd: 7 },
    { key: "d", group: "g2", label: "d", costUsd: 6 },
  ];

  it("summarizes only what still has to run", () => {
    const s = summarize(items);
    expect(s).toMatchObject({ items: 4, toRun: 3, cached: 1, costUsd: 18 });
    expect(s.byGroup).toEqual([
      { group: "g1", calls: 1, costUsd: 5 },
      { group: "g2", calls: 2, costUsd: 13 },
    ]);
  });

  it("cuts calls that would cross the $17 ceiling", () => {
    const { fit, cut } = fitUnderCeiling(items, emptyLedger(), SPEND_CEILING_USD);
    expect(fit.map((i) => i.key)).toEqual(["a", "b", "c"]);
    expect(cut.map((i) => i.key)).toEqual(["d"]);
  });

  it("counts what was already spent in earlier runs (list prices, factor 1)", () => {
    const ledger = record(emptyLedger(), { at: "x", key: "old", usd: 10, status: "ok" });
    const { cut } = fitUnderCeiling(items, ledger, SPEND_CEILING_USD, 1);
    expect(cut.map((i) => i.key)).toEqual(["c", "d"]);
  });

  it("allows exactly reaching the ceiling, never crossing it (factor 1)", () => {
    const ledger = record(emptyLedger(), { at: "x", key: "k", usd: 16.9, status: "ok" });
    expect(canSpend(ledger, 0, 0.1, 17, 1)).toBe(true);
    expect(canSpend(ledger, 0, 0.1001, 17, 1)).toBe(false);
    expect(canSpend(ledger, 0.05, 0.08, 17, 1)).toBe(false); // in-flight reservations count
  });

  it("free failures do not count, unknown failures do", () => {
    let l = record(emptyLedger(), { at: "x", key: "a", usd: 0.08, status: "failed-free" });
    expect(l.spentUsd).toBe(0);
    l = record(l, { at: "x", key: "b", usd: 0.08, status: "failed-charged" });
    expect(l.spentUsd).toBe(0.08);
  });

  it("the default plan (3 real + 5 synthetic) leaves room for the demo under $17", () => {
    const refs = Array.from({ length: 6 }, () => PLANNED_SELFIE_SIZE);
    const perSubject = (["nb21", "nbpro", "seedream", "flux3"] as const).reduce((s, k) => s + frameCost(MODELS[k], refs) * 4, 0);
    const run = 8 * perSubject + loraTrainCost() + 4 * loraFrameCost();
    const personas = 5 * (0.02 + 6 * 0.03);
    const upscale = 3 * callCost(UPSCALE.pricing, { output: UPSCALE.plannedOutput });
    const demoNbPro = 17 * 0.15; // most expensive winner
    expect(Math.round(run * 100) / 100).toBe(11.73);
    expect(run + personas + upscale + demoNbPro).toBeLessThanOrEqual(SPEND_CEILING_USD);
  });
});

describe("safety margin and reconciliation", () => {
  it("default factor is 1.2 and applies to every planned price", () => {
    expect(COST_SAFETY_FACTOR).toBe(1.2);
    expect(withMargin(10)).toBe(12);
    // $14 counted → $16.80 with margin: a $0.15 call ($0.18) still fits, $0.20 ($0.24) does not.
    const l = record(emptyLedger(), { at: "x", key: "k", usd: 14, status: "ok" });
    expect(effectiveSpent(l)).toBe(16.8);
    expect(canSpend(l, 0, 0.15, 17)).toBe(true);
    expect(canSpend(l, 0, 0.2, 17)).toBe(false);
  });

  it("ceiling uses max(counted × 1.2, reconciled + later calls × 1.2)", () => {
    let l = record(emptyLedger(), { at: "x", key: "smoke", usd: 1.44, status: "ok" });
    expect(effectiveSpent(l)).toBe(1.728);
    l = reconcile(l, 1.61, "2026-10-18T10:00:00Z");
    expect(l.reconciled).toEqual({ actualUsd: 1.61, countedUsd: 1.44, at: "2026-10-18T10:00:00Z" });
    expect(effectiveSpent(l)).toBe(1.728); // 1.44 × 1.2 > 1.61
    l = record(l, { at: "y", key: "run", usd: 1, status: "ok" });
    expect(effectiveSpent(l)).toBe(2.928); // max(2.44 × 1.2 = 2.928, 1.61 + 1 × 1.2 = 2.81)
    const worse = reconcile(record(emptyLedger(), { at: "x", key: "k", usd: 1, status: "ok" }), 1.5);
    expect(effectiveSpent(worse)).toBe(1.5); // actual above counted × 1.2 → actual wins
    expect(remaining(worse, 17)).toBe(15.5);
  });

  it("rejects a bad --actual", () => {
    expect(() => reconcile(emptyLedger(), Number.NaN)).toThrow();
    expect(() => reconcile(emptyLedger(), -1)).toThrow();
  });

  it("the plan cut-off counts every item with the margin", () => {
    const items: PlanItem[] = [
      { key: "a", group: "g", label: "a", costUsd: 7 },
      { key: "b", group: "g", label: "b", costUsd: 7 },
    ];
    // 2 × $7 → $16.80 with margin: fits; a 3rd call of $0.20 ($0.24) would cross $17 although $14.20 at list prices would not.
    expect(fitUnderCeiling(items, emptyLedger(), 17).cut).toEqual([]);
    expect(fitUnderCeiling([...items, { key: "c", group: "g", label: "c", costUsd: 0.2 }], emptyLedger(), 17).cut.map((i) => i.key)).toEqual(["c"]);
  });
});
