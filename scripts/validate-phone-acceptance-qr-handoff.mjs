#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x phone-acceptance-qr-handoff: ${message}`);
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
  "phone-acceptance-qr-handoff.md",
);
const qrHelper = readProjectFile("lib", "phoneHandoffQr.ts");
const readinessPanel = readProjectFile(
  "components",
  "ui",
  "FreeLocalReadinessPanel.tsx",
);
const lanValidator = readProjectFile("scripts", "validate-phone-lan-readiness.mjs");
const packageJson = JSON.parse(readProjectFile("package.json"));

assertIncludes(spec, "PHONE-ACCEPTANCE-QR-HANDOFF", "feature spec");
assertIncludes(qrHelper, "buildPhoneHandoffQrMatrix", "QR helper");
assertIncludes(qrHelper, "PHONE_HANDOFF_QR_VERSION = 6", "QR helper");
assertIncludes(qrHelper, "generateErrorCorrection", "QR helper");
assertIncludes(qrHelper, "TextEncoder", "QR helper");
assertIncludes(qrHelper, "preferredHqLanUrl", "QR helper comment or contract");
assertIncludes(readinessPanel, "buildPhoneHandoffQrMatrix", "readiness panel");
assertIncludes(readinessPanel, "free-local-phone-handoff-qr", "readiness panel");
assertIncludes(readinessPanel, "Scan direct HQ", "readiness panel");
assertIncludes(readinessPanel, "viewBox", "readiness panel");
assertIncludes(readinessPanel, "phoneHandoffQr", "readiness panel");
assertIncludes(lanValidator, "validate-phone-acceptance-qr-handoff.mjs", "LAN validator");

for (const unsafe of [
  "api.qrserver",
  "chart.googleapis",
  "quickchart",
  "qrcode.react",
  "QRCodeStyling",
  "rawLanIp",
  "token=",
  "NEXUS_TOKEN",
]) {
  assertExcludes(qrHelper, unsafe, "QR helper");
}

if (packageJson.dependencies?.qrcode || packageJson.devDependencies?.qrcode) {
  fail("package.json must not add a qrcode dependency");
}

console.log("ok phone-acceptance-qr-handoff");
