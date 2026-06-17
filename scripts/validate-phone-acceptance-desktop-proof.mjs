#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x phone-acceptance-desktop-proof: ${message}`);
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

const spec = readRequired("specs", "features", "phone-acceptance-desktop-proof.md");
const runner = readRequired("scripts", "phone-acceptance-desktop-proof.mjs");
const packageJsonText = readRequired("package.json");
const packageJson = JSON.parse(packageJsonText);

assertIncludes(spec, "PHONE-ACCEPTANCE-DESKTOP-PROOF", "feature spec");
assertIncludes(spec, "phone:acceptance:desktop-proof", "feature spec");
assertIncludes(spec, "Do not simulate physical phone/iPad proof", "feature spec");
assertIncludes(spec, "NEXUS_NETWORK_MODE=isolated", "feature spec");
assertIncludes(spec, "NEXUS_RUNTIME_HEALTH_HOST=127.0.0.1", "feature spec");

assertIncludes(runner, "PHONE_ACCEPTANCE_DESKTOP_PROOF_STEPS", "desktop-proof runner");
assertIncludes(runner, "desktop:build-runtime", "desktop-proof runner");
assertIncludes(runner, "runtime:stop:3100", "desktop-proof runner");
assertIncludes(runner, "runtime:launch:3100", "desktop-proof runner");
assertIncludes(runner, "phone:acceptance:capture", "desktop-proof runner");
assertIncludes(runner, "phone:acceptance:report", "desktop-proof runner");
assertIncludes(runner, "NEXUS_PHONE_LAN_ENABLED", "desktop-proof runner");
assertIncludes(runner, "NEXUS_NETWORK_MODE", "desktop-proof runner");
assertIncludes(runner, "NEXUS_ALLOW_PAID_APIS", "desktop-proof runner");
assertIncludes(runner, "NEXUS_ENABLE_HIGH_RISK_TOOLS", "desktop-proof runner");
assertIncludes(runner, "NEXUS_RUNTIME_HOST", "desktop-proof runner");
assertIncludes(runner, "NEXUS_RUNTIME_HEALTH_HOST", "desktop-proof runner");
assertIncludes(runner, "--keep-running", "desktop-proof runner");
assertIncludes(runner, "--skip-build", "desktop-proof runner");
assertIncludes(runner, "--check", "desktop-proof runner");
assertIncludes(runner, "spawnSync", "desktop-proof runner");
assertIncludes(runner, "finally", "desktop-proof runner");
assertIncludes(runner, "process.exit", "desktop-proof runner");

for (const unsafe of [
  "--phone-opened",
  "--phone-login",
  "--browser-storage",
  "--ping-receipt",
  "--local-ai-receipt",
  "--pwa-installed",
  ".env.local",
  "data/phone-acceptance-receipts",
  "NEXUS_TOKEN",
  "authorization",
  "cookie",
  "github.com",
  "git ",
  "npm install",
  "fetch(",
  "screenshot",
  "transcript",
  "promptText",
  "responseText",
]) {
  assertExcludes(runner, unsafe, "desktop-proof runner");
}

if (
  packageJson.scripts?.["phone:acceptance:desktop-proof"] !==
  "node scripts/phone-acceptance-desktop-proof.mjs"
) {
  fail("package.json is missing phone:acceptance:desktop-proof");
}

if (
  packageJson.scripts?.["phone:acceptance:desktop-proof:check"] !==
  "node scripts/validate-phone-acceptance-desktop-proof.mjs"
) {
  fail("package.json is missing phone:acceptance:desktop-proof:check");
}

assertIncludes(
  packageJson.scripts?.["phone:acceptance:receipts:check"] ?? "",
  "phone:acceptance:desktop-proof:check",
  "phone:acceptance:receipts:check",
);

console.log("ok phone-acceptance-desktop-proof");
