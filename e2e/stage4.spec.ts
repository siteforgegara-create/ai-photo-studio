import { expect, test, type Page, type Request } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { seedScenario, type MockDb, type ScenarioId } from "../src/services/mock/scenarios";

const fixture = (name: string) => path.join(__dirname, "fixtures", name);
const demo = (name: string) => path.join(__dirname, "..", "public", "demo", "headshot", name);

async function seed(page: Page, scenario: ScenarioId, mutate?: (db: MockDb) => void) {
  const db = seedScenario(scenario);
  mutate?.(db);
  await page.addInitScript((json) => {
    if (!sessionStorage.getItem("seeded")) {
      localStorage.setItem("aps.mock.db", json);
      localStorage.setItem("aps.mock.flags", JSON.stringify({ latencyMs: 0 }));
      sessionStorage.setItem("seeded", "1");
    }
  }, JSON.stringify(db));
}
const mockDb = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("aps.mock.db")!) as MockDb);

/** CLAUDE.md §3.5: free tools never send the file anywhere. Records every request that could carry it. */
function watchUploads(page: Page) {
  const suspicious: string[] = [];
  const origin = new URL(page.url() || "http://localhost").origin;
  page.on("request", (r: Request) => {
    const url = r.url();
    if (url.startsWith("blob:") || url.startsWith("data:")) return;
    const body = r.postDataBuffer();
    const foreign = !url.startsWith("http://localhost");
    if (r.method() !== "GET" && r.method() !== "HEAD") suspicious.push(`${r.method()} ${url}`);
    else if (body && body.length > 0) suspicious.push(`GET with body ${url}`);
    else if (foreign) suspicious.push(`external ${url}`);
  });
  void origin;
  return suspicious;
}

const isPng = (b: Buffer) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));

/** Width/height from a baseline or progressive JPEG (SOF0/SOF2). */
function jpegSize(b: Buffer) {
  let i = 2;
  while (i < b.length) {
    if (b[i] !== 0xff) return null;
    const marker = b[i + 1]!;
    const len = b.readUInt16BE(i + 2);
    if (marker === 0xc0 || marker === 0xc2) return { height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7) };
    i += 2 + len;
  }
  return null;
}

test.describe("free tools — nothing leaves the browser", () => {
  test("background remover: model loads, result downloads as PNG with alpha, no uploads", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/tools/background-remover");
    const uploads = watchUploads(page);
    await page.locator('input[type="file"]').setInputFiles(demo("office.webp"));
    const png = page.getByRole("button", { name: "Download PNG" });
    await expect(png).toBeEnabled({ timeout: 90_000 });
    await expect(page.getByRole("slider", { name: "Compare before and after" })).toBeVisible();

    // Background options re-compose locally.
    for (const name of ["White", "Blur original", "Color", "Transparent"]) {
      await page.getByRole("radio", { name }).click();
      await expect(page.getByRole("radio", { name })).toHaveAttribute("aria-checked", "true");
    }

    const dl = page.waitForEvent("download");
    await png.click();
    const file = await dl;
    expect(file.suggestedFilename()).toBe("office-no-background.png");
    const bytes = readFileSync((await file.path())!);
    expect(isPng(bytes)).toBe(true);
    expect(bytes[25]).toBe(6); // IHDR colour type 6 = RGBA (transparency kept)

    const jpg = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download JPG" }).click();
    const jbytes = readFileSync((await (await jpg).path())!);
    expect(jbytes[0]).toBe(0xff);
    expect(jbytes[1]).toBe(0xd8);

    expect(uploads, uploads.join("\n")).toEqual([]);
  });

  test("background remover: shows a clear error for unsupported files", async ({ page }) => {
    await page.goto("/tools/background-remover");
    await page.locator('input[type="file"]').setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello") });
    // Next's empty route announcer also has role=alert.
    await expect(page.getByRole("alert").filter({ hasText: /\S/ })).toContainText("Use a JPEG, PNG, WebP or HEIC photo.");
  });

  test("photo editor: social preset exports at the exact size without EXIF, no uploads", async ({ page }) => {
    await page.goto("/tools/photo-editor");
    const uploads = watchUploads(page);
    await page.locator('input[type="file"]').setInputFiles(fixture("selfie-1.jpg"));
    await expect(page.getByRole("img", { name: "Photo being edited" })).toBeVisible();
    await page.getByRole("button", { name: "LinkedIn banner 1584×396" }).click();
    const dl = page.waitForEvent("download");
    await page.getByRole("button", { name: /^Download/ }).click();
    const bytes = readFileSync((await (await dl).path())!);
    expect(jpegSize(bytes)).toEqual({ width: 1584, height: 396 });
    expect(bytes.subarray(0, 65536).includes(Buffer.from("Exif"))).toBe(false);
    expect(uploads, uploads.join("\n")).toEqual([]);
  });
});

