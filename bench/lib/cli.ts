import { createInterface } from "node:readline/promises";
import { parseArgs } from "node:util";
import { demoSpent, effectiveSpent, fitUnderCeiling, formatUsd, itemMargin, remaining, summarize, type Ledger, type PlanItem } from "./cost";
import { B0_BUDGET, type Budget } from "./ledger";

/** Every bench command imports this module: print errors as one clear line instead of a stack trace. */
function onFatal(e: unknown) {
  const message = e instanceof Error ? e.message : String(e);
  console.error(`\n✖ ${message}`);
  if (process.env.BENCH_DEBUG && e instanceof Error) console.error(e.stack);
  process.exit(1);
}
process.on("uncaughtException", onFatal);
process.on("unhandledRejection", onFatal);

export type CommonArgs = {
  dryRun: boolean;
  yes: boolean;
  run?: string;
  only?: string[];
  subjects?: string[];
  model?: string;
  editModel?: string;
  persona?: string;
  loraSubject?: string;
  noLora: boolean;
  candidates?: number;
  /** bench:personas — regenerate these personas from scratch. */
  redo?: string[];
  /** bench:run — leave the "Subject details" line out of every prompt (and skip the ablation). */
  noAttrs: boolean;
  /** bench:run — ablation subjects (default: decided by the B0 forecast, 4 or 2). */
  ablationSubjects?: number;
  /** bench:reconcile — actual total from the fal.ai Usage page. */
  actual?: number;
};

export function parseCommonArgs(argv = process.argv.slice(2)): CommonArgs {
  const { values } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      "dry-run": { type: "boolean", default: false },
      yes: { type: "boolean", short: "y", default: false },
      run: { type: "string" },
      only: { type: "string" },
      subjects: { type: "string" },
      model: { type: "string" },
      "edit-model": { type: "string" },
      persona: { type: "string" },
      "lora-subject": { type: "string" },
      "no-lora": { type: "boolean", default: false },
      candidates: { type: "string" },
      redo: { type: "string" },
      "no-attrs": { type: "boolean", default: false },
      "ablation-subjects": { type: "string" },
      actual: { type: "string" },
    },
  });
  const list = (v?: string) => (v ? v.split(",").map((s) => s.trim()).filter(Boolean) : undefined);
  return {
    dryRun: Boolean(values["dry-run"]),
    yes: Boolean(values.yes),
    run: values.run,
    only: list(values.only),
    subjects: list(values.subjects),
    model: values.model,
    editModel: values["edit-model"],
    persona: values.persona,
    loraSubject: values["lora-subject"],
    noLora: Boolean(values["no-lora"]),
    candidates: values.candidates ? Math.max(1, Math.min(4, Number(values.candidates) || 1)) : undefined,
    redo: list(values.redo),
    noAttrs: Boolean(values["no-attrs"]),
    ablationSubjects: values["ablation-subjects"] ? Math.max(0, Math.min(4, Number(values["ablation-subjects"]) || 0)) : undefined,
    actual: values.actual !== undefined ? Number(values.actual.replace(/[$,\s]/g, "")) : undefined,
  };
}

/**
 * Prints the plan (calls × prices = total) and what fits under the ceiling.
 * Returns the items that may run.
 */
export function printPlan(title: string, items: PlanItem[], ledger: Ledger, budget: Budget = B0_BUDGET): PlanItem[] {
  const s = summarize(items);
  const { fit, cut } = fitUnderCeiling(items, ledger, budget.ceilingUsd, budget.scope);
  const margins = new Map<string, Set<number>>();
  for (const i of items.filter((i) => !i.cached)) margins.set(i.group, (margins.get(i.group) ?? new Set()).add(itemMargin(i)));
  console.log(`\n=== ${title} ===   (list price → with the model's safety margin)`);
  if (s.byGroup.length) {
    const w = Math.max(...s.byGroup.map((g) => g.group.length), 10);
    for (const g of s.byGroup) {
      const m = [...(margins.get(g.group) ?? [])].map((x) => `×${x}`).join("/");
      console.log(`  ${g.group.padEnd(w)}  ${String(g.calls).padStart(4)} calls  ${formatUsd(g.costUsd).padStart(9)} → ${formatUsd(g.marginUsd).padStart(8)}  ${m}`);
    }
  }
  console.log(`  ${"-".repeat(48)}`);
  console.log(`  To run: ${s.toRun} calls, list price ${formatUsd(s.costUsd)}, with margin ${formatUsd(s.marginUsd)}   (already done, skipped: ${s.cached})`);
  printSpent(ledger, budget);
  if (cut.length) {
    const cutUsd = cut.reduce((a, i) => a + i.costUsd, 0);
    const cutMargin = cut.reduce((a, i) => a + i.costUsd * itemMargin(i), 0);
    console.log(`  ⚠ Ceiling: ${cut.length} calls (list ${formatUsd(cutUsd)}, with margin ${formatUsd(cutMargin)}) do not fit and will NOT run:`);
    for (const i of cut.slice(0, 8)) console.log(`     - ${i.label} (${formatUsd(i.costUsd)})`);
    if (cut.length > 8) console.log(`     … and ${cut.length - 8} more`);
  }
  return fit.filter((i) => !i.cached);
}

/** "Spent so far" line: counted at list prices, the reconciled fal.ai total, and what the ceiling uses. */
export function printSpent(ledger: Ledger, budget: Budget = B0_BUDGET) {
  const r = ledger.reconciled;
  const demo = demoSpent(ledger);
  const counted = `counted ${formatUsd(ledger.spentUsd)} at list prices${demo ? ` (of it demo ${formatUsd(demo)})` : ""}`;
  const actual = r ? `; fal.ai Usage ${formatUsd(r.actualUsd)} (entered ${r.at.slice(0, 10)}, when ${formatUsd(r.countedUsd)} was counted)` : "";
  console.log(`  Spent so far (all runs): ${counted}${actual}`);
  const eff = effectiveSpent(ledger, budget.scope);
  console.log(`  ${budget.label}: ${formatUsd(eff)} of ${formatUsd(budget.ceilingUsd)} used with margins — left ${formatUsd(remaining(ledger, budget.ceilingUsd, budget.scope))}${budget.scope === "b0" && demo ? " (demo calls not counted)" : ""}`);
}

export async function confirm(args: CommonArgs, question = "Proceed?"): Promise<boolean> {
  if (args.yes) return true;
  if (!process.stdin.isTTY) {
    console.log("No terminal to confirm in — re-run with --yes to proceed.");
    return false;
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question(`${question} (y/N) `)).trim().toLowerCase();
  rl.close();
  return answer === "y" || answer === "yes";
}

export function fail(message: string): never {
  console.error(`\n✖ ${message}`);
  process.exit(1);
}
