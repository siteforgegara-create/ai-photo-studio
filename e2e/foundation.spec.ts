import { expect, test, type Page } from "@playwright/test";
import { seedScenario, type ScenarioId } from "../src/services/mock/scenarios";

async function useScenario(page: Page, scenario: ScenarioId) {
  const db = JSON.stringify(seedScenario(scenario));
  await page.addInitScript((json) => {
    if (!sessionStorage.getItem("seeded")) {
      localStorage.setItem("aps.mock.db", json);
      localStorage.setItem("aps.mock.flags", JSON.stringify({ latencyMs: 0 }));
      sessionStorage.setItem("seeded", "1");
    }
  }, db);
}

const publicRoutes: [string, RegExp][] = [
  ["/", /Professional headshots that actually look like you/],
  ["/pricing", /Studio headshots/],
  ["/headshots/linkedin", /LinkedIn headshots that look like you/],
  ["/headshots/consultants", /Headshots for consultants/],
  ["/tools/background-remover", /Free Background Remover/],
  ["/tools/photo-editor", /Free Photo Editor/],
  ["/teams", /Consistent headshots for your whole team/],
  ["/privacy", /Privacy Policy/],
  ["/terms", /Terms of Service/],
  ["/licenses", /Open-source licenses/],
  ["/login", /Welcome back/],
  ["/signup", /Create your account/],
  ["/forgot-password", /Forgot your password\?/],
  ["/reset-password", /Create new password/],
  ["/shoot/new", /Upload 4–8 selfies/],
  ["/studio", /Background/], // h1 = active tool (02-studio)
];

for (const [route, heading] of publicRoutes) {
  test(`route ${route} renders its heading`, async ({ page }) => {
    const res = await page.goto(route);
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
  });
}

test("unknown route shows the 404 page", async ({ page }) => {
  const res = await page.goto("/nope-nope");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Page not found");
  await expect(page.getByRole("link", { name: "Get your free preview" })).toBeVisible();
});

test("unknown use case is a strict 404 (src/proxy.ts)", async ({ page, request }) => {
  for (const path of ["/headshots/astronauts", "/headshots/linkedin-extra", "/headshots"]) {
    expect((await request.get(path)).status(), path).toBe(404);
  }
  expect((await request.get("/headshots/linkedin")).status()).toBe(200);
  const res = await page.goto("/headshots/astronauts");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Page not found");
});

test("/credits redirects to /pricing#credits", async ({ page }) => {
  await page.goto("/credits");
  await expect(page).toHaveURL(/\/pricing#credits$/);
  await expect(page.getByRole("heading", { name: "Edit credits" })).toBeVisible();
});

test("/dev/ui is not available in a production build", async ({ page }) => {
  const res = await page.goto("/dev/ui");
  expect(res?.status()).toBe(404);
});

test("settings redirects guests to login with next", async ({ page }) => {
  await page.goto("/settings");
  await expect(page).toHaveURL(/\/login\?next=%2Fsettings$/);
});

test("signed-in user sees settings and the shoot page", async ({ page }) => {
  await useScenario(page, "has-shoot");
  await page.goto("/settings");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Account Settings");
  await page.goto("/shoot/shoot_pro_1017");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Professional");
});

test.describe("theme", () => {
  test("defaults to Light and persists Dark across reloads without a flash", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.locator("html")).not.toHaveClass(/dark/);

    const toggle = page.getByRole("radiogroup", { name: "Colour theme" }).first();
    if (await toggle.isVisible()) {
      await toggle.getByRole("radio", { name: "Dark" }).click();
    } else {
      await page.evaluate(() => localStorage.setItem("aps-theme", "dark"));
    }

    // Record the theme class at the very first paint opportunity, before hydration.
    await page.addInitScript(() => {
      document.addEventListener("DOMContentLoaded", () => {
        (window as unknown as { __firstThemeClass: string }).__firstThemeClass = document.documentElement.className;
      });
    });
    await page.reload();
    const first = await page.evaluate(() => (window as unknown as { __firstThemeClass: string }).__firstThemeClass);
    expect(first).toContain("dark");
    await expect(page.locator("html")).toHaveClass(/dark/);
  });
});

test.describe("headers (V2)", () => {
  test("guest marketing header", async ({ page, isMobile }) => {
    await page.goto("/");
    const header = page.locator("header").first();
    if (isMobile) {
      await header.getByRole("button", { name: "Open menu" }).click();
      const menu = page.getByRole("dialog");
      await expect(menu.getByRole("link", { name: "How It Works" })).toBeVisible();
      await expect(menu.getByRole("link", { name: "Log In" })).toBeVisible();
      await expect(menu.getByRole("link", { name: /Get your headshots/ })).toBeVisible();
      return;
    }
    for (const name of ["How It Works", "Pricing", "Examples"]) await expect(header.getByRole("link", { name, exact: true })).toBeVisible();
    await expect(header.getByRole("button", { name: "Free Tools" })).toBeVisible();
    await expect(header.getByRole("radiogroup", { name: "Colour theme" })).toBeVisible();
    await expect(header.getByRole("link", { name: "Log In" })).toBeVisible();
    await expect(header.getByRole("link", { name: /Get your headshots/ })).toBeVisible();
  });

  test("signed-in marketing header + My Shoots menu", async ({ page, isMobile }) => {
    await useScenario(page, "has-shoot");
    await page.goto("/");
    const header = page.locator("header").first();
    await expect(header.getByRole("link", { name: "Log In" })).toHaveCount(0);
    if (!isMobile) {
      await expect(header.getByRole("link", { name: /30 credits — buy more/ })).toBeVisible();
      await expect(header.getByRole("link", { name: /New shoot/ })).toBeVisible();
    }
    await header.getByRole("button", { name: /Account menu/ }).first().click();
    for (const name of ["Studio", "Account Settings", "Buy credits", "Sign out"]) await expect(page.getByRole("menuitem", { name })).toBeVisible();
    await page.getByRole("menuitem", { name: /My Shoots/ }).click();
    await page.getByRole("menuitem", { name: /Essential/ }).click();
    await expect(page).toHaveURL(/\/shoot\/shoot_ess_1002$/);
  });

  test("app header in Studio: back to shoot, credits, buy credits", async ({ page, isMobile }) => {
    await useScenario(page, "has-shoot");
    await page.goto("/studio");
    const header = page.locator("header").first();
    await expect(header.getByRole("link", { name: isMobile ? "Shoot" : "Back to shoot" })).toHaveAttribute("href", "/shoot/shoot_pro_1017");
    await expect(header.getByRole("link", { name: /30 credits — buy more/ })).toBeVisible();
    if (!isMobile) await expect(header.getByRole("link", { name: "Buy credits" })).toBeVisible();
  });

  test("sign out returns to the guest header", async ({ page, isMobile }) => {
    test.skip(isMobile, "covered on desktop");
    await useScenario(page, "has-shoot");
    await page.goto("/pricing");
    await page.locator("header").getByRole("button", { name: /Account menu/ }).first().click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(page.locator("header").getByRole("link", { name: "Log In" })).toBeVisible();
  });
});
