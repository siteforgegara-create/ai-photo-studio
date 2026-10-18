// @vitest-environment node
import { describe, expect, it } from "vitest";
import { LORA, MODELS, OUTPUT, PERSONAS, SPEND_CEILING_USD, UPSCALE } from "../config";
import type { Pricing } from "../config";
import { billedMp, callCost, MP_FLUX, canSpend, demoSpent, effectiveSpent, emptyLedger, fitUnderCeiling, reconcile, record, remaining, summarize, type PlanItem } from "./cost";
import { marginForKey } from "./margins";
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
    expect(frameCost(MODELS.flux3, refs)).toBe(0.096); // 2 MP per call × $0.048 — fal.ai Usage 2026-10-18
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
  // marginFactor 1 here: these tests are about the ceiling logic at list prices.
  const items: PlanItem[] = [
    { key: "a", group: "g1", label: "a", costUsd: 5, marginFactor: 1 },
    { key: "b", group: "g1", label: "b", costUsd: 5, marginFactor: 1, cached: true },
    { key: "c", group: "g2", label: "c", costUsd: 7, marginFactor: 1 },
    { key: "d", group: "g2", label: "d", costUsd: 6, marginFactor: 1 },
  ];

  it("summarizes only what still has to run", () => {
    const s = summarize(items);
    expect(s).toMatchObject({ items: 4, toRun: 3, cached: 1, costUsd: 18, marginUsd: 18 });
    expect(s.byGroup).toEqual([
      { group: "g1", calls: 1, costUsd: 5, marginUsd: 5 },
      { group: "g2", calls: 2, costUsd: 13, marginUsd: 13 },
    ]);
  });

  it("the B0 ceiling is $19 (owner, B0.5) and cuts calls that would cross it", () => {
    expect(SPEND_CEILING_USD).toBe(19);
    const { fit, cut } = fitUnderCeiling(items, emptyLedger(), 17);
    expect(fit.map((i) => i.key)).toEqual(["a", "b", "c"]);
    expect(cut.map((i) => i.key)).toEqual(["d"]);
  });

  it("counts what was already spent in earlier runs", () => {
    const ledger = record(emptyLedger(), { at: "x", key: "old", usd: 10, status: "ok", margin: 1 });
    const { cut } = fitUnderCeiling(items, ledger, SPEND_CEILING_USD);
    expect(cut.map((i) => i.key)).toEqual(["c", "d"]);
  });

  it("allows exactly reaching the ceiling, never crossing it", () => {
    const ledger = record(emptyLedger(), { at: "x", key: "k", usd: 16.9, status: "ok", margin: 1 });
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

  it("the default run (3 real + 5 synthetic, 4 models + LoRA): list price and with margins", () => {
    const refs = Array.from({ length: 6 }, () => PLANNED_SELFIE_SIZE);
    const keys = ["nb21", "nbpro", "seedream", "flux3"] as const;
    const list = 8 * keys.reduce((s, k) => s + frameCost(MODELS[k], refs) * 4, 0) + loraTrainCost() + 4 * loraFrameCost();
    const margin = 8 * keys.reduce((s, k) => s + frameCost(MODELS[k], refs) * 4 * MODELS[k].marginFactor, 0) + loraTrainCost() * LORA.trainMargin + 4 * loraFrameCost() * LORA.generateMargin;
    expect(Math.round(list * 100) / 100).toBe(13.26);
    expect(Math.round(margin * 100) / 100).toBe(14.09);
  });
});

