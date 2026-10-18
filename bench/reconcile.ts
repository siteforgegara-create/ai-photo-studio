/**
 * Enter the actual total from the fal.ai Usage page (free, local):
 *
 *   npm run bench:reconcile -- --actual=1.61
 *
 * Stored in bench/runs/spend.json as "reconciled". From then on the ceiling is
 * checked against max(Σ counted × margin, actual + Σ calls since then × margin),
 * each call with its model's margin. Run it after every paid step.
 */
import { SPEND_CEILING_USD } from "./config";
import { fail, parseCommonArgs, printSpent } from "./lib/cli";
import { effectiveSpent, formatUsd, reconcile } from "./lib/cost";
import { loadLedger, saveLedger } from "./lib/ledger";

const args = parseCommonArgs();
if (args.actual === undefined || !Number.isFinite(args.actual)) fail("Pass the total from fal.ai → Usage: npm run bench:reconcile -- --actual=1.61");
const before = loadLedger();
const after = reconcile(before, args.actual!);
const diff = after.reconciled!.actualUsd - before.spentUsd;
console.log(`Counted at list prices: ${formatUsd(before.spentUsd)}; fal.ai Usage: ${formatUsd(after.reconciled!.actualUsd)} (${diff >= 0 ? "+" : ""}${formatUsd(diff)}${before.spentUsd ? `, ${((diff / before.spentUsd) * 100).toFixed(0)}%` : ""}).`);
const withMargins = effectiveSpent({ ...before, reconciled: undefined }, "all");
if (after.reconciled!.actualUsd > withMargins + 1e-9) {
  console.log(`⚠ The real bill (${formatUsd(after.reconciled!.actualUsd)}) is above the counted spend with margins (${formatUsd(withMargins)}) — check the fal.ai Usage breakdown by model and raise that model's price or marginFactor in bench/config.ts before the next paid step.`);
}
if (args.dryRun) {
  console.log("Dry run — spend.json not changed.");
  process.exit(0);
}
saveLedger(after);
console.log(`Saved to bench/runs/spend.json (ceiling ${formatUsd(SPEND_CEILING_USD)}).`);
printSpent(after);