test.describe("SEO hygiene", () => {
  test("sitemap and robots", async ({ request }) => {
    const sitemap = await (await request.get("/sitemap.xml")).text();
    for (const p of ["/pricing", "/headshots/linkedin", "/headshots/consultants", "/tools/background-remover", "/teams"]) expect(sitemap).toContain(p);
    expect(sitemap).not.toContain("/settings");
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toMatch(/Disallow: \/settings/);
    expect(robots).toMatch(/Sitemap: .*\/sitemap\.xml/);
  });

  const pages: { path: string; types: string[] }[] = [
    { path: "/", types: ["Organization", "FAQPage"] },
    { path: "/pricing", types: ["Product", "FAQPage"] },
    { path: "/headshots/lawyers", types: ["FAQPage", "BreadcrumbList"] },
    { path: "/tools/background-remover", types: ["WebApplication", "FAQPage"] },
  ];
  for (const p of pages) {
    test(`${p.path}: canonical, OG image, JSON-LD ${p.types.join(" + ")}`, async ({ page, request }) => {
      await page.goto(p.path);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`${p.path === "/" ? "" : p.path}$`));
      const og = await page.locator('meta[property="og:image"]').first().getAttribute("content");
      expect(og).toBeTruthy();
      const ogRes = await request.get(new URL(og!).pathname + (new URL(og!).search ?? ""));
      expect(ogRes.status()).toBe(200);
      expect(ogRes.headers()["content-type"]).toContain("image/png");
      const types = await page.locator('script[type="application/ld+json"]').evaluateAll((els) => els.flatMap((e) => [].concat(JSON.parse(e.textContent!)).map((d: { "@type": string }) => d["@type"])));
      for (const t of p.types) expect(types).toContain(t);
    });
  }

  test("SEO pages have real content (≥ 400 words) and a pre-filled CTA", async ({ page }) => {
    await page.goto("/headshots/doctors");
    const words = await page.locator("main").innerText().then((t) => t.split(/\s+/).filter(Boolean).length);
    expect(words).toBeGreaterThan(400);
    await expect(page.getByRole("link", { name: /Get your free preview/ }).first()).toHaveAttribute("href", "/shoot/new?useCase=doctors");
  });
});

