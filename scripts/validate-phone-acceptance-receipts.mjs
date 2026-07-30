#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readProjectFile(...segments) {
  return fs.readFileSync(path.join(repoRoot, ...segments), "utf8");
}

function fail(message) {
  console.error(`x phone-acceptance-receipts: ${message}`);
  process.exit(1);
}

function assertIncludes(source, needle, label) {
  if (!source.includes(needle)) {
    fail(`${label} is missing ${needle}`);
  }
}

function assertMatches(source, pattern, label) {
  if (!pattern.test(source)) {
    fail(`${label} does not match the required contract`);
  }
}

function assertFileExists(...segments) {
  const filePath = path.join(repoRoot, ...segments);
  if (!fs.existsSync(filePath)) {
    fail(`${segments.join("/")} is missing`);
  }
  return fs.readFileSync(filePath, "utf8");
}

const packageJson = JSON.parse(readProjectFile("package.json"));
const gitignore = readProjectFile(".gitignore");
const routePolicy = readProjectFile("lib", "security", "routePolicy.ts");
const readinessPanel = readProjectFile(
  "components",
  "ui",
  "FreeLocalReadinessPanel.tsx",
);
const captureScript = readProjectFile("scripts", "phone-acceptance-capture.mjs");

const receiptHelper = assertFileExists("lib", "phoneAcceptanceReceipts.ts");
const receiptRoute = assertFileExists(
  "app",
  "api",
  "phone-acceptance",
  "receipt",
  "route.ts",
);

assertIncludes(receiptHelper, "PHONE_ACCEPTANCE_RECEIPT_VERSION", "receipt helper");
assertIncludes(receiptHelper, "summarizePhoneAcceptanceReceipts", "receipt helper");
assertIncludes(receiptHelper, "classifyPhoneAcceptanceDevice", "receipt helper");
assertIncludes(receiptHelper, "data/phone-acceptance-receipts", "receipt helper");
assertIncludes(receiptHelper, "userAgent", "receipt helper");
assertIncludes(receiptHelper, "deviceClass", "receipt helper");
assertIncludes(receiptHelper, "mobileAuthenticated", "receipt helper");

assertIncludes(receiptRoute, "protectedJson", "receipt API route");
assertIncludes(receiptRoute, "readProtectedActionContext", "receipt API route");
assertIncludes(receiptRoute, "appendPhoneAcceptanceReceipt", "receipt API route");
assertIncludes(receiptRoute, "readPhoneAcceptanceReceipts", "receipt API route");

assertMatches(
  routePolicy,
  /\{\s*prefix:\s*"\/api\/phone-acceptance\/receipt",\s*routeClass:\s*"local_only",\s*public:\s*false,?\s*\}/,
  "route policy",
);
assertIncludes(readinessPanel, "/api/phone-acceptance/receipt", "readiness panel");
assertIncludes(readinessPanel, "pwaDisplayMode", "readiness panel");
assertIncludes(readinessPanel, "browserStorageReady", "readiness panel");

assertIncludes(captureScript, "/api/phone-acceptance/receipt", "acceptance capture");
assertIncludes(captureScript, "receiptPhoneProof", "acceptance capture");
assertIncludes(captureScript, "combinedPhoneProof", "acceptance capture");
assertIncludes(captureScript, "mobileAuthenticated", "acceptance capture");

assertIncludes(gitignore, "data/phone-acceptance-receipts*.json", ".gitignore");

if (!packageJson.scripts?.["phone:acceptance:receipts:check"]) {
  fail("package.json is missing phone:acceptance:receipts:check");
}
if (!packageJson.scripts?.["phone:lan:check"]?.includes("phone:acceptance:receipts:check")) {
  fail("phone:lan:check does not run phone:acceptance:receipts:check");
}

console.log(
  "Phone acceptance receipts OK (protected local receipt API, sanitized storage, panel ping, capture merge, and validation wired).",
);
