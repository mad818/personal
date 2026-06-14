#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x phone-acceptance-guide-cli: ${message}`);
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

const spec = readRequired("specs", "features", "phone-acceptance-guide-cli.md");
const runner = readRequired("scripts", "phone-acceptance-guide.mjs");
const packageJsonText = readRequired("package.json");
const packageJson = JSON.parse(packageJsonText);

assertIncludes(spec, "PHONE-ACCEPTANCE-GUIDE-CLI", "feature spec");
assertIncludes(spec, "phone:acceptance:guide", "feature spec");
assertIncludes(spec, "No network calls", "feature spec");
assertIncludes(spec, "Do not simulate proof", "feature spec");

assertIncludes(runner, "PHONE_ACCEPTANCE_GUIDE_FIELDS", "guide runner");
assertIncludes(runner, "phone-local-acceptance-", "guide runner");
assertIncludes(runner, "networkInterfaces", "guide runner");
assertIncludes(runner, "lanHqUrls", "guide runner");
assertIncludes(runner, "proofChecklist", "guide runner");
assertIncludes(runner, "manualFallbackCommand", "guide runner");
assertIncludes(runner, "npm run phone:lan:start", "guide runner");
assertIncludes(runner, "npm run phone:acceptance:capture", "guide runner");
assertIncludes(runner, "npm run phone:acceptance:report", "guide runner");
assertIncludes(runner, "npm run offline:local:report", "guide runner");
assertIncludes(runner, "npm run ops:first-three", "guide runner");
assertIncludes(runner, "No network calls are made", "guide runner");
assertIncludes(runner, "--file=", "guide runner");
assertIncludes(runner, "--dir=", "guide runner");
assertIncludes(runner, "--json", "guide runner");
assertIncludes(runner, "--check", "guide runner");
assertIncludes(runner, "process.exit(0)", "guide runner");

for (const unsafe of [
  "fetch(",
  "github.com",
  "git ",
  "spawn",
  "exec",
  "writeFile",
  "appendFile",
  ".env.local",
  "data/phone-acceptance-receipts",
  "authorization",
  "cookie",
  "rawLanIp",
  "screenshot",
  "transcript",
  "promptText",
  "responseText",
]) {
  assertExcludes(runner, unsafe, "guide runner");
}

if (
  packageJson.scripts?.["phone:acceptance:guide"] !==
  "node scripts/phone-acceptance-guide.mjs"
) {
  fail("package.json is missing phone:acceptance:guide");
}

if (
  packageJson.scripts?.["phone:acceptance:guide:check"] !==
  "node scripts/validate-phone-acceptance-guide-cli.mjs"
) {
  fail("package.json is missing phone:acceptance:guide:check");
}

assertIncludes(
  packageJson.scripts?.["phone:acceptance:receipts:check"] ?? "",
  "phone:acceptance:guide:check",
  "phone:acceptance:receipts:check",
);

console.log("ok phone-acceptance-guide-cli");