test.describe("marketing", () => {
  test("home: hero style switch, edits demo, FAQ", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("radio", { name: "City Bokeh" }).click();
    await expect(page.getByRole("radio", { name: "City Bokeh" })).toHaveAttribute("aria-checked", "true");
    await expect(page.locator("figure").first().getByText("City Bokeh", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Outfit", exact: true })).toHaveAttribute("aria-disabled", "true");
    await page.locator("summary", { hasText: "What if I'm not happy?" }).click();
    await expect(page.getByText("You get a full refund until your first download.").first()).toBeVisible();
  });

  test("pricing: signed-in credit pack purchase adds credits once", async ({ page }) => {
    await seed(page, "has-shoot");
    await page.goto("/pricing#credits");
    await page.getByRole("button", { name: "Buy 20 credits" }).click();
    await expect(page.getByRole("status")).toContainText("20 credits added to your balance.");
    await expect(page.getByText("Your balance: 50 edit credits")).toBeVisible();
    await page.reload();
    await expect(page.getByText("Your balance: 50 edit credits")).toBeVisible();
    expect((await mockDb(page)).ledger.filter((e) => e.label.startsWith("Credit pack"))).toHaveLength(1);
  });

  test("pricing: guest Buy goes to login with next", async ({ page }) => {
    await page.goto("/pricing");
    await page.getByRole("button", { name: "Buy 60 credits" }).click();
    await expect(page).toHaveURL(/\/login\?next=%2Fpricing%23credits/);
  });

  test("teams: waitlist validates and joins", async ({ page }) => {
    await page.goto("/teams");
    await page.getByRole("button", { name: "Join the waitlist" }).click();
    await expect(page.getByText("Enter your work email.")).toBeVisible();
    await expect(page.getByText("Choose your team size.")).toBeVisible();
    await page.getByLabel("Work email").fill("lead@company.com");
    await page.getByLabel("Team size").selectOption("11-50");
    await page.getByRole("button", { name: "Join the waitlist" }).click();
    await expect(page.getByRole("status")).toContainText("Thanks! We'll let you know when Teams launches.");
    expect((await mockDb(page)).waitlist).toEqual([{ email: "lead@company.com", teamSize: "11-50" }]);
  });
});

test.describe("auth recovery", () => {
  test("forgot password shows the same message for any email", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.getByRole("button", { name: /Send Reset Link/ }).click();
    await expect(page.getByText("Enter your email address.")).toBeVisible();
    await page.getByLabel("Email address").fill("nobody@example.com");
    await page.getByRole("button", { name: /Send Reset Link/ }).click();
    await expect(page.getByRole("status")).toHaveText("If an account exists for this email, instructions will be sent.");
  });

  test("reset password: live checks, mismatch, success", async ({ page }) => {
    await page.goto("/reset-password?token=abc");
    await page.getByLabel("New password", { exact: true }).fill("short");
    await expect(page.getByRole("listitem").filter({ hasText: "8+ characters" })).toContainText("not yet");
    await page.getByLabel("New password", { exact: true }).fill("longenough1");
    await page.getByLabel("Confirm new password").fill("different1");
    await expect(page.getByRole("listitem").filter({ hasText: "8+ characters" })).toContainText("done");
    await page.getByRole("button", { name: /Update Password/ }).click();
    await expect(page.getByText("Passwords don't match.")).toBeVisible();
    await page.getByLabel("Confirm new password").fill("longenough1");
    await page.getByRole("button", { name: /Update Password/ }).click();
    await expect(page.getByRole("heading", { name: "Password updated" })).toBeVisible();
  });

  test("reset password: expired link", async ({ page }) => {
    await page.goto("/reset-password?token=expired");
    await expect(page.getByRole("heading", { name: "This reset link has expired." })).toBeVisible();
    await expect(page.getByRole("link", { name: /Request a new link/ })).toHaveAttribute("href", "/forgot-password");
  });
});

test.describe("settings dialogs", () => {
  test("profile, change password, credits ledger", async ({ page }) => {
    await seed(page, "has-shoot");
    await page.goto("/settings");
    await page.getByLabel("Full name").fill("Jordan Q. Lee");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("status")).toContainText("Your profile is saved.");

    await page.getByRole("button", { name: "Change password" }).click();
    const dlg = page.getByRole("dialog", { name: "Change password" });
    await dlg.getByLabel("Current password").fill("x");
    await dlg.getByLabel("New password", { exact: true }).fill("newpassword1");
    await dlg.getByLabel("Confirm new password").fill("newpassword1");
    await dlg.getByRole("button", { name: "Update password" }).click();
    await expect(dlg.getByRole("alert")).toHaveText("Your current password is incorrect.");
    await dlg.getByLabel("Current password").fill("oldpassword1");
    await dlg.getByRole("button", { name: "Update password" }).click();
    await expect(dlg).toBeHidden();
    await expect(page.getByRole("status")).toContainText("Your password has been changed.");

    await expect(page.getByRole("table", { name: /Credit activity/ })).toBeVisible();
  });

  test("delete all photos keeps credits", async ({ page }) => {
    await seed(page, "has-shoot");
    await page.goto("/settings");
    await page.getByRole("button", { name: "Delete all my photos" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete all photos" }).click();
    await expect(page.getByRole("status")).toContainText("All your photos have been deleted");
    const db = await mockDb(page);
    expect(db.shoots).toHaveLength(0);
    expect(db.photos).toHaveLength(0);
    expect(db.ledger.reduce((s, e) => s + e.delta, 0)).toBe(30);
  });

  test("delete account requires typing DELETE and signs out", async ({ page }) => {
    await seed(page, "has-shoot");
    await page.goto("/settings");
    await page.getByRole("button", { name: "Delete account" }).click();
    const dlg = page.getByRole("dialog");
    const confirm = dlg.getByRole("button", { name: "Delete account" });
    await expect(confirm).toBeDisabled();
    await dlg.getByLabel(/Type DELETE to confirm/).fill("delete");
    await expect(confirm).toBeDisabled();
    await dlg.getByLabel(/Type DELETE to confirm/).fill("DELETE");
    await confirm.click();
    await expect(page).toHaveURL(/\/$/);
    expect((await mockDb(page)).user).toBeNull();
  });
});
