import type {
  GlassesChoice,
  OutfitChoice,
  PackId,
  Preview,
  RefundEligibility,
  Selfie,
  SelfieCheck,
  Shoot,
  ShootPhoto,
  ShootUpdate,
  Unsubscribe,
} from "./types";

export type DraftInput = { outfit?: OutfitChoice; glasses?: GlassesChoice; styleIds?: string[]; pack?: PackId };

/** ShootsService — shoots, selfies, previews, photos (B2/B3). */
export interface ShootsService {
  createDraft(input?: DraftInput): Promise<Shoot>;
  updateDraft(shootId: string, input: DraftInput): Promise<Shoot>;
  uploadSelfie(shootId: string, file: Blob, check: SelfieCheck, localId: string): Promise<Selfie>;
  /** Free preview (M5): 2 styles → 4 watermarked 512px frames. */
  requestPreview(shootId: string, styleIds: [string, string]): Promise<Shoot>;
  getPreviews(shootId: string): Promise<Preview[]>;
  /** Called after a successful checkout (webhook in B5). */
  checkout(shootId: string, packId: PackId, styleIds: string[]): Promise<Shoot>;
  get(shootId: string): Promise<Shoot | null>;
  list(): Promise<Shoot[]>;
  listPhotos(shootId: string): Promise<ShootPhoto[]>;
  getPhoto(photoId: string): Promise<ShootPhoto | null>;
  subscribe(shootId: string, listener: (update: ShootUpdate) => void): Unsubscribe;
  favorite(photoId: string, isFavorite: boolean): Promise<ShootPhoto>;
  /** Records a full-size download (ends refund eligibility, M6) and returns a URL. */
  download(photoIds: string[], format: "original" | "zip"): Promise<{ url: string }>;
  rename(shootId: string, title: string): Promise<Shoot>;
  deleteNow(shootId: string): Promise<void>;
  refundEligibility(shootId: string): Promise<RefundEligibility>;
  requestRefund(shootId: string, reason?: string): Promise<Shoot>;
}