describe("per-model margins, reconciliation, demo outside B0", () => {
  it("margins from the fal.ai Usage breakdown (2026-10-18)", () => {
    expect(marginForKey("synth-01/reference")).toBe(1.0); // qwen-image, confirmed
    expect(marginForKey("synth-01/selfie-3")).toBe(1.0); // qwen-image-edit-2511, confirmed
    expect(marginForKey("real-01/nb21/corporate-gray-1")).toBe(1.0); // plan above the bill
    expect(marginForKey("real-01/nb21-noattr/corporate-gray-1")).toBe(1.0);
    expect(marginForKey("real-01/flux3/corporate-gray-1")).toBe(1.0); // at $0.096, confirmed
    expect(marginForKey("real-01/nbpro/corporate-gray-1")).toBe(1.1);
    expect(marginForKey("real-01/seedream/corporate-gray-1")).toBe(1.1);
    expect(marginForKey("real-01/lora/train")).toBe(1.1);
    expect(marginForKey("real-01/lora/modern-office-2")).toBe(1.1);
    expect(marginForKey("upscale/real-01/nbpro/x.jpg")).toBe(1.2);
    expect(marginForKey("real-01/analyze/selfie-1.jpg")).toBe(1.5);
    expect(marginForKey("synth-01/analyze-colors/all")).toBe(1.5);
    expect(marginForKey("something/unknown")).toBe(1.2);
  });

  it("plan items and the cut-off use each item's margin", () => {
    const items: PlanItem[] = [
      { key: "real-01/nbpro/a-1", group: "g", label: "a", costUsd: 10 }, // ×1.1 → 11
      { key: "real-01/nb21/a-1", group: "g", label: "b", costUsd: 5.5 }, // ×1.0 → 5.5
      { key: "real-01/analyze/s.jpg", group: "g", label: "c", costUsd: 0.4 }, // ×1.5 → 0.6
    ];
    expect(summarize(items).marginUsd).toBe(17.1);
    expect(fitUnderCeiling(items, emptyLedger(), 17).cut.map((i) => i.label)).toEqual(["c"]);
  });

  it("ceiling uses max(Σ counted × margin, reconciled + Σ calls since then × margin)", () => {
    // Smoke test: personas $1.00 (×1.0), nb21 $0.2464 (×1.0), flux3 counted at the old $0.048 × 4 = $0.192 (×1.0).
    let l = record(emptyLedger(), { at: "1", key: "synth-01/reference", usd: 1, status: "ok" });
    l = record(l, { at: "2", key: "synth-01/nb21/corporate-gray-1", usd: 0.2464, status: "ok" });
    l = record(l, { at: "3", key: "synth-01/flux3/corporate-gray-1", usd: 0.192, status: "ok" });
    expect(effectiveSpent(l)).toBe(1.4384); // legacy entries: margin from the key
    l = reconcile(l, 1.61, "2026-10-18T10:00:00Z");
    expect(l.reconciled).toMatchObject({ actualUsd: 1.61, entryCount: 3, demoUsd: 0 });
    expect(effectiveSpent(l)).toBe(1.61); // the bill wins
    l = record(l, { at: "4", key: "real-01/nbpro/corporate-gray-1", usd: 1, status: "ok", margin: 1.1 });
    expect(effectiveSpent(l)).toBe(2.71); // 1.61 + 1 × 1.1
    expect(remaining(l, 17)).toBe(14.29);
  });

  it("demo calls are outside the B0 ceiling but inside the total", () => {
    let l = record(emptyLedger(), { at: "1", key: "real-01/nb21/a-1", usd: 10, status: "ok", margin: 1 });
    l = record(l, { at: "2", key: "demo/studio-white-1", usd: 3, status: "ok", margin: 1.1, phase: "demo" });
    expect(demoSpent(l)).toBe(3);
    expect(effectiveSpent(l, "b0")).toBe(10);
    expect(effectiveSpent(l, "all")).toBe(13.3);
    const r = reconcile(l, 14);
    expect(effectiveSpent(r, "b0")).toBe(11); // 14 actual − 3 demo (list) — the rest stays on B0
    expect(effectiveSpent(r, "all")).toBe(14);
  });

  it("rejects a bad --actual", () => {
    expect(() => reconcile(emptyLedger(), Number.NaN)).toThrow();
    expect(() => reconcile(emptyLedger(), -1)).toThrow();
  });
});
