import type { Page } from "@playwright/test";
import { makePhotos, seedScenario, type MockDb, type ScenarioId } from "../src/services/mock/scenarios";
import { useCases } from "../src/config/use-cases";

/** Shared e2e helpers: page catalogue for axe / 360 px sweep and seeding. */

export const wizardBase = { step: 0, selfies: [], consent: true, outfit: null, glasses: "keep", previewStyles: [], pack: "professional", styles: [], previewSkipped: false };

/** A signed-in user with a draft shoot whose free preview is generating / ready. */
export function previewDb(status: "previewing" | "preview_ready"): MockDb {
  const db = seedScenario("new-user");
  db.user = { ...db.user!, previewUsed: true };
  const shoot = { id: "shoot_draft", pack: "professional" as const, status, styleIds: ["corporate-gray", "city-bokeh"], targetCount: 0, readyCount: 0, createdAt: "2026-10-17T09:00:00.000Z", refundable: false };
  db.shoots = [shoot];
  if (status === "preview_ready") {
    db.previews = ["corporate-gray", "corporate-gray", "city-bokeh", "city-bokeh"].map((styleId, i) => ({
      id: `pv${i}`,
      shootId: shoot.id,
      styleId,
      url: makePhotos({ ...shoot, styleIds: [styleId] }, 1)[0]!.url,
    }));
  }
  return db;
}

export type PageSpec = {
  name: string;
  path: string;
  scenario?: ScenarioId;
  db?: () => MockDb;
  wizard?: Record<string, unknown>;
};

/** Every screen of the product (public + signed-in + wizard steps). */
export const allPages: PageSpec[] = [
  { name: "home", path: "/" },
  { name: "home-signed-in", path: "/", scenario: "has-shoot" },
  { name: "pricing", path: "/pricing" },
  ...useCases.map((u) => ({ name: `headshots-${u.slug}`, path: `/headshots/${u.slug}` })),
  { name: "tools-background-remover", path: "/tools/background-remover" },
  { name: "tools-photo-editor", path: "/tools/photo-editor" },
  { name: "teams", path: "/teams" },
  { name: "privacy", path: "/privacy" },
  { name: "terms", path: "/terms" },
  { name: "licenses", path: "/licenses" },
  { name: "login", path: "/login" },
  { name: "signup", path: "/signup" },
  { name: "forgot-password", path: "/forgot-password" },
  { name: "reset-password", path: "/reset-password?token=abc" },
  { name: "reset-password-expired", path: "/reset-password?token=expired" },
  { name: "settings", path: "/settings", scenario: "has-shoot" },
  { name: "settings-new-user", path: "/settings", scenario: "new-user" },
  { name: "wizard-1-selfies", path: "/shoot/new", scenario: "new-user" },
  { name: "wizard-2-look", path: "/shoot/new", scenario: "new-user", wizard: { step: 1, outfit: "blazer", previewStyles: ["corporate-gray", "city-bokeh"] } },
  { name: "wizard-3-preview", path: "/shoot/new", db: () => previewDb("preview_ready"), wizard: { step: 2, shootId: "shoot_draft", previewStyles: ["corporate-gray", "city-bokeh"] } },
  { name: "wizard-4-package", path: "/shoot/new", db: () => previewDb("preview_ready"), wizard: { step: 3, shootId: "shoot_draft", previewStyles: ["corporate-gray", "city-bokeh"], styles: ["corporate-gray", "city-bokeh", "studio-white"] } },
  { name: "wizard-5-done", path: "/shoot/new", scenario: "shoot-generating", wizard: { step: 4, shootId: "shoot_pro_1017" } },
  { name: "shoot-ready", path: "/shoot/shoot_pro_1017", scenario: "has-shoot" },
  { name: "shoot-generating", path: "/shoot/shoot_pro_1017", scenario: "shoot-generating" },
  { name: "studio-demo", path: "/studio" },
  { name: "studio-real", path: "/studio?photo=shoot_pro_1017_p001", scenario: "has-shoot" },
  { name: "not-found", path: "/this-page-does-not-exist" },
];

export async function seedPage(page: Page, spec: Pick<PageSpec, "scenario" | "db" | "wizard">, theme: "light" | "dark" = "light") {
  const db = spec.db ? spec.db() : seedScenario(spec.scenario ?? "guest");
  const wizard = spec.wizard ? JSON.stringify({ state: { ...wizardBase, ...spec.wizard }, version: 1 }) : "";
  await page.addInitScript(
    ([dbJson, t, wizardJson]) => {
      localStorage.setItem("aps.mock.db", dbJson);
      localStorage.setItem("aps.mock.flags", JSON.stringify({ latencyMs: 0, previewDelayMs: 600000, generationTickMs: 600000 }));
      localStorage.setItem("aps-theme", t);
      if (wizardJson) localStorage.setItem("aps.wizard", wizardJson);
    },
    [JSON.stringify(db), theme, wizard] as const,
  );
}

/** Waits for skeletons to go and the theme transition to settle. */
export async function settle(page: Page) {
  await page.waitForFunction(() => !document.querySelector(".skeleton"), null, { timeout: 5_000 }).catch(() => undefined);
  await page.waitForTimeout(250);
}
