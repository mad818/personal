#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x offline-local-ai-report-cli: ${message}`);
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

const spec = readRequired("specs", "features", "offline-local-ai-report-cli.md");
const runner = readRequired("scripts", "offline-local-ai-report.mjs");
const packageJsonText = readRequired("package.json");
const packageJson = JSON.parse(packageJsonText);

assertIncludes(spec, "OFFLINE-LOCAL-AI-REPORT-CLI", "feature spec");
assertIncludes(spec, "protected CLI token readiness", "feature spec");
assertIncludes(runner, "OFFLINE_LOCAL_AI_REPORT_FIELDS", "report runner");
assertIncludes(runner, "readiness-rollup-", "report runner");
assertIncludes(runner, "phone-local-acceptance-", "report runner");
assertIncludes(runner, "localAiOfflineReady", "report runner");
assertIncludes(runner, "localAiReceipt", "report runner");
assertIncludes(runner, "readinessSummary", "report runner");
assertIncludes(runner, "combinedPhoneProof", "report runner");
assertIncludes(runner, "protectedCliReady", "report runner");
assertIncludes(runner, "browserSessionReady", "report runner");
assertIncludes(runner, "tokenConfigured", "report runner");
assertIncludes(runner, "Protected CLI route", "report runner");
assertIncludes(runner, "shouldSkipPhoneLocalReadinessBlocker", "report runner");
assertIncludes(runner, "No network calls are made", "report runner");
assertIncludes(runner, "--rollup=", "report runner");
assertIncludes(runner, "--phone=", "report runner");
assertIncludes(runner, "--dir=", "report runner");
assertIncludes(runner, "process.exit(0)", "report runner");

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

if (packageJson.scripts?.["offline:local:report"] !== "node scripts/offline-local-ai-report.mjs") {
  fail("package.json is missing offline:local:report");
}

if (
  packageJson.scripts?.["offline:local:report:check"] !==
  "node scripts/validate-offline-local-ai-report-cli.mjs"
) {
  fail("package.json is missing offline:local:report:check");
}

assertIncludes(
  packageJson.scripts?.["offline:local:check"] ?? "",
  "offline:local:report:check",
  "offline:local:check",
);
assertIncludes(packageJson.scripts?.verify ?? "", "npm run offline:local:check", "verify script");

console.log("ok offline-local-ai-report-cli");
