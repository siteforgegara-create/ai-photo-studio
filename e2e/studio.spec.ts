import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { seedScenario, type MockDb, type ScenarioId } from "../src/services/mock/scenarios";

const FLAGS = { latencyMs: 0, previewDelayMs: 300, generationTickMs: 80 };

async function seed(page: Page, scenario: ScenarioId, flags: Record<string, unknown> = {}) {
  const json = JSON.stringify(seedScenario(scenario));
  await page.addInitScript(
    ([dbJson, f]) => {
      if (!sessionStorage.getItem("seeded")) {
        localStorage.setItem("aps.mock.db", dbJson);
        sessionStorage.setItem("seeded", "1");
      }
      localStorage.setItem("aps.mock.flags", f);
    },
    [json, JSON.stringify({ ...FLAGS, ...flags })] as const,
  );
}

const db = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("aps.mock.db")!) as MockDb);
/** Studio alerts (Next's empty route announcer also has role=alert). */
const alert = (page: Page) => page.getByRole("alert").filter({ hasText: /\S/ });
const slider = (page: Page) => page.getByRole("slider", { name: "Compare before and after" });

test.describe("Studio", () => {
  test("demo mode never calls EditsService.create", async ({ page, isMobile }) => {
    await seed(page, "guest");
    await page.goto("/studio");
    await expect(page.getByRole("heading", { level: 1, name: "Background" })).toBeVisible();
    await expect(page.getByText("Demo mode · 0 credits")).toBeVisible();
    await expect(page.getByRole("button", { name: /Generate — unavailable in demo/ })).toBeDisabled();

    // Click through tools and options — the example changes, nothing is requested.
    for (const name of ["Outfit", "Retouch", "Creative Style", "Background"]) {
      await page.getByRole("button", { name: new RegExp(`^${name}`) }).first().click();
    }
    if (!isMobile) {
      await page.getByRole("button", { name: /City Bokeh/ }).click();
      await expect(slider(page)).toBeVisible();
      await page.getByRole("button", { name: /Light Gray/ }).click();
      await expect(page.getByText("Example not available yet")).toBeVisible();
    }
    const state = await db(page);
    expect(state.editJobs).toHaveLength(0);
    expect(state.ledger).toHaveLength(0);
  });

  test("Before/After: mouse and keyboard", async ({ page, isMobile }) => {
    test.skip(isMobile, "touch covered separately");
    await seed(page, "guest");
    await page.goto("/studio");
    const handle = slider(page);
    await expect(handle).toHaveAttribute("aria-valuenow", "50");
    await handle.focus();
    await page.keyboard.press("ArrowRight");
    await expect(handle).toHaveAttribute("aria-valuenow", "52");
    await page.keyboard.press("Shift+ArrowLeft");
    await expect(handle).toHaveAttribute("aria-valuenow", "42");
    await page.keyboard.press("End");
    await expect(handle).toHaveAttribute("aria-valuenow", "100");

    const fig = page.locator("figure").filter({ has: handle });
    const box = (await fig.boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.25, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.3, box.y + box.height / 2, { steps: 4 });
    await page.mouse.up();
    const v = Number(await handle.getAttribute("aria-valuenow"));
    expect(v).toBeGreaterThanOrEqual(27);
    expect(v).toBeLessThanOrEqual(33);

    // Zoom + pan keep both layers in sync.
    await page.getByRole("button", { name: "Zoom in" }).click();
    await expect(page.getByText("125%")).toBeVisible();
    const transforms = await fig.locator("[data-layer]").evaluateAll((els) => els.map((e) => (e as HTMLElement).style.transform));
    expect(transforms[0]).toContain("scale(1.25)");
    expect(transforms[0]).toBe(transforms[1]);
    await page.getByRole("button", { name: "Reset view" }).click();
    await expect(page.getByText("100%")).toBeVisible();
  });

  test("Before/After: touch", async ({ page, isMobile }) => {
    test.skip(!isMobile, "mobile project has touch");
    await seed(page, "guest");
    await page.goto("/studio");
    const handle = slider(page);
    const fig = page.locator("figure").filter({ has: handle });
    const box = (await fig.boundingBox())!;
    await page.touchscreen.tap(box.x + box.width * 0.2, box.y + box.height / 2);
    const v = Number(await handle.getAttribute("aria-valuenow"));
    expect(v).toBeGreaterThanOrEqual(15);
    expect(v).toBeLessThanOrEqual(25);
  });

  test("collapsing the panel keeps tab, selection and scroll", async ({ page, isMobile }) => {
    test.skip(isMobile, "desktop panel");
    await page.setViewportSize({ width: 1440, height: 900 });
    await seed(page, "has-shoot");
    await page.goto("/studio?photo=shoot_pro_1017_p001");
    await page.getByRole("tab", { name: "Shoot" }).click();
    const list = page.locator('[data-tab="shoot"]');
    await list.evaluate((el) => (el.scrollTop = 600));
    const before = await list.evaluate((el) => el.scrollTop);
    expect(before).toBeGreaterThan(0);

    await page.getByRole("button", { name: "Collapse panel" }).click();
    await expect(page.locator("[data-panel]")).toHaveAttribute("data-panel", "closed");
    await page.getByRole("button", { name: "Open options and photos panel" }).click();
    await expect(page.getByRole("tab", { name: "Shoot" })).toHaveAttribute("aria-selected", "true");
    expect(await list.evaluate((el) => el.scrollTop)).toBe(before);

    // Collapsed state is remembered after a reload.
    await page.getByRole("button", { name: "Collapse panel" }).click();
    await page.reload();
    await expect(page.getByRole("button", { name: "Open options and photos panel" })).toBeVisible();
  });

  test("real edit: confirm → generate → results in Edits, credits charged", async ({ page, isMobile }) => {
    test.skip(isMobile, "desktop flow; mobile uses the same store");
    await page.setViewportSize({ width: 1440, height: 900 });
    await seed(page, "has-shoot");
    await page.goto("/studio?photo=shoot_pro_1017_p002");
    await page.getByRole("button", { name: /Modern Office/ }).click();
    await page.getByRole("button", { name: "Generate · 2 credits" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("This edit uses 2 credits")).toBeVisible();
    await dialog.getByRole("button", { name: "Generate · 2 credits" }).click();
    await expect(page.getByRole("tab", { name: "Edits" })).toHaveAttribute("aria-selected", "true", { timeout: 10_000 });
    await expect(page.getByRole("button", { name: /Edit 2/ })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Edited", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /28 edit credits/ })).toBeVisible();
    const state = await db(page);
    expect(state.editJobs).toHaveLength(1);
  });

  test("not enough credits → alert, no request", async ({ page, isMobile }) => {
    test.skip(isMobile, "desktop flow");
    await page.setViewportSize({ width: 1440, height: 900 });
    const base = seedScenario("has-shoot");
    base.ledger = [{ id: "l", createdAt: "2026-10-17T09:00:00.000Z", label: "x", delta: 1 }];
    await page.addInitScript(
      ([dbJson]) => {
        if (!sessionStorage.getItem("seeded")) {
          localStorage.setItem("aps.mock.db", dbJson);
          sessionStorage.setItem("seeded", "1");
        }
        localStorage.setItem("aps.mock.flags", JSON.stringify({ latencyMs: 0 }));
      },
      [JSON.stringify(base)] as const,
    );
    await page.goto("/studio?photo=shoot_pro_1017_p001");
    await page.getByRole("button", { name: /^Creative Style/ }).click();
    await page.getByRole("radio", { name: "4 variants" }).click();
    await page.getByRole("button", { name: "Generate · 8 credits" }).click();
    // Above 6 credits the confirmation is always shown, without "Don't ask again".
    await expect(page.getByRole("dialog").getByText("Don't ask again")).toHaveCount(0);
    await page.getByRole("dialog").getByRole("button", { name: "Generate · 8 credits" }).click();
    await expect(alert(page)).toContainText("Not enough credits. This edit needs 8, you have 1.");
    await expect(alert(page).getByRole("link", { name: "Buy credits" })).toBeVisible();
    expect((await db(page)).editJobs).toHaveLength(0);
  });

  test("failed edit returns the credits", async ({ page, isMobile }) => {
    test.skip(isMobile, "desktop flow");
    await page.setViewportSize({ width: 1440, height: 900 });
    await seed(page, "has-shoot", { failEdit: true });
    await page.goto("/studio?photo=shoot_pro_1017_p001");
    await page.getByRole("button", { name: /City Bokeh/ }).click();
    await page.getByRole("button", { name: "Generate · 2 credits" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Generate · 2 credits" }).click();
    await expect(alert(page)).toContainText("We couldn't complete this edit. Your credits were returned.", { timeout: 10_000 });
    await expect(page.getByRole("link", { name: /30 edit credits/ })).toBeVisible();
  });

  test("Crop & Export downloads a re-encoded file without EXIF", async ({ page }) => {
    await seed(page, "guest");
    await page.goto("/studio");
    await page.getByRole("button", { name: /Crop & Export/ }).first().click();
    await expect(page.getByRole("img", { name: "Photo being edited" })).toBeVisible();
    await page.getByRole("button", { name: /1:1 \(LinkedIn\)/ }).click();
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: /^Download/ }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/\.jpg$/);
    const bytes = readFileSync((await file.path())!);
    expect(bytes[0]).toBe(0xff);
    expect(bytes[1]).toBe(0xd8); // JPEG SOI
    expect(bytes.subarray(0, 65536).includes(Buffer.from("Exif"))).toBe(false);
    expect(bytes.subarray(0, 65536).includes(Buffer.from("GPS"))).toBe(false);
  });

  test("real photo download in Studio asks to confirm the refund trade-off first", async ({ page, isMobile }) => {
    test.skip(isMobile, "desktop flow");
    await page.setViewportSize({ width: 1440, height: 900 });
    await seed(page, "has-shoot");
    await page.goto("/studio?photo=shoot_pro_1017_p001");
    await page.getByRole("button", { name: /^Download/ }).click();
    await page.getByRole("menuitem", { name: /LinkedIn/ }).click();
    await expect(page.getByRole("dialog", { name: /Downloading ends your refund eligibility/ })).toBeVisible();
  });

  test("mobile: bottom sheet opens, closes with Esc and returns focus", async ({ page, isMobile }) => {
    test.skip(!isMobile, "mobile only");
    await seed(page, "guest");
    await page.goto("/studio");
    const optionsTab = page.getByRole("button", { name: "Options", exact: true });
    await optionsTab.click();
    const sheet = page.getByRole("dialog", { name: "Options" });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole("heading", { name: "Choose a background" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
    await expect(optionsTab).toBeFocused();
  });
});
