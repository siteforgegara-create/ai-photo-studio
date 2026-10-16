import type { CheckoutTarget, ShootPack } from "./types";

/** BillingService — Lemon Squeezy overlay checkout in B5, mock now. */
export interface BillingService {
  getShootPacks(): Promise<ShootPack[]>;
  /** Returns the URL to open; the mock returns an in-app success URL. */
  startCheckout(target: CheckoutTarget): Promise<{ url: string }>;
}
