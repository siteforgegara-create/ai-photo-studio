import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { allPages, seedPage, settle } from "./support";

/**
 * axe (WCAG 2.0/2.1 A + AA) without critical/serious violations — every page
 * in both themes (Stage 4/5 acceptance), plus the main open states (dialogs,
 * menus, sheets). Runs on the desktop and mobile projects.
 */
async function expectNoBlocking(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).exclude("[data-dev-panel]").analyze();
  const blocking = results.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
  const report = blocking.map((v) => `${v.impact} ${v.id}: ${v.help}\n  ${v.nodes.slice(0, 5).map((n) => n.target.join(" ")).join("\n  ")}`).join("\n");
  expect(blocking, report).toEqual([]);
}

for (const theme of ["light", "dark"] as const) {
  for (const p of allPages) {
    test(`axe · ${theme} · ${p.name}`, async ({ page }) => {
      await seedPage(page, p, theme);
      await page.goto(p.path, { waitUntil: "networkidle" });
      await settle(page);
      await expectNoBlocking(page);
    });
  }
}

const states: { name: string; path: string; scenario?: "has-shoot"; open: (page: Page, isMobile: boolean) => Promise<void> }[] = [
  {
    name: "studio generate confirmation",
    path: "/studio?photo=shoot_pro_1017_p001",
    scenario: "has-shoot",
    open: async (page) => {
      await page.getByRole("button", { name: /Generate · 2 credits/ }).first().click();
      await page.getByRole("dialog").waitFor();
    },
  },
  {
    name: "studio options sheet / drawer",
    path: "/studio",
    open: async (page, isMobile) => {
      if (isMobile) await page.getByRole("button", { name: "Options", exact: true }).click();
      else await page.getByRole("tab", { name: "Shoot" }).click();
      if (isMobile) await page.getByRole("dialog").waitFor();
    },
  },
  {
    name: "shoot lightbox",
    path: "/shoot/shoot_pro_1017",
    scenario: "has-shoot",
    open: async (page) => {
      await page.getByRole("button", { name: /Open photo 1,/ }).click();
      await page.getByRole("dialog").waitFor();
    },
  },
  {
    name: "settings delete account",
    path: "/settings",
    scenario: "has-shoot",
    open: async (page) => {
      await page.getByRole("button", { name: "Delete account" }).click();
      await page.getByRole("dialog").waitFor();
    },
  },
  {
    name: "account menu",
    path: "/",
    scenario: "has-shoot",
    open: async (page) => {
      await page.getByRole("button", { name: /account menu/i }).first().click();
      await page.getByRole("menu").waitFor();
    },
  },
];

for (const s of states) {
  test(`axe · open state · ${s.name}`, async ({ page, isMobile }) => {
    await seedPage(page, { scenario: s.scenario });
    await page.goto(s.path, { waitUntil: "networkidle" });
    await settle(page);
    await s.open(page, isMobile);
    await page.waitForTimeout(400);
    await expectNoBlocking(page);
  });
}
