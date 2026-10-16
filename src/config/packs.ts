import type { CreditPack, EditToolId, ShootPack } from "@/services/types";

/**
 * Shoot packages — decision M2. Prices and volumes are provisional and will be
 * confirmed after the B0 cost benchmark; change them only here.
 */
export const shootPacks: readonly ShootPack[] = [
  {
    id: "essential",
    name: "Essential",
    overline: "GET STARTED",
    priceUsd: 29,
    photos: 20,
    styles: 2,
    editCredits: 10,
    priority: false,
  },
  {
    id: "professional",
    name: "Professional",
    overline: "MOST POPULAR",
    priceUsd: 49,
    photos: 50,
    styles: 5,
    editCredits: 30,
    priority: false,
    popular: true,
  },
  {
    id: "executive",
    name: "Executive",
    overline: "BEST VALUE",
    priceUsd: 79,
    photos: 100,
    styles: "all",
    editCredits: 80,
    priority: true,
  },
] as const;

/** Features shared by every plan (M2). */
export const includedOnEveryPlan = ["4K resolution", "Commercial license", "Likeness check"] as const;

/** Credit top-ups — decision M3. Prices are TBD → UI shows `Price to be confirmed`. */
export const creditPacks: readonly CreditPack[] = [
  { id: "credits-20", credits: 20, priceUsd: null },
  { id: "credits-60", credits: 60, priceUsd: null },
  { id: "credits-150", credits: 150, priceUsd: null },
] as const;

/** Credits per variant — decision M4. Crop & Export is free. */
export const editCostPerVariant: Record<EditToolId, number> = {
  background: 1,
  outfit: 1,
  retouch: 1,
  relight: 1,
  creative: 2,
  place: 2,
  crop: 0,
};

export const variantOptions = [1, 2, 4] as const;
export const defaultVariants = 2 as const;

/** M7: above this cost the confirmation modal is always shown. */
export const alwaysConfirmAboveCredits = 6;

export const PRICE_TBD_LABEL = "Price to be confirmed";

export function getShootPack(id: ShootPack["id"]): ShootPack {
  const pack = shootPacks.find((p) => p.id === id);
  if (!pack) throw new Error(`Unknown shoot pack: ${id}`);
  return pack;
}

export function formatPrice(priceUsd: number | null): string {
  return priceUsd === null ? PRICE_TBD_LABEL : `$${priceUsd}`;
}

export function quoteEdit(tool: EditToolId, variants: number) {
  const perVariant = editCostPerVariant[tool];
  return { perVariant, variants, credits: perVariant * variants };
}
