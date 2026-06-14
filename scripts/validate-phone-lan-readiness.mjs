#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readProjectFile(...segments) {
  return fs.readFileSync(path.join(repoRoot, ...segments), "utf8");
}

function fail(message) {
  console.error(`❌ phone-lan: ${message}`);
  process.exit(1);
}

function assertIncludes(source, needle, label) {
  if (!source.includes(needle)) {
    fail(`${label} is missing ${needle}`);
  }
}

const packageJson = JSON.parse(readProjectFile("package.json"));
const envExample = readProjectFile(".env.example");
const phoneLanDoc = readProjectFile("docs", "deployment", "phone-access-free-local.md");
const coolifyDoc = readProjectFile("docs", "deployment", "phone-access-coolify.md");
const deploymentReadme = readProjectFile("docs", "deployment", "README.md");
const lanStartScript = readProjectFile("scripts", "phone-lan-start.mjs");
const phoneAcceptanceCaptureScript = readProjectFile(
  "scripts",
  "phone-acceptance-capture.mjs",
);
const phoneAcceptanceQrValidator = readProjectFile(
  "scripts",
  "validate-phone-acceptance-qr-handoff.mjs",
);
const readinessPanel = readProjectFile(
  "components",
  "ui",
  "FreeLocalReadinessPanel.tsx",
);
const readinessRoute = readProjectFile(
  "app",
  "api",
  "free-local-readiness",
  "route.ts",
);

assertIncludes(phoneLanDoc, "desktop stays on", "free phone LAN runbook");
assertIncludes(phoneLanDoc, "NEXUS_PHONE_LAN_ENABLED=true", "free phone LAN runbook");
assertIncludes(phoneLanDoc, "npm run phone:lan:start", "free phone LAN runbook");
assertIncludes(phoneLanDoc, "/hq?focus=hq-chronicle", "free phone LAN runbook");
assertIncludes(phoneLanDoc, "copyable phone home URL", "free phone LAN runbook");
assertIncludes(phoneLanDoc, "Add to Home Screen", "free phone LAN runbook");
assertIncludes(phoneLanDoc, "Tailscale", "free phone LAN runbook");
assertIncludes(phoneLanDoc, "no in-app charges", "free phone LAN runbook");
assertIncludes(coolifyDoc, "optional hosted mode", "Coolify phone runbook");
assertIncludes(deploymentReadme, "phone-access-free-local.md", "deployment readme");
assertIncludes(envExample, "NEXUS_PHONE_LAN_ENABLED=false", "env example");
assertIncludes(lanStartScript, "NEXUS_PHONE_LAN_ENABLED", "LAN launcher");
assertIncludes(lanStartScript, "0.0.0.0", "LAN launcher");
assertIncludes(lanStartScript, "HQ phone URLs", "LAN launcher");
assertIncludes(lanStartScript, "/hq?focus=hq-chronicle", "LAN launcher");
assertIncludes(phoneAcceptanceCaptureScript, "phone-local-acceptance-", "phone acceptance capture");
assertIncludes(phoneAcceptanceCaptureScript, "manualPhoneProof", "phone acceptance capture");
assertIncludes(phoneAcceptanceCaptureScript, "acceptanceReady", "phone acceptance capture");
assertIncludes(phoneAcceptanceCaptureScript, "x-nexus-internal-auth", "phone acceptance capture");
assertIncludes(phoneAcceptanceCaptureScript, "<LAN-IP>", "phone acceptance capture");
assertIncludes(readinessPanel, "Copy acceptance steps", "readiness panel");
assertIncludes(readinessPanel, "free-local-phone-handoff-qr", "readiness panel");
assertIncludes(phoneAcceptanceQrValidator, "PHONE-ACCEPTANCE-QR-HANDOFF", "QR validator");
assertIncludes(readinessRoute, "phoneLan", "readiness route");
assertIncludes(readinessRoute, "preferredHqLanUrl", "readiness route");

if (!packageJson.scripts?.["phone:lan:start"]) {
  fail("package.json is missing phone:lan:start");
}
if (!packageJson.scripts?.["phone:lan:check"]) {
  fail("package.json is missing phone:lan:check");
}
if (!packageJson.scripts?.["phone:acceptance:capture"]) {
  fail("package.json is missing phone:acceptance:capture");
}

console.log(
  "Phone LAN readiness OK (free local runbook, opt-in LAN launcher, env defaults, and readiness surfacing wired).",
);
