import { config as loadEnv } from "dotenv";
import { defineConfig, devices } from "@playwright/test";

loadEnv({ path: ".env.local" });

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3100";
const port = new URL(baseURL).port || "3100";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: ["*.spec.ts"],
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never" }]]
    : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
    headless: true,
  },
  webServer: {
    command: "npm run dev",
    url: `${baseURL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      ...process.env,
      PORT: port,
    },
  },
  projects: [
    {
      name: "auth-chromium",
      use: {
        ...devices["Desktop Chrome"],
        channel: process.platform === "win32" ? "msedge" : undefined,
      },
    },
  ],
});
