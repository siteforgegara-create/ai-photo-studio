import { getShootPack } from "@/config/packs";
import { demoManifest } from "@/config/demo-manifest";
import type { EditJob, LedgerEntry, Preview, Selfie, Shoot, ShootPhoto, User } from "../types";

/**
 * Dev scenarios (CLAUDE.md §5). Every name, balance and date here is a
 * placeholder fixture (CLAUDE.md §3.7), not product data.
 */
export const scenarioIds = ["guest", "new-user", "has-shoot", "shoot-generating", "preview-used"] as const;
export type ScenarioId = (typeof scenarioIds)[number];

export const scenarioLabels: Record<ScenarioId, string> = {
  guest: "Guest",
  "new-user": "New user (no shoots, preview unused)",
  "has-shoot": "Has shoot (Professional, ready)",
  "shoot-generating": "Shoot generating",
  "preview-used": "Preview used",
};

export type DevFlags = {
  /** Shoot / preview generation ends in an error. */
  failGeneration: boolean;
  /** Studio edits fail (credits returned). */
  failEdit: boolean;
  /** Studio edits are blocked by moderation (credits returned). */
  blockEdit: boolean;
  /** Artificial latency for every mock call, ms. */
  latencyMs: number;
};

export const defaultDevFlags: DevFlags = {
  failGeneration: false,
  failEdit: false,
  blockEdit: false,
  latencyMs: 350,
};

export type MockDb = {
  version: number;
  scenario: ScenarioId;
  user: User | null;
  shoots: Shoot[];
  photos: ShootPhoto[];
  previews: (Preview & { shootId: string })[];
  selfies: (Selfie & { shootId: string })[];
  editJobs: (EditJob & { idempotencyKey: string; photoId: string; credits: number })[];
  ledger: LedgerEntry[];
  waitlist: { email: string; teamSize: string }[];
  /** Photo ids downloaded in full size (refund rule M6). */
  downloads: string[];
};

export const MOCK_DB_VERSION = 1;

export const fixtureUser: User = {
  id: "user_demo",
  email: "jordan@example.com",
  fullName: "Jordan Lee",
  provider: "email",
  emailVerified: true,
  previewUsed: false,
};

const FIXTURE_TODAY = "2026-10-17T09:00:00.000Z";
const addDays = (iso: string, days: number) => new Date(new Date(iso).getTime() + days * 86_400_000).toISOString();

const STYLE_IMAGE: Record<string, string> = {
  "corporate-gray": demoManifest.shoot["corporate-gray"] ?? "/demo/headshot/studio.webp",
  "minimal-beige": demoManifest.shoot["minimal-beige"] ?? "/demo/headshot/professional.webp",
  "modern-office": demoManifest.shoot["modern-office"] ?? "/demo/headshot/office.webp",
  "city-bokeh": demoManifest.shoot["city-bokeh"] ?? "/demo/headshot/city.webp",
};
const fallbackImage = "/demo/headshot/studio.webp";

export function makePhotos(shoot: Shoot, count: number): ShootPhoto[] {
  return Array.from({ length: count }, (_, i) => {
    const styleId = shoot.styleIds[i % shoot.styleIds.length];
    const url = (styleId && STYLE_IMAGE[styleId]) ?? fallbackImage;
    return {
      id: `${shoot.id}_p${String(i + 1).padStart(3, "0")}`,
      shootId: shoot.id,
      styleId,
      kind: "generated" as const,
      url,
      thumbUrl: url,
      width: 1080,
      height: 1350,
      isFavorite: i < 3,
    };
  });
}

function professionalShoot(status: Shoot["status"], readyCount: number): Shoot {
  const pack = getShootPack("professional");
  const ready = status === "ready";
  return {
    id: "shoot_pro_1017",
    pack: pack.id,
    status,
    styleIds: ["corporate-gray", "minimal-beige", "modern-office", "city-bokeh", "studio-white"],
    targetCount: pack.photos,
    readyCount,
    createdAt: FIXTURE_TODAY,
    expiresAt: ready ? addDays(FIXTURE_TODAY, 30) : undefined,
    refundable: true,
    editCreditsLeft: pack.editCredits,
    outfit: "blazer",
    glasses: "keep",
    coverUrl: STYLE_IMAGE["corporate-gray"],
  };
}

function essentialShoot(): Shoot {
  const pack = getShootPack("essential");
  const createdAt = "2026-10-02T15:30:00.000Z";
  return {
    id: "shoot_ess_1002",
    pack: pack.id,
    status: "ready",
    styleIds: ["studio-white", "city-bokeh"],
    targetCount: pack.photos,
    readyCount: pack.photos,
    createdAt,
    expiresAt: addDays(createdAt, 30),
    refundable: false,
    editCreditsLeft: 0,
    coverUrl: STYLE_IMAGE["city-bokeh"],
  };
}

export function seedScenario(scenario: ScenarioId): MockDb {
  const base: MockDb = {
    version: MOCK_DB_VERSION,
    scenario,
    user: null,
    shoots: [],
    photos: [],
    previews: [],
    selfies: [],
    editJobs: [],
    ledger: [],
    waitlist: [],
    downloads: [],
  };

  switch (scenario) {
    case "guest":
      return base;
    case "new-user":
      return { ...base, user: { ...fixtureUser } };
    case "preview-used":
      return { ...base, user: { ...fixtureUser, previewUsed: true } };
    case "has-shoot": {
      const pro = professionalShoot("ready", 50);
      const ess = essentialShoot();
      return {
        ...base,
        user: { ...fixtureUser, previewUsed: true },
        shoots: [pro, ess],
        photos: [...makePhotos(pro, 50), ...makePhotos(ess, 20)],
        ledger: [
          { id: "l1", createdAt: "2026-10-02T15:30:00.000Z", label: "Essential shoot · edit credits", delta: 10 },
          { id: "l2", createdAt: "2026-10-03T10:12:00.000Z", label: "Background edit · 2 variants", delta: -2 },
          { id: "l3", createdAt: "2026-10-03T10:20:00.000Z", label: "Creative Style edit · 4 variants", delta: -8 },
          { id: "l4", createdAt: FIXTURE_TODAY, label: "Professional shoot · edit credits", delta: 30 },
        ],
      };
    }
    case "shoot-generating": {
      const pro = professionalShoot("generating", 18);
      return {
        ...base,
        user: { ...fixtureUser, previewUsed: true },
        shoots: [pro],
        photos: makePhotos(pro, 18),
        ledger: [{ id: "l1", createdAt: FIXTURE_TODAY, label: "Professional shoot · edit credits", delta: 30 }],
      };
    }
  }
}
