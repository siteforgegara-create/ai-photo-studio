/**
 * Enter the actual total from the fal.ai Usage page (free, local):
 *
 *   npm run bench:reconcile -- --actual=1.61
 *
 * Stored in bench/runs/spend.json as "reconciled". From then on the ceiling is
 * checked against max(counted × margin, actual + calls since then × margin).
 */
import { COST_SAFETY_FACTOR, SPEND_CEILING_USD } from "./config";
import { fail, parseCommonArgs, printSpent } from "./lib/cli";
import { formatUsd, reconcile } from "./lib/cost";
import { loadLedger, saveLedger } from "./lib/ledger";

const args = parseCommonArgs();
if (args.actual === undefined || !Number.isFinite(args.actual)) fail("Pass the total from fal.ai → Usage: npm run bench:reconcile -- --actual=1.61");
const before = loadLedger();
const after = reconcile(before, args.actual!);
const diff = after.reconciled!.actualUsd - before.spentUsd;
console.log(`Counted at list prices: ${formatUsd(before.spentUsd)}; fal.ai Usage: ${formatUsd(after.reconciled!.actualUsd)} (${diff >= 0 ? "+" : ""}${formatUsd(diff)}${before.spentUsd ? `, ${((diff / before.spentUsd) * 100).toFixed(0)}%` : ""}).`);
if (before.spentUsd && after.reconciled!.actualUsd / before.spentUsd > COST_SAFETY_FACTOR) {
  console.log(`⚠ The real bill is more than ×${COST_SAFETY_FACTOR} the list prices — raise COST_SAFETY_FACTOR or the prices in bench/config.ts before the next paid step.`);
}
if (args.dryRun) {
  console.log("Dry run — spend.json not changed.");
  process.exit(0);
}
saveLedger(after);
console.log(`Saved to bench/runs/spend.json (ceiling ${formatUsd(SPEND_CEILING_USD)}).`);
printSpent(after);
