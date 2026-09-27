import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
// Allow a pre-installed Chromium (e.g. cloud dev containers) instead of `playwright install`.
const fallbackChromium = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const chromiumPath =
  process.env.PLAYWRIGHT_CHROMIUM_PATH ??
  (existsSync(fallbackChromium) ? fallbackChromium : undefined);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    locale: "nl-NL",
    launchOptions: chromiumPath ? { executablePath: chromiumPath } : undefined,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /smoke|public/ },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `pnpm start --port ${PORT}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
