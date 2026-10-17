import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import { makePhotos, seedScenario, type MockDb, type ScenarioId } from "../src/services/mock/scenarios";

const FIX = (f: string) => path.join(__dirname, "fixtures", f);
const FAST_FLAGS = { latencyMs: 0, previewDelayMs: 400, generationTickMs: 80 };

async function seed(page: Page, db: MockDb | ScenarioId) {
  const json = JSON.stringify(typeof db === "string" ? seedScenario(db) : db);
  await page.addInitScript(
    ([dbJson, flags]) => {
      if (!sessionStorage.getItem("seeded")) {
        localStorage.setItem("aps.mock.db", dbJson);
        sessionStorage.setItem("seeded", "1");
      }
      localStorage.setItem("aps.mock.flags", flags);
    },
    [json, JSON.stringify(FAST_FLAGS)] as const,
  );
}

const fileInput = (page: Page) => page.locator('input[type="file"]');

test.describe("wizard /shoot/new", () => {
  test.setTimeout(120_000);

  test("guest → selfies → sign up → free preview → package → shoot ready", async ({ page }) => {
    await seed(page, "guest");
    await page.goto("/shoot/new");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Upload 4–8 selfies");
    // Already in the wizard: no "get started" CTA in the header, only Log In (keeps the wizard as next).
    const header = page.locator("header").first();
    await expect(header.getByRole("link", { name: /Get your headshots|Get started/ })).toHaveCount(0);
    await expect(header.getByRole("link", { name: "Log In" })).toHaveAttribute("href", "/login?next=%2Fshoot%2Fnew");

    // Step 1 — selfies are checked in the browser (real MediaPipe detector).
    await fileInput(page).setInputFiles([FIX("selfie-1.jpg"), FIX("selfie-2.jpg"), FIX("selfie-3.jpg"), FIX("selfie-4.jpg")]);
    await expect(page.getByText("4 of 4 required")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("Good set")).toBeVisible({ timeout: 60_000 });
    const continueBtn = page.getByRole("button", { name: "Continue", exact: true });
    await expect(continueBtn).toBeDisabled(); // consent missing
    await page.getByRole("checkbox", { name: /These photos are of me/ }).click();
    await continueBtn.click();

    // Step 2 — Your look.
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your look");
    await page.getByRole("radio", { name: "Suit" }).click();
    await page.getByRole("button", { name: /Corporate Gray/ }).click();
    await page.getByRole("button", { name: /City Bokeh/ }).click();
    await expect(page.getByText("2 of 2 selected")).toBeVisible();
    await page.getByRole("button", { name: /See my free previews/ }).click();

    // Sign-in gate → sign up → back into the wizard with selfies kept.
    await expect(page.getByRole("dialog", { name: /Create a free account to see your previews/ })).toBeVisible();
    await page.getByRole("link", { name: "Create free account" }).click();
    await expect(page).toHaveURL(/\/signup\?next=%2Fshoot%2Fnew/);
    await page.getByLabel("Full name").fill("Test Person");
    await page.getByLabel("Email address").fill("test@example.com");
    await page.getByLabel("Password", { exact: true }).fill("password123");
    await page.getByLabel("Confirm password").fill("password123");
    await page.getByRole("button", { name: /Create Account/ }).click();
    await expect(page).toHaveURL(/\/shoot\/new$/);

    // Step 3 — free preview (4 watermarked frames).
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your free previews", { timeout: 20_000 });
    await expect(page.getByRole("button", { name: /Open preview/ })).toHaveCount(4);
    const uploaded = await page.evaluate(() => JSON.parse(localStorage.getItem("aps.mock.db")!).selfies.length);
    expect(uploaded).toBe(4); // all 4 selfies survived the sign-in and were uploaded

    // Step 4 — package + styles.
    await page.getByRole("button", { name: /Choose a package/ }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Choose your package");
    await expect(page.getByRole("radio", { name: /Professional/ })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByText("2 of 5 selected")).toBeVisible();
    for (const s of ["Studio White", "Modern Office", "Minimal Beige"]) await page.getByRole("button", { name: new RegExp(s) }).click();
    await expect(page.getByText("5 of 5 selected")).toBeVisible();
    await page.getByRole("button", { name: /Continue to secure checkout/ }).click();

    // Step 5 — generation with a real counter.
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Your shoot is in progress|Your headshots are ready/, { timeout: 20_000 });
    await expect(page.getByText(/of 50 photos ready/)).toBeVisible();
    await page.getByRole("link", { name: /Open my shoot/ }).click();
    await expect(page).toHaveURL(/\/shoot\/shoot_/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Professional ·");
    await expect(page.getByRole("button", { name: /Download all \(ZIP\)/ })).toBeEnabled({ timeout: 30_000 });
    await expect(page.locator('[aria-label="50 photos"] > li')).toHaveCount(50);
  });

  test("selfies without a face or with two faces are rejected", async ({ page }) => {
    await seed(page, "guest");
    await page.goto("/shoot/new");
    await fileInput(page).setInputFiles([FIX("no-face.jpg"), FIX("two-faces.jpg"), FIX("selfie-1.jpg")]);
    await expect(page.getByText("No face found")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("More than one person")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("Looks great")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("1 of 4 required")).toBeVisible();
    await expect(page.getByText("Add 3 more photos")).toBeVisible();
  });

  test("preview already used → straight to packages", async ({ page }) => {
    await seed(page, "preview-used");
    await page.goto("/shoot/new");
    await fileInput(page).setInputFiles([FIX("selfie-1.jpg"), FIX("selfie-2.jpg"), FIX("selfie-3.jpg"), FIX("selfie-5.jpg")]);
    await expect(page.getByText("Good set")).toBeVisible({ timeout: 60_000 });
    await page.getByRole("checkbox", { name: /These photos are of me/ }).click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page.getByText("You've already used your free preview.")).toBeVisible();
    await page.getByRole("radio", { name: "Let us choose" }).click();
    await page.getByRole("button", { name: /Continue to packages/ }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Choose your package");
  });
});

test.describe("shoot page /shoot/[id]", () => {
  function hundredPhotoDb(): MockDb {
    const db = seedScenario("has-shoot");
    const shoot = db.shoots[0]!;
    shoot.pack = "executive";
    shoot.targetCount = 100;
    shoot.readyCount = 100;
    db.photos = [...makePhotos(shoot, 100), ...db.photos.filter((p) => p.shootId !== shoot.id)];
    return db;
  }

  test("100 photos render with lazy loading and sizes", async ({ page }) => {
    await seed(page, hundredPhotoDb());
    const t0 = Date.now();
    await page.goto("/shoot/shoot_pro_1017");
    const tiles = page.locator('[aria-label="100 photos"] > li');
    await expect(tiles).toHaveCount(100);
    expect(Date.now() - t0).toBeLessThan(15_000);
    const imgs = page.locator('[aria-label="100 photos"] img');
    await expect(imgs.nth(80)).toHaveAttribute("loading", "lazy");
    await expect(imgs.nth(80)).toHaveAttribute("sizes", /min-width/);
  });

  test("filters, lightbox keyboard, download ends refund, delete now", async ({ page, isMobile }) => {
    await seed(page, "has-shoot");
    await page.goto("/shoot/shoot_pro_1017");
    await expect(page.getByText("30 edit credits available")).toBeVisible();
    await expect(page.getByText(/Photos are stored until Nov 16, 2026/)).toBeVisible();
    await expect(page.getByText("Edited").first()).toBeVisible();

    await page.getByRole("button", { name: "Favorites", exact: true }).click();
    await expect(page.locator('[aria-label="3 photos"] > li')).toHaveCount(3);
    await page.getByRole("button", { name: "All", exact: true }).click();

    await page.getByRole("button", { name: /Open photo 1,/ }).click();
    const box = page.getByRole("dialog");
    await expect(box.getByText("1 of 52")).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await expect(box.getByText("2 of 52")).toBeVisible();
    await expect(box.getByRole("link", { name: /Edit in Studio/ })).toHaveAttribute("href", /\/studio\?photo=/);

    // Any download (here a LinkedIn crop) ends refund eligibility (M6) — confirmed once, first.
    await expect(page.getByText(/Request a full refund/)).toHaveCount(1);
    const viewer = page.getByRole("dialog", { name: /1 of 52|2 of 52/ });
    await viewer.getByRole("button", { name: /Download/ }).click();
    await page.getByRole("menuitem", { name: "LinkedIn (1:1, 1080px)" }).click();
    const confirm = page.getByRole("dialog", { name: "Downloading ends your refund eligibility. Continue?" });
    await expect(confirm).toBeVisible();
    const download = page.waitForEvent("download");
    await confirm.getByRole("button", { name: "Download" }).click();
    expect((await download).suggestedFilename()).toMatch(/linkedin-1x1\.jpg$/);
    await viewer.getByRole("button", { name: "Close" }).click();
    await expect(viewer).toBeHidden();
    await expect(page.getByText(/Request a full refund/)).toHaveCount(0);

    if (!isMobile) {
      const zip = page.waitForEvent("download");
      await page.getByRole("button", { name: /Download all \(ZIP\)/ }).click();
      expect((await zip).suggestedFilename()).toMatch(/\.zip$/);
    }

    await page.getByRole("button", { name: "More actions" }).click();
    await page.getByRole("menuitem", { name: "Delete now" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete now" }).click();
    await expect(page).toHaveURL(/\/shoot\/shoot_ess_1002$/);
  });

  test("ZIP asks for the refund confirmation first and can be cancelled", async ({ page, isMobile }) => {
    test.skip(isMobile, "covered on desktop");
    await seed(page, "has-shoot");
    await page.goto("/shoot/shoot_pro_1017");
    await page.getByRole("button", { name: /Download all \(ZIP\)/ }).click();
    const confirm = page.getByRole("dialog", { name: "Downloading ends your refund eligibility. Continue?" });
    await confirm.getByRole("button", { name: "Cancel" }).click();
    await expect(confirm).toBeHidden();
    await expect(page.getByText(/Request a full refund/)).toHaveCount(1);
  });

  test("refund request before any download", async ({ page }) => {
    await seed(page, "has-shoot");
    await page.goto("/shoot/shoot_pro_1017");
    await page.getByRole("button", { name: /Request a full refund/ }).click();
    await page.getByLabel("Reason (optional)").selectOption("Quality issues");
    await page.getByRole("button", { name: "Request refund" }).click();
    await expect(page.getByText("Refund requested")).toBeVisible();
  });

  test("someone else's shoot id is a 404", async ({ page }) => {
    await seed(page, "has-shoot");
    await page.goto("/shoot/not-mine");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Page not found");
  });
});
