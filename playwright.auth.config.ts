import { config as loadEnv } from "dotenv";
import { defineConfig, devices } from "@playwright/test";

loadEnv({ path: ".env.local" });

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3100";
const parsedBaseUrl = new URL(baseURL);
const port = parsedBaseUrl.port || "3100";
const hostname = parsedBaseUrl.hostname || "127.0.0.1";
const nextDistDir = process.env.PLAYWRIGHT_NEXT_DIST_DIR ?? ".next-e2e";
const webServerCommand =
  process.env.PLAYWRIGHT_WEB_SERVER_COMMAND ?? "npm run build && npm run start";

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
    command: webServerCommand,
    url: `${baseURL}/api/health`,
    // Use a deterministic built runtime instead of the hot-reloading dev shell
    // so auth/session/browser suites are not masked by HMR cache churn.
    reuseExistingServer: false,
    timeout: 420_000,
    env: {
      ...process.env,
      PORT: port,
      HOSTNAME: hostname,
      NEXUS_NEXT_DIST_DIR: nextDistDir,
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
