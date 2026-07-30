#!/usr/bin/env node
/* eslint-disable no-console */

import { config as loadEnv } from "dotenv";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import sharp from "sharp";

loadEnv({ path: ".env.local", quiet: true });

const root = process.cwd();
const outputRoot = path.resolve(root, "output", "playwright");
const pngPath = path.join(outputRoot, "nexus-prime-hq-showcase.png");
const outputPath = path.join(outputRoot, "nexus-prime-hq-showcase.webp");

function fail(message) {
  console.error(`x readme-showcase-capture: ${message}`);
  process.exit(1);
}

function readArg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function showHelp() {
  console.log(`Nexus Prime README showcase capture

Usage:
  npm run readme:showcase:capture
  npm run readme:showcase:capture -- --base-url http://127.0.0.1:3100

Required:
  NEXUS_TOKEN
  NEXUS_SHOWCASE_CAPTURE_CONFIRM_PUBLIC_STATE=1

Output:
  output/playwright/nexus-prime-hq-showcase.webp`);
}

function requireLoopbackBaseUrl(rawValue) {
  let url;

  try {
    url = new URL(rawValue);
  } catch {
    fail("--base-url must be a valid URL");
  }

  if (url.protocol !== "http:") {
    fail("capture requires a loopback HTTP runtime");
  }

  if (!["127.0.0.1", "localhost", "::1"].includes(url.hostname)) {
    fail("capture refuses non-loopback runtimes");
  }

  url.pathname = "/";
  url.search = "";
  url.hash = "";
  return url;
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    showHelp();
    return;
  }

  if (process.env.NEXUS_SHOWCASE_CAPTURE_CONFIRM_PUBLIC_STATE !== "1") {
    fail(
      "set NEXUS_SHOWCASE_CAPTURE_CONFIRM_PUBLIC_STATE=1 only after confirming the runtime contains publish-safe state",
    );
  }

  const token = process.env.NEXUS_TOKEN?.trim();
  if (!token) {
    fail("NEXUS_TOKEN is required but will never be printed or stored");
  }

  const baseUrl = requireLoopbackBaseUrl(
    readArg("--base-url") ??
      process.env.PLAYWRIGHT_BASE_URL ??
      "http://127.0.0.1:3100",
  );

  await mkdir(outputRoot, { recursive: true });
  await rm(pngPath, { force: true });
  await rm(outputPath, { force: true });

  const browser = await chromium.launch({
    headless: true,
    channel: process.platform === "win32" ? "msedge" : undefined,
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1600, height: 720 },
      deviceScaleFactor: 1,
      colorScheme: "dark",
      reducedMotion: "reduce",
      locale: "en-US",
    });
    const page = await context.newPage();

    await page.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });

    const authResponse = await page.request.post(
      new URL("/api/token", baseUrl).toString(),
      {
        data: { token, elevate: true },
      },
    );
    if (!authResponse.ok()) {
      fail(`local authentication returned HTTP ${authResponse.status()}`);
    }

    await page.goto(new URL("/hq", baseUrl).toString(), {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
    await page.getByTestId("toprail-brand").waitFor({
      state: "visible",
      timeout: 20_000,
    });

    const consoleShell = page.locator("#hq-console-shell");
    if (!(await consoleShell.isVisible().catch(() => false))) {
      const showFullHq = page.getByRole("button", { name: "Show full HQ" });
      if (await showFullHq.isVisible().catch(() => false)) {
        await showFullHq.click();
      }
    }
    await consoleShell.waitFor({
      state: "visible",
      timeout: 20_000,
    });
    await page.evaluate(() => window.scrollTo({ top: 0, left: 0 }));
    const repairNotice = page.getByTestId("persisted-shell-state-notice");
    if (await repairNotice.isVisible().catch(() => false)) {
      await repairNotice.waitFor({ state: "hidden", timeout: 10_000 });
    }
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(5_000);

    const visibleText = await page.locator("body").innerText();
    if (visibleText.includes(token)) {
      fail(
        "capture refused because the runtime token appeared in visible text",
      );
    }

    await page.screenshot({
      path: pngPath,
      type: "png",
      fullPage: false,
      animations: "disabled",
      caret: "hide",
    });

    await sharp(pngPath).webp({ quality: 88, effort: 6 }).toFile(outputPath);
    await rm(pngPath, { force: true });
    await context.close();
  } finally {
    await browser.close();
  }

  console.log(
    "ok readme-showcase-capture (1600x720, loopback-only, publish-safe acknowledgement required)",
  );
  console.log(
    `artifact: ${path.relative(root, outputPath).replaceAll("\\", "/")}`,
  );
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
