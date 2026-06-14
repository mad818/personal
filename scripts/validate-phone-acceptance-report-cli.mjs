#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x phone-acceptance-report-cli: ${message}`);
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
    fail(`${label} is missing ${needle}`);
  }
}

function assertExcludes(source, needle, label) {
  if (source.includes(needle)) {
    fail(`${label} must not include ${needle}`);
  }
}

const spec = readRequired("specs", "features", "phone-acceptance-report-cli.md");
const runner = readRequired("scripts", "phone-acceptance-report.mjs");
const packageJsonText = readRequired("package.json");
const packageJson = JSON.parse(packageJsonText);

assertIncludes(spec, "PHONE-ACCEPTANCE-REPORT-CLI", "feature spec");
assertIncludes(runner, "PHONE_ACCEPTANCE_REPORT_FIELDS", "report runner");
assertIncludes(runner, "phone-local-acceptance-", "report runner");
assertIncludes(runner, "docs", "report runner");
assertIncludes(runner, "metrics", "report runner");
assertIncludes(runner, "acceptanceReady", "report runner");
assertIncludes(runner, "receiptLiveStatus", "report runner");
assertIncludes(runner, "missingReceiptProofItems", "report runner");
assertIncludes(runner, "combinedPhoneProof", "report runner");
assertIncludes(runner, "No network calls are made", "report runner");
assertIncludes(runner, "process.exit(0)", "report runner");
assertIncludes(runner, "--file=", "report runner");
assertIncludes(runner, "--dir=", "report runner");

for (const unsafe of [
  "fetch(",
  "http://",
  "https://",
  "github.com",
  "git ",
  "spawn",
  "exec",
  "writeFile",
  "appendFile",
  ".env.local",
  "data/phone-acceptance-receipts",
  "NEXUS_TOKEN",
  "process.env",
  "userAgent",
  "rawLanIp",
  "screenshot",
  "transcript",
  "promptText",
  "responseText",
]) {
  assertExcludes(runner, unsafe, "report runner");
}

if (packageJson.scripts?.["phone:acceptance:report"] !== "node scripts/phone-acceptance-report.mjs") {
  fail("package.json is missing phone:acceptance:report");
}

if (
  packageJson.scripts?.["phone:acceptance:report:check"] !==
  "node scripts/validate-phone-acceptance-report-cli.mjs"
) {
  fail("package.json is missing phone:acceptance:report:check");
}

assertIncludes(
  packageJson.scripts?.["phone:acceptance:receipts:check"] ?? "",
  "phone:acceptance:report:check",
  "phone:acceptance:receipts:check",
);
assertIncludes(
  packageJson.scripts?.verify ?? "",
  "npm run phone:lan:check",
  "verify script",
);

console.log("ok phone-acceptance-report-cli");
