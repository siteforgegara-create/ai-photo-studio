/**
 * Frontend data types — mirror docs/05-backend-outline.md so the Supabase
 * implementation (B1–B5) can replace the mocks without touching UI code.
 * Fields beyond the outline are marked `// ext`.
 */

export type PackId = "essential" | "professional" | "executive";
export type EditToolId = "background" | "outfit" | "retouch" | "relight" | "creative" | "place" | "crop";
export type ShootStatus = "draft" | "previewing" | "preview_ready" | "paid" | "generating" | "ready" | "refunded";
export type OutfitChoice = "keep" | "suit" | "blazer" | "smart-casual" | "auto";
export type GlassesChoice = "keep" | "remove";
export type Variants = 1 | 2 | 4;

export interface User {
  id: string;
  email: string;
  fullName: string;
  provider: "email" | "google";
  emailVerified: boolean;
  previewUsed: boolean;
}

export interface ShootPack {
  id: PackId;
  name: string;
  overline: string; // ext: card overline (GET STARTED / MOST POPULAR / BEST VALUE)
  priceUsd: number;
  photos: number;
  styles: number | "all";
  editCredits: number;
  priority: boolean;
  popular?: boolean;
}

export interface CreditPack {
  id: string;
  credits: number;
  priceUsd: number | null;
}

export interface SelfieCheck {
  faces: number;
  faceRatio: number;
  sharpness: number;
  brightness: number;
  duplicateOf?: string;
  verdict: "ok" | "warn" | "reject";
  reasons: string[];
}

export interface Selfie {
  id: string;
  localId: string;
  previewUrl: string;
  check: SelfieCheck;
}

/** 512px, watermarked. */
export interface Preview {
  id: string;
  styleId: string;
  url: string;
}

export interface Shoot {
  id: string;
  pack: PackId;
  status: ShootStatus;
  styleIds: string[];
  targetCount: number;
  readyCount: number;
  createdAt: string;
  expiresAt?: string;
  refundable: boolean;
  editCreditsLeft: number;
  title?: string; // ext: `Rename shoot`
  outfit?: OutfitChoice; // ext
  glasses?: GlassesChoice; // ext
  coverUrl?: string; // ext: thumbnail for the My Shoots menu
}

export interface ShootPhoto {
  id: string;
  shootId: string;
  styleId?: string;
  parentId?: string;
  kind: "generated" | "edit";
  url: string;
  thumbUrl: string;
  width: number;
  height: number;
  isFavorite: boolean;
}

export interface EditInput {
  photoId: string;
  tool: EditToolId;
  optionId?: string;
  customText?: string;
  sceneUploadId?: string;
  variants: Variants;
}

export interface Quote {
  credits: number;
  perVariant: number;
  variants: number;
}

export interface EditJob {
  id: string;
  status: "queued" | "generating" | "completed" | "failed" | "blocked";
  results: ShootPhoto[];
  error?: { code: string; message: string; refunded: boolean };
}

export interface LedgerEntry {
  id: string;
  createdAt: string;
  label: string;
  delta: number;
}

export interface CreditBalance {
  credits: number;
}

/** Live update pushed by ShootsService.subscribe (Supabase Realtime later). */
export interface ShootUpdate {
  shoot: Shoot;
  previews?: Preview[];
  photos?: ShootPhoto[];
}

export type Unsubscribe = () => void;

export type RefundEligibility =
  | { eligible: true }
  | { eligible: false; reason: "downloaded" | "refunded" | "not-paid" };

export type CheckoutTarget = { kind: "shoot"; packId: PackId; shootId: string } | { kind: "credits"; creditPackId: string };

export type TeamSize = "2-10" | "11-50" | "51-200" | "200+";

/** Thrown by services; `code` is stable and safe to branch on. */
export class ServiceError extends Error {
  constructor(
    public readonly code:
      | "unauthorized"
      | "not-found"
      | "invalid-credentials"
      | "insufficient-credits"
      | "preview-used"
      | "generation-failed"
      | "edit-failed"
      | "validation",
    message: string,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}
