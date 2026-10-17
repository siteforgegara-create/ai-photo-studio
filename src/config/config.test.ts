import { describe, expect, it } from "vitest";
import { creditPacks, editCostPerVariant, formatPrice, quoteEdit, shootPacks } from "./packs";
import { editTools } from "./edit-tools";
import { shootStyles } from "./styles";
import { countUseCaseWords, useCases } from "./use-cases";
import { allDemoAssets, demoManifest, getDemoPair } from "./demo-manifest";
import { rejectReasons, selfieCheckConfig, selfieReasonCopy } from "./selfie-check";
import { brand } from "./brand";

describe("packs (M2–M4)", () => {
  it("has the three shoot packs with decided prices and volumes", () => {
    expect(shootPacks.map((p) => [p.id, p.priceUsd, p.photos, p.styles, p.editCredits])).toEqual([
      ["essential", 29, 20, 2, 10],
      ["professional", 49, 50, 5, 30],
      ["executive", 79, 100, "all", 80],
    ]);
    expect(shootPacks.filter((p) => p.popular).map((p) => p.id)).toEqual(["professional"]);
  });
  it("credit packs are 20/60/150 with TBD prices", () => {
    expect(creditPacks.map((c) => c.credits)).toEqual([20, 60, 150]);
    expect(creditPacks.every((c) => formatPrice(c.priceUsd) === "Price to be confirmed")).toBe(true);
  });
  it("quotes edits per variant", () => {
    expect(quoteEdit("background", 2)).toEqual({ perVariant: 1, variants: 2, credits: 2 });
    expect(quoteEdit("place", 4).credits).toBe(8);
    expect(quoteEdit("crop", 4).credits).toBe(0);
  });
  it("edit tools use the M4 prices", () => {
    for (const t of editTools) expect(t.pricePerVariant).toBe(editCostPerVariant[t.id]);
    expect(editTools.map((t) => t.id)).toEqual(["background", "outfit", "retouch", "relight", "creative", "place", "crop"]);
  });
});

describe("catalogues", () => {
  it("has 12 unique styles", () => {
    expect(shootStyles).toHaveLength(12);
    expect(new Set(shootStyles.map((s) => s.id)).size).toBe(12);
  });
  it("has the 7 starter use cases with valid recommended styles", () => {
    expect(useCases.map((u) => u.slug)).toEqual(["linkedin", "resume", "real-estate-agents", "lawyers", "doctors", "speakers", "consultants"]);
    const ids = new Set(shootStyles.map((s) => s.id));
    for (const u of useCases) for (const s of u.recommendedStyles) expect(ids.has(s)).toBe(true);
  });
  it("every SEO page has ≥ 400 words, 3–5 tips, 3–4 FAQ and no invented stats (03-pages §3)", () => {
    for (const u of useCases) {
      expect(countUseCaseWords(u), u.slug).toBeGreaterThanOrEqual(400);
      expect(u.tips.length).toBeGreaterThanOrEqual(3);
      expect(u.tips.length).toBeLessThanOrEqual(5);
      expect(u.faq.length).toBeGreaterThanOrEqual(3);
      expect(u.faq.length).toBeLessThanOrEqual(4);
      const text = JSON.stringify(u);
      // CLAUDE.md §3.2: no percentages, ratings, user counts or generation times.
      expect(text, u.slug).not.toMatch(/\d+\s?%|\b\d[\d,]*\+?\s?(users|customers|professionals|reviews)\b|★|\b\d+\s?(minutes?|seconds?)\b/i);
    }
  });
  it("demo manifest only points at public/demo assets and styles that exist", () => {
    for (const a of allDemoAssets()) expect(a).toMatch(/^\/demo\/headshot\/[a-z]+\.webp$/);
    const ids = new Set(shootStyles.map((s) => s.id));
    for (const id of Object.keys(demoManifest.shoot)) expect(ids.has(id)).toBe(true);
    expect(getDemoPair("outfit", "navy-suit")).toBeNull();
    expect(getDemoPair("background", "city-bokeh")?.aligned).toBe(true);
  });
  it("selfie-check config is coherent", () => {
    expect(selfieCheckConfig.minSelfies).toBe(4);
    expect(selfieCheckConfig.maxSelfies).toBe(8);
    expect(selfieCheckConfig.brightness.warnBelow).toBeLessThan(selfieCheckConfig.brightness.warnAbove);
    expect(rejectReasons).toEqual(["no-face", "multiple-faces"]);
    expect(Object.keys(selfieReasonCopy)).toHaveLength(7);
  });
  it("brand name comes from brand.ts", () => {
    expect(brand.name).toBe("AI Photo Studio");
  });
});

describe("Studio tips", () => {
  it("every tool has 1–2 short tips without numbers or promises", () => {
    for (const t of editTools) {
      expect(t.tips.length).toBeGreaterThanOrEqual(1);
      expect(t.tips.length).toBeLessThanOrEqual(2);
      for (const tip of t.tips) {
        expect(tip).not.toMatch(/\d+\s?%|guarantee|always perfect/i);
      }
    }
  });
});
