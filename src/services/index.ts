/**
 * Service registry. The UI talks to the backend ONLY through these interfaces.
 * Today every service is a mock (src/services/mock); in B1–B5 each one is
 * swapped for a Supabase / Lemon Squeezy implementation here, one at a time.
 *
 * Demo code (src/config/demo-manifest.ts and demo components) must not import
 * `shoots` or `edits` from here — see CLAUDE.md §3.4.
 */
import type { AuthService } from "./auth";
import type { BillingService } from "./billing";
import type { CreditsService } from "./credits";
import type { EditsService } from "./edits";
import type { ShootsService } from "./shoots";
import type { WaitlistService } from "./waitlist";
import { mockAuth, mockBilling, mockCredits, mockEdits, mockShoots, mockWaitlist } from "./mock";

export const authService: AuthService = mockAuth;
export const shootsService: ShootsService = mockShoots;
export const editsService: EditsService = mockEdits;
export const creditsService: CreditsService = mockCredits;
export const billingService: BillingService = mockBilling;
export const waitlistService: WaitlistService = mockWaitlist;

export type { AuthService, BillingService, CreditsService, EditsService, ShootsService, WaitlistService };
export * from "./types";
