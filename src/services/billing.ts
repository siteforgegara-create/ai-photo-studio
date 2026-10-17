import type { CheckoutTarget, ShootPack } from "./types";

/** BillingService — Lemon Squeezy overlay checkout in B5, mock now. */
export interface BillingService {
  getShootPacks(): Promise<ShootPack[]>;
  /** Returns the URL to open; the mock returns an in-app success URL. */
  startCheckout(target: CheckoutTarget): Promise<{ url: string }>;
  /**
   * Return page after a credit-pack checkout: resolves once the order is
   * recorded (B5: the Lemon Squeezy webhook adds a `purchase` ledger row).
   * Idempotent per `checkoutId`.
   */
  confirmCreditPurchase(checkoutId: string): Promise<{ credits: number }>;
}
