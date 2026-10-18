import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { DEMO, SPEND_CEILING_USD } from "../config";
import { canSpend, effectiveSpent, emptyLedger, record, round, type Ledger, type LedgerEntry, type Phase, type Scope } from "./cost";
import { SPEND_FILE } from "./paths";

export function loadLedger(file = SPEND_FILE): Ledger {
  if (!existsSync(file)) return emptyLedger();
  const parsed = JSON.parse(readFileSync(file, "utf8")) as Ledger;
  return { spentUsd: parsed.spentUsd ?? 0, entries: parsed.entries ?? [], ...(parsed.reconciled ? { reconciled: parsed.reconciled } : {}) };
}

export function saveLedger(ledger: Ledger, file = SPEND_FILE) {
  save(ledger, file);
}

function save(ledger: Ledger, file: string) {
  mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, JSON.stringify(ledger, null, 2));
  renameSync(tmp, file);
}

/** A ceiling: amount, which spend it counts, and the phase new calls are recorded under. */
export type Budget = { ceilingUsd: number; scope: Scope; phase: Phase; label: string };

/** B0: $17, demo calls not counted. */
export const B0_BUDGET: Budget = { ceilingUsd: SPEND_CEILING_USD, scope: "b0", phase: "b0", label: "B0 ceiling" };
/** bench:demo: after B0, outside the $17 — checked against the total spend (B0 + demo). */
export const DEMO_BUDGET: Budget = { ceilingUsd: DEMO.ceilingUsd, scope: "all", phase: "demo", label: "demo ceiling (total B0 + demo)" };

/**
 * Spending guard shared by every command. `reserve` is checked before each
 * call against everything spent + in flight; `settle` records the outcome.
 * All updates go through one promise chain, so parallel calls cannot race.
 */
export class Spend {
  private ledger: Ledger;
  private reserved = 0;
  private chain: Promise<unknown> = Promise.resolve();

  readonly budget: Budget;

  constructor(
    private readonly file = SPEND_FILE,
    ceilingOrBudget: number | Budget = B0_BUDGET,
  ) {
    this.ledger = loadLedger(file);
    this.budget = typeof ceilingOrBudget === "number" ? { ...B0_BUDGET, ceilingUsd: ceilingOrBudget } : ceilingOrBudget;
  }

  /** Counted at list prices. */
  get spent() {
    return this.ledger.spentUsd;
  }

  /** What the ceiling is checked against (safety factor, reconciled actual). */
  get effective() {
    return effectiveSpent(this.ledger, this.budget.scope);
  }

  snapshot(): Ledger {
    return this.ledger;
  }

  private serial<T>(fn: () => T): Promise<T> {
    const next = this.chain.then(fn);
    this.chain = next.catch(() => undefined);
    return next;
  }

  /** true → the call may start; its cost × margin is held until `settle`. */
  reserve(costUsd: number, margin = 1): Promise<boolean> {
    return this.serial(() => {
      const held = round(costUsd * margin);
      if (!canSpend(this.ledger, this.reserved, held, this.budget.ceilingUsd, this.budget.scope)) return false;
      this.reserved = round(this.reserved + held);
      return true;
    });
  }

  /** Records the call (list price + margin) and releases what `reserve` held (`heldUsd` = cost × margin). */
  settle(entry: Omit<LedgerEntry, "at" | "phase">, heldUsd: number): Promise<void> {
    return this.serial(() => {
      this.reserved = round(Math.max(0, this.reserved - heldUsd));
      this.ledger = record(this.ledger, { ...entry, at: new Date().toISOString(), ...(this.budget.phase === "demo" ? { phase: "demo" as const } : {}) });
      save(this.ledger, this.file);
    });
  }
}
