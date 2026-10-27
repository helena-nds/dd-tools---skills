// playwright.config.ts: E2E smoke tests against the production build (or against BASE_URL if set)
import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3000);
const BASE_URL = process.env.BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL: BASE_URL, trace: "on-first-retry" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  // Without BASE_URL it starts `next start` (requires `npm run build` first)
  webServer: process.env.BASE_URL
    ? undefined
    : { command: `npm run start -- -p ${PORT}`, url: BASE_URL, reuseExistingServer: !process.env.CI, timeout: 120_000 },
});
