import { test, type Page } from "@playwright/test";
import path from "node:path";
import { makePhotos, seedScenario, type MockDb, type ScenarioId } from "../src/services/mock/scenarios";

/**
 * Stage screenshots — CLAUDE.md §7.2. Every screen × Light/Dark × 1440/390
 * (Studio also 1024). Output: screenshots/stage-$STAGE/<name>--<theme>--<width>.png
 */
const STAGE = process.env.STAGE ?? "1";
const OUT = path.join("screenshots", `stage-${STAGE}`);

type Shot = {
  name: string;
  path: string;
  scenario?: ScenarioId;
  /** Custom mock db (overrides scenario). */
  db?: () => MockDb;
  /** Persisted wizard state (zustand `aps.wizard`). */
  wizard?: Record<string, unknown>;
  widths?: number[];
  /** Runs after load (open a menu, etc.). */
  act?: (page: Page, width: number) => Promise<void>;
  fullPage?: boolean;
};

const BASE_WIDTHS = [1440, 390];
const STUDIO_WIDTHS = [1440, 1024, 768, 390];

const wizardBase = { step: 0, selfies: [], consent: true, outfit: null, glasses: "keep", previewStyles: [], pack: "professional", styles: [], previewSkipped: false };

/** A signed-in user with a draft shoot whose free preview is generating / ready. */
function previewDb(status: "previewing" | "preview_ready"): MockDb {
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

const shots: Shot[] = [
  { name: "home-guest", path: "/" },
  { name: "home-signed-in", path: "/", scenario: "has-shoot" },
  {
    name: "header-account-menu",
    path: "/",
    scenario: "has-shoot",
    fullPage: false,
    act: async (page) => {
      await page.getByRole("button", { name: /account menu/i }).first().click();
      await page.getByRole("menuitem", { name: /my shoots/i }).click();
      await page.getByRole("menuitem", { name: /essential/i }).waitFor();
    },
  },
  {
    name: "header-mobile-menu",
    path: "/",
    widths: [390],
    fullPage: false,
    act: async (page) => {
      await page.getByRole("button", { name: "Open menu" }).click();
      await page.getByRole("dialog").waitFor();
      await page.waitForTimeout(400);
    },
  },
  {
    name: "header-free-tools",
    path: "/",
    widths: [1440],
    fullPage: false,
    act: async (page) => {
      await page.getByRole("button", { name: "Free Tools" }).click();
      await page.getByRole("menuitem", { name: /background remover/i }).waitFor();
    },
  },
  { name: "pricing", path: "/pricing" },
  { name: "headshots-linkedin", path: "/headshots/linkedin" },
  { name: "tools-background-remover", path: "/tools/background-remover" },
  { name: "tools-photo-editor", path: "/tools/photo-editor" },
  { name: "teams", path: "/teams" },
  { name: "settings", path: "/settings", scenario: "has-shoot" },
  { name: "privacy", path: "/privacy" },
  { name: "terms", path: "/terms" },
  { name: "login", path: "/login" },
  { name: "signup", path: "/signup" },
  { name: "forgot-password", path: "/forgot-password" },
  { name: "reset-password", path: "/reset-password" },
  { name: "shoot-new", path: "/shoot/new", scenario: "new-user" },
  {
    name: "wizard-1-selfies",
    path: "/shoot/new",
    act: async (page) => {
      await page.locator('input[type="file"]').setInputFiles(["selfie-1.jpg", "selfie-2.jpg", "selfie-3.jpg", "no-face.jpg", "two-faces.jpg"].map((f) => path.join(__dirname, "fixtures", f)));
      await page.getByText("More than one person").waitFor({ timeout: 60_000 });
      await page.getByText("Looks great").first().waitFor({ timeout: 60_000 });
      await page.getByRole("checkbox", { name: /These photos are of me/ }).click();
    },
  },
  { name: "wizard-2-look", path: "/shoot/new", scenario: "new-user", wizard: { step: 1, outfit: "blazer", previewStyles: ["corporate-gray", "city-bokeh"] } },
  { name: "wizard-2-auth-gate", path: "/shoot/new", widths: [1440, 390], fullPage: false, wizard: { step: 1, outfit: "suit", previewStyles: ["corporate-gray", "city-bokeh"] }, act: async (page) => { await page.getByRole("button", { name: /See my free previews/ }).click(); await page.getByRole("dialog").waitFor(); } },
  { name: "wizard-3-generating", path: "/shoot/new", db: () => previewDb("previewing"), wizard: { step: 2, shootId: "shoot_draft", previewStyles: ["corporate-gray", "city-bokeh"] } },
  { name: "wizard-3-preview", path: "/shoot/new", db: () => previewDb("preview_ready"), wizard: { step: 2, shootId: "shoot_draft", previewStyles: ["corporate-gray", "city-bokeh"] } },
  { name: "wizard-4-package", path: "/shoot/new", db: () => previewDb("preview_ready"), wizard: { step: 3, shootId: "shoot_draft", previewStyles: ["corporate-gray", "city-bokeh"], styles: ["corporate-gray", "city-bokeh", "studio-white"] } },
  { name: "wizard-5-done", path: "/shoot/new", scenario: "shoot-generating", wizard: { step: 4, shootId: "shoot_pro_1017" } },
  { name: "shoot-ready", path: "/shoot/shoot_pro_1017", scenario: "has-shoot" },
  { name: "shoot-generating", path: "/shoot/shoot_pro_1017", scenario: "shoot-generating" },
  {
    name: "shoot-lightbox",
    path: "/shoot/shoot_pro_1017",
    scenario: "has-shoot",
    fullPage: false,
    act: async (page) => {
      await page.getByRole("button", { name: /Open photo 1,/ }).click();
      await page.getByRole("dialog").waitFor();
      await page.waitForTimeout(300);
    },
  },
  {
    name: "shoot-refund-dialog",
    path: "/shoot/shoot_pro_1017",
    scenario: "has-shoot",
    fullPage: false,
    act: async (page) => {
      await page.getByRole("button", { name: /Request a full refund/ }).click();
      await page.getByRole("dialog").waitFor();
    },
  },
  // Studio — 02-studio.md; widths 1440 / 1024 / 768 / 390 (Stage 3 acceptance).
  { name: "studio-demo-guest", path: "/studio", widths: STUDIO_WIDTHS, fullPage: false },
  { name: "studio-real", path: "/studio?photo=shoot_pro_1017_p001", scenario: "has-shoot", widths: STUDIO_WIDTHS, fullPage: false },
  {
    name: "studio-real-edits",
    path: "/studio?photo=shoot_pro_1017_p001",
    scenario: "has-shoot",
    widths: [1440, 1024],
    fullPage: false,
    act: async (page, width) => {
      if (width < 1200) await page.getByRole("button", { name: /Options & photos/ }).click();
      await page.getByRole("tab", { name: "Edits" }).click();
      await page.getByRole("button", { name: /Edit 2/ }).click();
      if (width < 1200) await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
    },
  },
  {
    name: "studio-collapsed",
    path: "/studio?photo=shoot_pro_1017_p001",
    scenario: "has-shoot",
    widths: [1440],
    fullPage: false,
    act: async (page) => {
      await page.getByRole("button", { name: "Collapse panel" }).click();
      await page.waitForTimeout(400);
    },
  },
  {
    name: "studio-crop-export",
    path: "/studio?photo=shoot_pro_1017_p001",
    scenario: "has-shoot",
    widths: STUDIO_WIDTHS,
    fullPage: false,
    act: async (page, width) => {
      await page.getByRole(width < 768 ? "button" : "button", { name: /Crop & Export/ }).first().click();
      await page.getByRole("img", { name: "Photo being edited" }).waitFor();
      await page.waitForTimeout(400);
    },
  },
  {
    name: "studio-confirm",
    path: "/studio?photo=shoot_pro_1017_p001",
    scenario: "has-shoot",
    widths: [1440, 390],
    fullPage: false,
    act: async (page) => {
      await page.getByRole("button", { name: /Generate · 2 credits/ }).click();
      await page.getByRole("dialog").waitFor();
    },
  },
  {
    name: "studio-mobile-sheet",
    path: "/studio",
    widths: [390],
    fullPage: false,
    act: async (page) => {
      await page.getByRole("button", { name: "Options", exact: true }).click();
      await page.getByRole("dialog").waitFor();
      await page.waitForTimeout(400);
    },
  },
  { name: "not-found", path: "/this-page-does-not-exist" },
  { name: "dev-ui", path: "/dev/ui" },
];

for (const shot of shots) {
  for (const theme of ["light", "dark"] as const) {
    for (const width of shot.widths ?? BASE_WIDTHS) {
      test(`${shot.name} · ${theme} · ${width}`, async ({ page }) => {
        await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
        const db = shot.db ? shot.db() : seedScenario(shot.scenario ?? "guest");
        const wizard = shot.wizard ? JSON.stringify({ state: { ...wizardBase, ...shot.wizard }, version: 1 }) : "";
        await page.addInitScript(
          ([dbJson, themeName, wizardJson]) => {
            window.localStorage.setItem("aps.mock.db", dbJson);
            window.localStorage.setItem("aps.mock.flags", JSON.stringify({ latencyMs: 0, previewDelayMs: 600000, generationTickMs: 600000 }));
            window.localStorage.setItem("aps-theme", themeName);
            if (wizardJson) window.localStorage.setItem("aps.wizard", wizardJson);
          },
          [JSON.stringify(db), theme, wizard] as const,
        );
        await page.goto(shot.path, { waitUntil: "networkidle" });
        await page.addStyleTag({ content: "[data-dev-panel]{display:none!important} *{caret-color:transparent!important}" });
        await page.waitForFunction(() => !document.querySelector(".skeleton"), null, { timeout: 5_000 }).catch(() => undefined);
        await settleImages(page);
        if (shot.act) await shot.act(page, width);
        if (shot.act && (shot.fullPage ?? true)) await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({ path: path.join(OUT, `${shot.name}--${theme}--${width}.png`), fullPage: shot.fullPage ?? true, animations: "disabled" });
      });
    }
  }
}

/** Scrolls through the page so lazy images load, then waits (max 10 s) for them to decode. */
async function settleImages(page: Page) {
  await page.evaluate(async () => {
    const step = window.innerHeight;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });
  await page
    .waitForFunction(() => Array.from(document.images).every((img) => img.complete), null, { timeout: 10_000 })
    .catch(() => undefined);
}
