#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x first-three-operational-closure: ${message}`);
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

const spec = readRequired("specs", "features", "first-three-operational-closure.md");
const runner = readRequired("scripts", "first-three-operational-closure.mjs");
const packageJsonText = readRequired("package.json");
const packageJson = JSON.parse(packageJsonText);

assertIncludes(spec, "FIRST-THREE-OPERATIONAL-CLOSURE", "feature spec");
assertIncludes(spec, "ops:first-three", "feature spec");
assertIncludes(spec, "No package installs", "feature spec");
assertIncludes(spec, "Do not claim", "feature spec");

assertIncludes(runner, "FIRST_THREE_OPERATIONAL_CLOSURE_FIELDS", "closure runner");
assertIncludes(runner, "DEPENDABOT-POSTCSS-RUNTIME-PATCH", "closure runner");
assertIncludes(runner, "FREE-LOCAL-PHONE-ACCEPTANCE", "closure runner");
assertIncludes(runner, "LOCAL-AI-OFFLINE-OPERATIONS", "closure runner");
assertIncludes(runner, "EXTERNAL-IDEAS-INTAKE", "closure runner");
assertIncludes(runner, "dependabot-security-audit-", "closure runner");
assertIncludes(runner, "phone-local-acceptance-", "closure runner");
assertIncludes(runner, "readiness-rollup-", "closure runner");
assertIncludes(runner, "package-lock.json", "closure runner");
assertIncludes(runner, "postcss", "closure runner");
assertIncludes(runner, "physical_phone_or_ipad", "closure runner");
assertIncludes(runner, "docs/ideas/external-links-mapping.md", "closure runner");
assertIncludes(runner, "docs/plans/nexus-ideas-assimilation-master-backlog.md", "closure runner");
assertIncludes(runner, "No network calls are made", "closure runner");
assertIncludes(runner, "--json", "closure runner");
assertIncludes(runner, "--check", "closure runner");
assertIncludes(runner, "process.exit(0)", "closure runner");

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
  assertExcludes(runner, unsafe, "closure runner");
}

if (packageJson.scripts?.["ops:first-three"] !== "node scripts/first-three-operational-closure.mjs") {
  fail("package.json is missing ops:first-three");
}

if (
  packageJson.scripts?.["ops:first-three:check"] !==
  "node scripts/validate-first-three-operational-closure.mjs"
) {
  fail("package.json is missing ops:first-three:check");
}

assertIncludes(
  packageJson.scripts?.verify ?? "",
  "npm run ops:first-three:check",
  "verify script",
);

console.log("ok first-three-operational-closure");
