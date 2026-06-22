#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function fail(message) {
  console.error(`x arpg-browser-proof: ${message}`);
  process.exit(1);
}

function readRequired(...segments) {
  const filePath = path.join(repoRoot, ...segments);
  if (!fs.existsSync(filePath)) {
    fail(`${segments.join("/")} is missing`);
  }
  return fs.readFileSync(filePath, "utf8");
}

function assertIncludes(source, needle, label) {
  if (!source.includes(needle)) {
    fail(`${label} is missing ${needle}`);
  }
}

const hqSpec = readRequired("tests", "e2e", "hq-shell.spec.ts");
const playwrightConfig = readRequired("playwright.auth.config.ts");
const packageJson = JSON.parse(readRequired("package.json"));
const readiness = JSON.parse(
  readRequired("lib", "arpgProductionReadinessContent.json"),
);

if (!packageJson.scripts?.["hq:e2e"]) {
  fail("package.json is missing hq:e2e");
}

if (!readiness.releaseGates?.requiredScripts?.includes("hq:e2e")) {
  fail("arpgProductionReadinessContent.json must list hq:e2e in releaseGates.requiredScripts");
}

assertIncludes(playwrightConfig, "start-runtime.mjs", "playwright.auth.config.ts");
assertIncludes(playwrightConfig, "auth-chromium", "playwright.auth.config.ts");

const requiredSpecSignals = [
  "hq-console-shell",
  "hq-focus-game",
  "arpg-phaser-canvas",
  "arpg-adventure-fight",
  "arpg-basic-attack",
  "arpg-damage-number",
  "for (let step = 0; step < 7; step += 1)",
  "hq-lock-split",
  "hq-game-custom-size-chip",
  "arpg-illustrated-asset-bench",
  "hq-command-room-fallback",
  "reducedMotion",
];

for (const signal of requiredSpecSignals) {
  assertIncludes(hqSpec, signal, "tests/e2e/hq-shell.spec.ts");
}

assertIncludes(
  readRequired("components", "home", "office", "OfficeCommandCenter.tsx"),
  'data-testid="hq-console-shell"',
  "OfficeCommandCenter",
);

console.log("ok arpg-browser-proof (structural hq:e2e contract; run npm run hq:e2e for live proof)");
