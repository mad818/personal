#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Structural check for auth E2E readiness.
 * Windows EPERM fallback: Playwright on Windows may throw EPERM on cache dirs;
 * the auth config must not rely on absolute paths outside the project root.
 * This validator confirms the config and spec files exist and reference expected IDs.
 */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x auth-e2e: ${message}`);
  process.exit(1);
}

function readRequired(...parts) {
  const filePath = path.join(root, ...parts);
  if (!fs.existsSync(filePath)) {
    fail(`${parts.join("/")} is missing`);
  }
  return fs.readFileSync(filePath, "utf8");
}

function assertIncludes(source, needle, label) {
  if (!source.includes(needle)) {
    fail(`${label} is missing "${needle}"`);
  }
}

// Playwright auth config must exist
const config = readRequired("playwright.auth.config.ts");
assertIncludes(config, "testDir", "playwright.auth.config.ts");
assertIncludes(config, "spec.ts", "playwright.auth.config.ts");

// Auth spec must exist under tests/e2e
const authSpec = readRequired("tests", "e2e", "auth.spec.ts");
assertIncludes(authSpec, "auth-gate", "tests/e2e/auth.spec.ts");
assertIncludes(authSpec, "token", "tests/e2e/auth.spec.ts");

// Route contract spec must exist (covers /hq redirect)
const routeSpec = readRequired("tests", "e2e", "route-contract.spec.ts");
assertIncludes(routeSpec, "/hq", "tests/e2e/route-contract.spec.ts");

// Landing public spec must exist
if (!fs.existsSync(path.join(root, "tests", "e2e", "landing-public.spec.ts"))) {
  fail("tests/e2e/landing-public.spec.ts is missing");
}

// Windows EPERM fallback: config must not hardcode absolute paths for auth storage
if (config.includes("C:\\") || config.includes("C:/")) {
  fail(
    "playwright.auth.config.ts contains an absolute Windows path — use path.join(__dirname, ...) to avoid EPERM on Windows",
  );
}

// Verify package.json wires the script
const packageJsonText = readRequired("package.json");
const packageJson = JSON.parse(packageJsonText);

if (!packageJson.scripts?.["auth:e2e"]) {
  fail("package.json is missing auth:e2e script");
}
if (!packageJson.scripts?.["auth:e2e:check"]) {
  fail("package.json is missing auth:e2e:check script");
}

console.log("ok auth-e2e");
