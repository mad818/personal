#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

function fail(message) {
  errors.push(message);
}

function requireFile(relativePath) {
  const filePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(filePath)) {
    fail(`missing ${relativePath}`);
    return null;
  }
  return filePath;
}

function requireIncludes(relativePath, needle, label) {
  const filePath = requireFile(relativePath);
  if (!filePath) return;
  const source = fs.readFileSync(filePath, "utf8");
  if (!source.includes(needle)) {
    fail(`${label || relativePath} must mention ${needle}`);
  }
}

const packagePath = requireFile("package.json");
const packageJson = packagePath ? JSON.parse(fs.readFileSync(packagePath, "utf8")) : { scripts: {} };

const requiredScripts = [
  "phone:acceptance:desktop-proof",
  "phone:acceptance:desktop-proof:check",
  "phone:acceptance:session",
  "phone:acceptance:session:check",
  "phone:acceptance:capture",
  "phone:acceptance:report",
  "phone:acceptance:guide",
  "phone:acceptance:receipts:check",
  "phone:lan:check",
  "offline:local:check",
  "ops:first-three:check",
];

for (const script of requiredScripts) {
  if (!packageJson.scripts?.[script]) {
    fail(`package.json is missing ${script}`);
  }
}

requireFile("specs/features/phone-acceptance-desktop-proof.md");
requireFile("specs/features/phone-acceptance-session.md");
requireFile("scripts/phone-acceptance-desktop-proof.mjs");
requireFile("scripts/phone-acceptance-session.mjs");
requireFile("scripts/first-three-operational-closure.mjs");

requireIncludes(
  "scripts/first-three-operational-closure.mjs",
  "desktopLaneComplete",
  "first-three closure",
);
requireIncludes(
  "scripts/first-three-operational-closure.mjs",
  "desktop_complete",
  "first-three closure",
);
requireIncludes(
  "specs/features/phone-acceptance-desktop-proof.md",
  "Do not simulate physical phone/iPad proof",
  "desktop proof spec",
);

if (errors.length) {
  console.error("x phone-acceptance-code-lane:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  "ok phone-acceptance-code-lane (desktop/session/capture/report tooling wired; physical phone/iPad proof remains manual)",
);
