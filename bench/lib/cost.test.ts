// @vitest-environment node
import { describe, expect, it } from "vitest";
import { LORA, MODELS, OUTPUT, PERSONAS, SPEND_CEILING_USD, UPSCALE } from "../config";
import { billedMp, callCost, MP_FLUX, canSpend, emptyLedger, fitUnderCeiling, record, summarize, type PlanItem } from "./cost";
import { frameCost, loraFrameCost, loraTrainCost, PLANNED_SELFIE_SIZE } from "./models";

describe("callCost", () => {
  it("bills started megapixels", () => {
    expect(billedMp({ width: 1024, height: 1024 })).toBe(2); // 1.048 decimal MP (conservative unit)
    expect(billedMp({ width: 1024, height: 1024 }, MP_FLUX)).toBe(1);
    expect(billedMp(OUTPUT)).toBe(1); // 880×1100 = 0.968 MP — stays in the first MP in either unit
    expect(billedMp({ width: 512, height: 512 })).toBe(1);
  });

  it("FLUX.2 [pro] matches the examples on fal.ai", () => {
    const p = MODELS.flux2.pricing;
    // fal.ai examples: 1024×1024 → $0.03, 1920×1080 → $0.045, 512×512 → $0.03
    expect(callCost(p, { output: { width: 1024, height: 1024 } })).toBe(0.03);
    expect(callCost(p, { output: { width: 512, height: 512 } })).toBe(0.03);
    expect(callCost(p, { output: { width: 1920, height: 1080 } })).toBe(0.045);
    // + every input image billed per started megapixel
    expect(callCost(p, { output: OUTPUT, inputs: [PLANNED_SELFIE_SIZE, PLANNED_SELFIE_SIZE] })).toBe(0.06);
  });

  it("per-image models and refs limit", () => {
    const refs = Array.from({ length: 6 }, () => PLANNED_SELFIE_SIZE);
    expect(frameCost(MODELS.nb2, refs)).toBe(0.08);
    expect(frameCost(MODELS.nbpro, refs)).toBe(0.15);
    expect(frameCost(MODELS.seedream, refs)).toBe(0.04);
    expect(frameCost(MODELS.flux2, refs)).toBe(0.09); // 1 MP out + 4 refs × 1 MP
  });

  it("LoRA training scales with steps; generation per MP", () => {
    expect(loraTrainCost()).toBe(2);
    expect(callCost(LORA.trainPricing, { steps: 500 })).toBe(1);
    expect(loraFrameCost()).toBe(0.035);
  });

  it("personas and upscale", () => {
    expect(callCost(PERSONAS.pricing)).toBe(0.039);
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

  it("counts what was already spent in earlier runs", () => {
    const ledger = record(emptyLedger(), { at: "x", key: "old", usd: 10, status: "ok" });
    const { cut } = fitUnderCeiling(items, ledger, SPEND_CEILING_USD);
    expect(cut.map((i) => i.key)).toEqual(["c", "d"]);
  });

  it("allows exactly reaching the ceiling, never crossing it", () => {
    const ledger = record(emptyLedger(), { at: "x", key: "k", usd: 16.9, status: "ok" });
    expect(canSpend(ledger, 0, 0.1, 17)).toBe(true);
    expect(canSpend(ledger, 0, 0.1001, 17)).toBe(false);
    expect(canSpend(ledger, 0.05, 0.08, 17)).toBe(false); // in-flight reservations count
  });

  it("free failures do not count, unknown failures do", () => {
    let l = record(emptyLedger(), { at: "x", key: "a", usd: 0.08, status: "failed-free" });
    expect(l.spentUsd).toBe(0);
    l = record(l, { at: "x", key: "b", usd: 0.08, status: "failed-charged" });
    expect(l.spentUsd).toBe(0.08);
  });

  it("the default plan (3 real + 5 synthetic) leaves room for the demo under $17", () => {
    const refs = Array.from({ length: 6 }, () => PLANNED_SELFIE_SIZE);
    const perSubject = (["nb2", "nbpro", "seedream", "flux2"] as const).reduce((s, k) => s + frameCost(MODELS[k], refs) * 4, 0);
    const run = 8 * perSubject + loraTrainCost() + 4 * loraFrameCost();
    const personas = 5 * 7 * callCost(PERSONAS.pricing);
    const upscale = 3 * callCost(UPSCALE.pricing, { output: UPSCALE.plannedOutput });
    const demoNb2 = 12 * 0.08 + 5 * 0.08;
    expect(Math.round(run * 100) / 100).toBe(13.66);
    expect(run + personas + upscale + demoNb2).toBeLessThanOrEqual(SPEND_CEILING_USD);
  });
});
