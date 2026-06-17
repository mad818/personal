#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x phone-acceptance-session: ${message}`);
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

const spec = readRequired("specs", "features", "phone-acceptance-session.md");
const runner = readRequired("scripts", "phone-acceptance-session.mjs");
const guide = readRequired("scripts", "phone-acceptance-guide.mjs");
const packageJson = JSON.parse(readRequired("package.json"));

for (const needle of [
  "PHONE-ACCEPTANCE-SESSION",
  "phone:acceptance:session",
  "Do not simulate physical phone/iPad proof",
  "Press Enter",
  "Ctrl+C",
  "--skip-build",
  "--no-wait",
]) {
  assertIncludes(spec, needle, "feature spec");
}

for (const needle of [
  "PHONE_ACCEPTANCE_SESSION_STEPS",
  "runtime:stop:3100",
  "desktop:build-runtime",
  "runtime:launch:3100",
  "phone:acceptance:guide",
  "phone:acceptance:capture",
  "phone:acceptance:report",
  "offline:local:report",
  "ops:first-three",
  "NEXUS_PHONE_LAN_ENABLED",
  "NEXUS_NETWORK_MODE",
  "NEXUS_ALLOW_PAID_APIS",
  "NEXUS_ENABLE_HIGH_RISK_TOOLS",
  "NEXUS_RUNTIME_HEALTH_HOST",
  "--skip-build",
  "--no-wait",
  "--check",
  "SIGINT",
  "readline/promises",
]) {
  assertIncludes(runner, needle, "session runner");
}

for (const unsafe of [
  "--phone-opened",
  "--phone-login",
  "--browser-storage",
  "--ping-receipt",
  "--local-ai-receipt",
  "--pwa-installed",
  ".env.local",
  "data/phone-acceptance-receipts",
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
  assertExcludes(runner, unsafe, "session runner");
}

if (
  packageJson.scripts?.["phone:acceptance:session"] !==
  "node scripts/phone-acceptance-session.mjs"
) {
  fail("package.json is missing phone:acceptance:session");
}

if (
  packageJson.scripts?.["phone:acceptance:session:check"] !==
  "node scripts/validate-phone-acceptance-session.mjs"
) {
  fail("package.json is missing phone:acceptance:session:check");
}

assertIncludes(
  packageJson.scripts?.["phone:acceptance:receipts:check"] ?? "",
  "phone:acceptance:session:check",
  "phone:acceptance:receipts:check",
);
assertIncludes(guide, "phone:acceptance:session", "phone acceptance guide");

console.log("ok phone-acceptance-session");
