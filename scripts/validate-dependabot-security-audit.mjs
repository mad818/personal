#!/usr/bin/env node
/* eslint-disable no-console */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x dependabot-security-audit: ${message}`);
  process.exit(1);
}

function readRequired(...parts) {
  const fullPath = join(root, ...parts);
  if (!existsSync(fullPath)) {
    fail(`${parts.join("/")} is missing`);
  }
  return readFileSync(fullPath, "utf8");
}

function assertIncludes(text, expected, label) {
  if (!text.includes(expected)) {
    fail(`${label} must include ${JSON.stringify(expected)}`);
  }
}

const spec = readRequired("specs", "features", "dependabot-alert-import-triage.md");
const runner = readRequired("scripts", "dependabot-security-audit.mjs");
const packageJson = JSON.parse(readRequired("package.json"));

assertIncludes(spec, "Dependabot Alert Import Triage", "feature spec");
assertIncludes(spec, "--alerts=docs\\metrics\\dependabot-alerts-source.json", "feature spec");
assertIncludes(spec, "Do not upgrade packages", "feature spec");

assertIncludes(runner, "--alerts=", "audit runner");
assertIncludes(runner, "--dry-run", "audit runner");
assertIncludes(runner, "--paginate --slurp", "audit runner");
assertIncludes(runner, "parseAlertImport", "audit runner");
assertIncludes(runner, "classifyImportedAlerts", "audit runner");
assertIncludes(runner, "runtimeImpact", "audit runner");
assertIncludes(runner, "devOnlyImpact", "audit runner");
assertIncludes(runner, "transitiveOwnership", "audit runner");
assertIncludes(runner, "retiredManifest", "audit runner");
assertIncludes(runner, "archive/", "audit runner");
assertIncludes(runner, "firstPatchedVersion", "audit runner");
assertIncludes(runner, "dependabot-alerts-source", "audit runner");
assertIncludes(runner, "upgradesPerformed: false", "audit runner");

readRequired("scripts", "fixtures", "dependabot-alerts-sample.json");

if (
  packageJson.scripts?.["dependabot:audit:check"] !==
  "node scripts/validate-dependabot-security-audit.mjs"
) {
  fail("package.json is missing dependabot:audit:check");
}

assertIncludes(
  packageJson.scripts?.["validate:infra-hardening"] ?? "",
  "dependabot:audit:check",
  "validate:infra-hardening script",
);

console.log("ok dependabot-security-audit");
