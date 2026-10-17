import { expect, test, type Page } from "@playwright/test";
import { allPages, seedPage, settle } from "./support";

/**
 * Stage 5 QA:
 * 1. Every page at 360×740 (narrowest common Android): no horizontal page
 *    scroll and no element sticking out of the viewport, except inside
 *    deliberate horizontal scrollers / clipping containers.
 * 2. prefers-reduced-motion: no movement animations (transform, translate,
 *    scale, rotate) longer than a frame, no smooth scrolling; opacity fades are allowed.
 */

async function overflowReport(page: Page) {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const pageOverflow = document.documentElement.scrollWidth - vw;
    const offenders: string[] = [];
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>("*"))) {
      const r = el.getBoundingClientRect();
      if (r.width <= 1 || r.height <= 1) continue; // sr-only and empty nodes
      if (r.right <= vw + 1 && r.left >= -1) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none" || cs.position === "fixed" || cs.opacity === "0" || el.closest("[aria-hidden=\"true\"]")) continue;
      let a = el.parentElement;
      let clipped = false;
      while (a && a !== document.body) {
        if (getComputedStyle(a).overflowX !== "visible") {
          clipped = true;
          break;
        }
        a = a.parentElement;
      }
      if (clipped) continue;
      const id = `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}.${String(el.className).split(" ").slice(0, 3).join(".")}`;
      offenders.push(`${id} [${Math.round(r.left)}..${Math.round(r.right)}] "${(el.textContent ?? "").trim().slice(0, 40)}"`);
    }
    return { pageOverflow, offenders: offenders.slice(0, 10) };
  });
}

test.describe("360 px sweep", () => {
  test.skip(({ isMobile }) => !isMobile, "runs once, on the touch project at 360×740");
  test.use({ viewport: { width: 360, height: 740 } });

  for (const p of allPages) {
    test(`360 · ${p.name}`, async ({ page }) => {
      await seedPage(page, p);
      await page.goto(p.path, { waitUntil: "networkidle" });
      await settle(page);
      const { pageOverflow, offenders } = await overflowReport(page);
      expect(pageOverflow, "horizontal page scroll").toBeLessThanOrEqual(0);
      expect(offenders, offenders.join("\n")).toEqual([]);
    });
  }
});

test.describe("360 px · popovers stay on screen", () => {
  test.skip(({ isMobile }) => !isMobile, "touch project only");
  test.use({ viewport: { width: 360, height: 740 } });

  test("account menu lists shoots inline and fits the viewport", async ({ page }) => {
    await seedPage(page, { scenario: "has-shoot" });
    await page.goto("/");
    await settle(page);
    await page.getByRole("button", { name: /account menu/i }).first().click();
    const menu = page.getByRole("menu");
    await menu.waitFor();
    await expect(menu.getByRole("menuitem", { name: /Essential/ })).toBeVisible();
    const boxes = await page.locator('[role="menu"]').evaluateAll((els) => els.map((e) => e.getBoundingClientRect()).map((r) => [r.left, r.right]));
    for (const [left, right] of boxes) {
      expect(left).toBeGreaterThanOrEqual(0);
      expect(right).toBeLessThanOrEqual(360);
    }
  });
});

/** Running animations that move things (transform-like keyframes) for longer than one frame. */
async function movingAnimations(page: Page) {
  return page.evaluate(() =>
    document
      .getAnimations()
      .filter((a) => {
        if (a.playState !== "running") return false;
        const effect = a.effect as KeyframeEffect | null;
        if (!effect) return false;
        const duration = Number(effect.getTiming().duration) || 0;
        if (duration <= 20) return false;
        return effect.getKeyframes().some((k) => ["transform", "translate", "scale", "rotate"].some((prop) => prop in k && k[prop] !== "none"));
      })
      .map((a) => `${(a as CSSAnimation).animationName ?? "waapi"} on ${((a.effect as KeyframeEffect).target as HTMLElement | null)?.className ?? "?"}`),
  );
}

