/**
 * B0 forecast maths — pure, tested in forecast.test.ts.
 *
 * Steps are planned in the order they run; every price gets its model's
 * margin; the starting point is effectiveSpent() (Σ counted × margin, or the
 * reconciled fal.ai total + later calls × margin). When the plan does not fit
 * under the ceiling, the options are tried in order (for B0: the ablation
 * nb21-noattr 4 → 2 subjects, docs/07 §11). The main run is never cut;
 * whatever still does not fit is reported, never silently dropped.
 */
import { effectiveSpent, fitUnderCeiling, round, summarize, type Ledger, type PlanItem } from "./cost";

export type ForecastStep = { name: string; items: PlanItem[] };

export type ForecastRow = { name: string; calls: number; listUsd: number; marginUsd: number };

export type Forecast = {
  spentCountedUsd: number;
  spentEffectiveUsd: number;
  reconciledUsd?: number;
  rows: ForecastRow[];
  toRunListUsd: number;
  toRunMarginUsd: number;
  totalMarginUsd: number;
  ceilingUsd: number;
  fits: boolean;
  cut: PlanItem[];
};

export function forecast(ledger: Ledger, steps: ForecastStep[], ceilingUsd: number): Forecast {
  const rows = steps.map((s) => {
    const sum = summarize(s.items);
    return { name: s.name, calls: sum.toRun, listUsd: sum.costUsd, marginUsd: sum.marginUsd };
  });
  const toRunListUsd = round(rows.reduce((a, r) => a + r.listUsd, 0));
  const toRunMarginUsd = round(rows.reduce((a, r) => a + r.marginUsd, 0));
  const spentEffectiveUsd = effectiveSpent(ledger);
  const { cut } = fitUnderCeiling(steps.flatMap((s) => s.items), ledger, ceilingUsd);
  return {
    spentCountedUsd: ledger.spentUsd,
    spentEffectiveUsd,
    reconciledUsd: ledger.reconciled?.actualUsd,
    rows,
    toRunListUsd,
    toRunMarginUsd,
    totalMarginUsd: round(spentEffectiveUsd + toRunMarginUsd),
    ceilingUsd,
    fits: cut.length === 0,
    cut,
  };
}

export type CutOption = { ablationSubjects: number; demoCandidates: number };

/** The cut options in order: full plan, ablation reduced, then fewer demo candidates. */
export function cutOptions(full: CutOption, reducedAblation: number): CutOption[] {
  const opts: CutOption[] = [full];
  if (reducedAblation < full.ablationSubjects) opts.push({ ablationSubjects: reducedAblation, demoCandidates: full.demoCandidates });
  const abl = Math.min(full.ablationSubjects, reducedAblation);
  for (let c = full.demoCandidates - 1; c >= 1; c--) opts.push({ ablationSubjects: abl, demoCandidates: c });
  return opts;
}

/** First option whose forecast fits; otherwise the last (most reduced) one, with what the ceiling will cut. */
export function chooseCuts(options: CutOption[], build: (o: CutOption) => ForecastStep[], ledger: Ledger, ceilingUsd: number): { option: CutOption; forecast: Forecast; applied: string[] } {
  let last: { option: CutOption; forecast: Forecast } | null = null;
  for (const option of options) {
    const f = forecast(ledger, build(option), ceilingUsd);
    last = { option, forecast: f };
    if (f.fits) break;
  }
  const first = options[0]!;
  const o = last!.option;
  const applied: string[] = [];
  if (o.ablationSubjects < first.ablationSubjects) applied.push(`ablation nb21-noattr: ${first.ablationSubjects} → ${o.ablationSubjects} subjects`);
  if (o.demoCandidates < first.demoCandidates) applied.push(`demo candidates per style: ${first.demoCandidates} → ${o.demoCandidates}`);
  return { ...last!, applied };
}
