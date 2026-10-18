import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { SPEND_CEILING_USD } from "../config";
import { canSpend, effectiveSpent, emptyLedger, record, round, type Ledger } from "./cost";
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

/**
 * Spending guard shared by every command. `reserve` is checked before each
 * call against everything spent + in flight; `settle` records the outcome.
 * All updates go through one promise chain, so parallel calls cannot race.
 */
export class Spend {
  private ledger: Ledger;
  private reserved = 0;
  private chain: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly file = SPEND_FILE,
    private readonly ceiling = SPEND_CEILING_USD,
  ) {
    this.ledger = loadLedger(file);
  }

  /** Counted at list prices. */
  get spent() {
    return this.ledger.spentUsd;
  }

  /** What the ceiling is checked against (safety factor, reconciled actual). */
  get effective() {
    return effectiveSpent(this.ledger);
  }

  snapshot(): Ledger {
    return this.ledger;
  }

  private serial<T>(fn: () => T): Promise<T> {
    const next = this.chain.then(fn);
    this.chain = next.catch(() => undefined);
    return next;
  }

  /** true → the call may start; its cost is held until `settle`. */
  reserve(costUsd: number): Promise<boolean> {
    return this.serial(() => {
      if (!canSpend(this.ledger, this.reserved, costUsd, this.ceiling)) return false;
      this.reserved = round(this.reserved + costUsd);
      return true;
    });
  }

  settle(entry: { key: string; usd: number; status: "ok" | "failed-charged" | "failed-free"; requestId?: string }, reservedUsd: number): Promise<void> {
    return this.serial(() => {
      this.reserved = round(Math.max(0, this.reserved - reservedUsd));
      this.ledger = record(this.ledger, { ...entry, at: new Date().toISOString() });
      save(this.ledger, this.file);
    });
  }
}
