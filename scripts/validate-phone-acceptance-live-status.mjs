#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x phone-acceptance-live-status: ${message}`);
  process.exit(1);
}

function readProjectFile(...parts) {
  const filePath = path.join(root, ...parts);
  if (!fs.existsSync(filePath)) {
    fail(`${parts.join("/")} is missing`);
  }
  return fs.readFileSync(filePath, "utf8");
}

function assertIncludes(text, needle, label) {
  if (!text.includes(needle)) {
    fail(`${label} is missing ${needle}`);
  }
}

function assertExcludes(text, needle, label) {
  if (text.includes(needle)) {
    fail(`${label} must not include ${needle}`);
  }
}

const spec = readProjectFile(
  "specs",
  "features",
  "phone-acceptance-live-status.md",
);
const statusHelper = readProjectFile("lib", "phoneAcceptanceStatus.ts");
const receiptRoute = readProjectFile(
  "app",
  "api",
  "phone-acceptance",
  "receipt",
  "route.ts",
);
const readinessPanel = readProjectFile(
  "components",
  "ui",
  "FreeLocalReadinessPanel.tsx",
);
const packageJson = JSON.parse(readProjectFile("package.json"));

assertIncludes(spec, "PHONE-ACCEPTANCE-LIVE-STATUS", "feature spec");
assertIncludes(statusHelper, "buildPhoneAcceptanceLiveStatus", "status helper");
assertIncludes(statusHelper, "PhoneAcceptanceLiveStatus", "status helper");
for (const proofKey of [
  "phoneOpened",
  "phoneLogin",
  "pingReceipt",
  "localAiReceipt",
  "pwaCapable",
  "pwaInstalled",
]) {
  assertIncludes(statusHelper, proofKey, "status helper");
}
for (const unsafe of [
  "userAgent",
  "Authorization",
  "authorization",
  "Cookie",
  "cookie",
  "rawLanIp",
  "sourceText",
  "transcript",
]) {
  assertExcludes(statusHelper, unsafe, "status helper");
}

assertIncludes(
  receiptRoute,
  "buildPhoneAcceptanceLiveStatus",
  "receipt route",
);
assertIncludes(receiptRoute, "status,", "receipt route");
assertIncludes(readinessPanel, "/api/phone-acceptance/receipt", "readiness panel");
assertIncludes(
  readinessPanel,
  "free-local-phone-acceptance-live-status",
  "readiness panel",
);
assertIncludes(readinessPanel, "phoneAcceptanceStatus", "readiness panel");
assertIncludes(readinessPanel, "Refresh receipt proof", "readiness panel");
assertIncludes(readinessPanel, "try {", "readiness panel");
assertIncludes(readinessPanel, "catch", "readiness panel");

if (!packageJson.scripts?.["phone:acceptance:status:check"]) {
  fail("package.json is missing phone:acceptance:status:check");
}
if (
  !packageJson.scripts?.["phone:acceptance:receipts:check"]?.includes(
    "phone:acceptance:status:check",
  )
) {
  fail("phone:acceptance:receipts:check does not run phone:acceptance:status:check");
}

console.log("ok phone-acceptance-live-status");