test.describe("prefers-reduced-motion", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
  });

  test("CSS: animations and transitions collapse to ~0 ms, scrolling is instant", async ({ page }) => {
    await seedPage(page, { scenario: "shoot-generating" });
    await page.goto("/shoot/shoot_pro_1017");
    const timing = await page.evaluate(() => {
      const sk = document.querySelector(".skeleton") as HTMLElement | null;
      const btn = document.querySelector("a, button") as HTMLElement;
      return {
        skeleton: sk ? getComputedStyle(sk).animationDuration : "0s",
        transition: getComputedStyle(btn).transitionDuration,
        scroll: getComputedStyle(document.documentElement).scrollBehavior,
      };
    });
    expect(parseFloat(timing.skeleton)).toBeLessThan(0.02);
    expect(timing.transition.split(",").every((d) => parseFloat(d) < 0.02)).toBe(true);
    expect(timing.scroll).toBe("auto");
  });

  test("dialogs, menus and the lightbox open without movement", async ({ page }) => {
    await seedPage(page, { scenario: "has-shoot" });
    await page.goto("/shoot/shoot_pro_1017");
    await settle(page);
    await page.getByRole("button", { name: /Open photo 1,/ }).click();
    await page.getByRole("dialog").waitFor();
    expect(await movingAnimations(page)).toEqual([]);
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: /account menu/i }).first().click();
    await page.getByRole("menu").waitFor();
    expect(await movingAnimations(page)).toEqual([]);
  });

  test("Studio: panel, sheet and drawer appear in place", async ({ page, isMobile }) => {
    await seedPage(page, { scenario: "has-shoot" });
    await page.goto("/studio?photo=shoot_pro_1017_p001");
    await settle(page);
    if (isMobile) {
      await page.getByRole("button", { name: "Options", exact: true }).click();
      const sheet = page.getByRole("dialog");
      await sheet.waitFor();
      // No slide-in: the sheet is at its final position immediately.
      const transform = await sheet.evaluate((el) => getComputedStyle(el).transform);
      expect(["none", "matrix(1, 0, 0, 1, 0, 0)"]).toContain(transform);
    } else {
      await page.getByRole("button", { name: "Collapse panel" }).click();
      const cols = await page.locator("[data-panel]").evaluate((el) => getComputedStyle(el).transitionDuration);
      expect(parseFloat(cols)).toBeLessThan(0.02);
    }
    expect(await movingAnimations(page)).toEqual([]);
  });

  test("mobile navigation opens in place", async ({ page, isMobile }) => {
    test.skip(!isMobile, "mobile header only");
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu" }).click();
    const nav = page.getByRole("dialog");
    await nav.waitFor();
    const transform = await nav.evaluate((el) => getComputedStyle(el).transform);
    expect(["none", "matrix(1, 0, 0, 1, 0, 0)"]).toContain(transform);
    expect(await movingAnimations(page)).toEqual([]);
  });

  test("home: hero style switch and edits demo do not animate", async ({ page }) => {
    await page.goto("/");
    await settle(page);
    await page.getByRole("radio", { name: "City Bokeh" }).click();
    expect(await movingAnimations(page)).toEqual([]);
  });
});

test.describe("launch hygiene", () => {
  test("security headers and touch icon", async ({ request }) => {
    const res = await request.get("/");
    const h = res.headers();
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["x-powered-by"]).toBeUndefined();
    const icon = await request.get("/apple-icon");
    expect(icon.status()).toBe(200);
    expect(icon.headers()["content-type"]).toContain("image/png");
  });

  test("dev panel and /dev/ui are not part of a production build", async ({ page, request }) => {
    await page.goto("/");
    await expect(page.locator("[data-dev-panel]")).toHaveCount(0);
    expect((await request.get("/dev/ui")).status()).toBe(404);
  });
});
