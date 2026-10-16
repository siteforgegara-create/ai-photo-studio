import type { CreditBalance, CreditPack, LedgerEntry, Unsubscribe } from "./types";

/** CreditsService — balance = SUM(credit_ledger.delta) (B4). */
export interface CreditsService {
  getBalance(): Promise<CreditBalance>;
  getLedger(): Promise<LedgerEntry[]>;
  getCreditPacks(): Promise<CreditPack[]>;
  onBalanceChange(listener: (balance: CreditBalance) => void): Unsubscribe;
}
