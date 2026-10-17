import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { seedScenario, type ScenarioId } from "../src/services/mock/scenarios";

/** Stage 4 acceptance: axe without critical/serious violations, Light and Dark. */
const routes: { path: string; scenario?: ScenarioId }[] = [
  { path: "/" },
  { path: "/pricing" },
  { path: "/headshots/linkedin" },
  { path: "/headshots/real-estate-agents" },
  { path: "/tools/background-remover" },
  { path: "/tools/photo-editor" },
  { path: "/teams" },
  { path: "/login" },
  { path: "/signup" },
  { path: "/forgot-password" },
  { path: "/reset-password" },
  { path: "/privacy" },
  { path: "/terms" },
  { path: "/licenses" },
  { path: "/settings", scenario: "has-shoot" },
  { path: "/studio" },
  { path: "/shoot/shoot_pro_1017", scenario: "has-shoot" },
];

async function prepare(page: Page, theme: "light" | "dark", scenario: ScenarioId = "guest") {
  await page.addInitScript(
    ([db, t]) => {
      localStorage.setItem("aps.mock.db", db);
      localStorage.setItem("aps.mock.flags", JSON.stringify({ latencyMs: 0 }));
      localStorage.setItem("aps-theme", t);
    },
    [JSON.stringify(seedScenario(scenario)), theme] as const,
  );
}

for (const theme of ["light", "dark"] as const) {
  for (const r of routes) {
    test(`axe · ${theme} · ${r.path}`, async ({ page }) => {
      await prepare(page, theme, r.scenario);
      await page.goto(r.path, { waitUntil: "networkidle" });
      await page.waitForFunction(() => !document.querySelector(".skeleton"), null, { timeout: 5_000 }).catch(() => undefined);
      // The theme transition class animates colours for 180 ms; let it settle.
      await page.waitForTimeout(250);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).exclude("[data-dev-panel]").analyze();
      const blocking = results.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
      const report = blocking.map((v) => `${v.impact} ${v.id}: ${v.help}\n  ${v.nodes.slice(0, 5).map((n) => n.target.join(" ")).join("\n  ")}`).join("\n");
      expect(blocking, report).toEqual([]);
    });
  }
}
