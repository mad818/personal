#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x dependabot-open-alert-closure: ${message}`);
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

const spec = readRequired("specs", "features", "dependabot-open-alert-closure.md");
const runner = readRequired("scripts", "dependabot-open-alert-closure.mjs");
const packageJson = JSON.parse(readRequired("package.json"));

for (const needle of [
  "DEPENDABOT-OPEN-ALERT-CLOSURE",
  "js-yaml",
  "glib",
  "not_used",
  "Do not call GitHub, npm, cargo, crates.io, or any remote service.",
]) {
  assertIncludes(spec, needle, "feature spec");
}

for (const needle of [
  "DEPENDABOT_OPEN_ALERT_CLOSURE_FIELDS",
  "node_modules/js-yaml",
  "packageJson?.overrides?.[\"js-yaml\"]",
  "desktop/src-tauri/Cargo.lock",
  "desktop/src-tauri/tauri.conf.json",
  "desktop/tauri-template/tauri.conf.secure.example.json",
  "linuxBundleTargets",
  "not_used",
  "--check",
  "--json",
]) {
  assertIncludes(runner, needle, "closure runner");
}

for (const unsafe of [
  "fetch(",
  "https://",
  "gh api",
  "npm install",
  "cargo update",
  "writeFile",
  "dismissed",
  "authorization",
  "NEXUS_TOKEN",
]) {
  assertExcludes(runner, unsafe, "closure runner");
}

if (
  packageJson.scripts?.["dependabot:open:closure"] !==
  "node scripts/dependabot-open-alert-closure.mjs"
) {
  fail("package.json is missing dependabot:open:closure");
}

if (
  packageJson.scripts?.["dependabot:open:closure:check"] !==
  "node scripts/validate-dependabot-open-alert-closure.mjs && node scripts/dependabot-open-alert-closure.mjs --check"
) {
  fail("package.json is missing dependabot:open:closure:check");
}

assertIncludes(
  packageJson.scripts?.["validate:infra-hardening"] ?? "",
  "dependabot:open:closure:check",
  "validate:infra-hardening",
);

console.log("ok dependabot-open-alert-closure");
