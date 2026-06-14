#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x phone-acceptance-capture-status: ${message}`);
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
  "phone-acceptance-capture-status.md",
);
const captureScript = readProjectFile("scripts", "phone-acceptance-capture.mjs");
const rollupScript = readProjectFile("scripts", "readiness-rollup.mjs");
const packageJson = JSON.parse(readProjectFile("package.json"));

assertIncludes(spec, "PHONE-ACCEPTANCE-CAPTURE-STATUS", "feature spec");
assertIncludes(captureScript, "payload?.status", "capture script");
assertIncludes(captureScript, "receiptLiveStatus", "capture script");
assertIncludes(captureScript, "missingReceiptProofItems", "capture script");
assertIncludes(captureScript, "buildMissingReceiptProofItems", "capture script");
assertIncludes(captureScript, "item.passed", "capture script");
assertIncludes(captureScript, "item.label", "capture script");
assertIncludes(captureScript, "receipts.status", "capture script");
assertIncludes(captureScript, "status?.acceptanceReady", "capture script");
assertIncludes(rollupScript, "receiptLiveStatus", "readiness rollup");
assertIncludes(rollupScript, "missingReceiptProofItems", "readiness rollup");
for (const unsafe of [
  "userAgent",
  "rawLanIp",
  "sourceText",
  "transcript",
]) {
  assertExcludes(captureScript, unsafe, "capture script");
}

if (!packageJson.scripts?.["phone:acceptance:capture:check"]) {
  fail("package.json is missing phone:acceptance:capture:check");
}
if (
  !packageJson.scripts?.["phone:acceptance:receipts:check"]?.includes(
    "phone:acceptance:capture:check",
  )
) {
  fail("phone:acceptance:receipts:check does not run phone:acceptance:capture:check");
}

console.log("ok phone-acceptance-capture-status");
