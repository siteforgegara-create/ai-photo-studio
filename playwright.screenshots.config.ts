import { defineConfig } from "@playwright/test";

/**
 * Screenshot run (CLAUDE.md §7.2): Light/Dark × 1440/390 (+1024 for Studio)
 * into screenshots/stage-$STAGE/. Builds with NEXT_PUBLIC_ENABLE_DEV_TOOLS=1
 * so /dev/ui can be captured from a production build.
 *   npm run screenshots              (stage 1)
 *   STAGE=2 npm run screenshots      (bash)   ·   $env:STAGE=2; npm run screenshots   (PowerShell)
 */
const PORT = Number(process.env.SCREENSHOTS_PORT ?? 3101);
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: "./e2e",
  testMatch: ["**/screenshots.spec.ts"],
  fullyParallel: true,
  workers: process.env.SCREENSHOT_WORKERS ? Number(process.env.SCREENSHOT_WORKERS) : 4,
  reporter: [["list"]],
  timeout: 90_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    launchOptions: { executablePath },
    deviceScaleFactor: 1,
  },
  webServer: {
    command: `npm run build && npm run start -- --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 300_000,
    env: { NEXT_PUBLIC_ENABLE_DEV_TOOLS: "1" },
  },
});
