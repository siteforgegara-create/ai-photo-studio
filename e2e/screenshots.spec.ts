import { test, type Page } from "@playwright/test";
import path from "node:path";
import { seedScenario, type ScenarioId } from "../src/services/mock/scenarios";

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
  widths?: number[];
  /** Runs after load (open a menu, etc.). */
  act?: (page: Page, width: number) => Promise<void>;
  fullPage?: boolean;
};

const BASE_WIDTHS = [1440, 390];

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
  { name: "shoot-ready", path: "/shoot/shoot_pro_1017", scenario: "has-shoot" },
  { name: "shoot-generating", path: "/shoot/shoot_pro_1017", scenario: "shoot-generating" },
  { name: "studio-guest", path: "/studio", widths: [1440, 1024, 390] },
  { name: "studio-signed-in", path: "/studio", scenario: "has-shoot", widths: [1440, 1024, 390] },
  { name: "not-found", path: "/this-page-does-not-exist" },
  { name: "dev-ui", path: "/dev/ui" },
];

for (const shot of shots) {
  for (const theme of ["light", "dark"] as const) {
    for (const width of shot.widths ?? BASE_WIDTHS) {
      test(`${shot.name} · ${theme} · ${width}`, async ({ page }) => {
        await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
        const db = seedScenario(shot.scenario ?? "guest");
        await page.addInitScript(
          ([dbJson, themeName]) => {
            window.localStorage.setItem("aps.mock.db", dbJson);
            window.localStorage.setItem("aps.mock.flags", JSON.stringify({ latencyMs: 0 }));
            window.localStorage.setItem("aps-theme", themeName);
          },
          [JSON.stringify(db), theme] as const,
        );
        await page.goto(shot.path, { waitUntil: "networkidle" });
        await page.addStyleTag({ content: "[data-dev-panel]{display:none!important} *{caret-color:transparent!important}" });
        await page.waitForFunction(() => !document.querySelector(".skeleton"), null, { timeout: 5_000 }).catch(() => undefined);
        await settleImages(page);
        if (shot.act) await shot.act(page, width);
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
