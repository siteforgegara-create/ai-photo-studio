// @vitest-environment node
import { describe, expect, it } from "vitest";
import { emptyLedger, reconcile, record, type PlanItem } from "./cost";
import { chooseCuts, cutOptions, forecast, type CutOption, type ForecastStep } from "./forecast";

const items = (group: string, n: number, usd: number): PlanItem[] => Array.from({ length: n }, (_, i) => ({ key: `${group}-${i}`, group, label: `${group} ${i}`, costUsd: usd }));

describe("B0 forecast", () => {
  const spent = reconcile(record(emptyLedger(), { at: "x", key: "smoke", usd: 1.44, status: "ok" }), 1.61);

  it("shows list price and with margin per step, from the effective spend", () => {
    const f = forecast(spent, [{ name: "run", items: items("run", 10, 1) }], 17);
    expect(f.rows).toEqual([{ name: "run", calls: 10, listUsd: 10, marginUsd: 12 }]);
    expect(f.spentEffectiveUsd).toBe(1.728);
    expect(f.totalMarginUsd).toBe(13.728);
    expect(f.fits).toBe(true);
  });

  it("cuts in order: ablation 4 → 2, then demo candidates; the main run is never cut by the options", () => {
    const build = (o: CutOption): ForecastStep[] => [
      { name: "run", items: items("run", 10, 1) }, // $12 with margin
      { name: "ablation", items: items("abl", o.ablationSubjects * 4, 0.0616) },
      { name: "demo", items: items("demo", 12 * o.demoCandidates + 5, 0.05) },
    ];
    const opts = cutOptions({ ablationSubjects: 4, demoCandidates: 2 }, 2);
    expect(opts).toEqual([
      { ablationSubjects: 4, demoCandidates: 2 },
      { ablationSubjects: 2, demoCandidates: 2 },
      { ablationSubjects: 2, demoCandidates: 1 },
    ]);
    // Ceiling 15.75: 1.728 + 12 + ablation + demo. 4/2 → 16.40, 2/2 → 15.81, 2/1 → 15.09.
    const c = chooseCuts(opts, build, spent, 15.75);
    expect(c.option).toEqual({ ablationSubjects: 2, demoCandidates: 1 });
    expect(c.applied).toEqual(["ablation nb21-noattr: 4 → 2 subjects", "demo candidates per style: 2 → 1"]);
    expect(c.forecast.fits).toBe(true);
  });

  it("stops at the first option that fits", () => {
    const build = (o: CutOption): ForecastStep[] => [{ name: "abl", items: items("abl", o.ablationSubjects * 4, 0.1) }];
    const c = chooseCuts(cutOptions({ ablationSubjects: 4, demoCandidates: 1 }, 2), build, emptyLedger(), 17);
    expect(c.option.ablationSubjects).toBe(4);
    expect(c.applied).toEqual([]);
  });

  it("when nothing fits, returns the most reduced option and the calls the ceiling will refuse (last first)", () => {
    const build = (o: CutOption): ForecastStep[] => [
      { name: "run", items: items("run", 12, 1) }, // 1.728 + 14.40 = 16.13
      { name: "demo", items: items("demo", 12 * o.demoCandidates, 0.1) },
    ];
    const c = chooseCuts(cutOptions({ ablationSubjects: 4, demoCandidates: 1 }, 2), build, spent, 17);
    expect(c.forecast.fits).toBe(false);
    expect(c.forecast.cut.every((i) => i.group === "demo")).toBe(true);
  });
});
