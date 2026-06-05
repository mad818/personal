#!/usr/bin/env node
/* eslint-disable no-console */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x privacy-shield-preview-cli: ${message}`);
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

const spec = readRequired("specs", "features", "privacy-shield-preview-cli.md");
const runner = readRequired("scripts", "privacy-shield-preview.mjs");
const server = readRequired("lib", "privacyShieldServer.ts");
const packageJsonText = readRequired("package.json");
const packageJson = JSON.parse(packageJsonText);

assertIncludes(spec, "PRIVACY-SHIELD-PREVIEW-CLI", "feature spec");
assertIncludes(spec, "No AI/provider calls", "feature spec");
assertIncludes(spec, "No network calls", "feature spec");
assertIncludes(spec, "No file reads except stdin", "feature spec");

for (const className of [
  "credential",
  "internal_host",
  "protected_path",
  "sensitive_evidence",
]) {
  assertIncludes(server, className, "runtime privacy shield");
  assertIncludes(runner, className, "preview runner");
}

for (const required of [
  "PRIVACY_SHIELD_PREVIEW_FIELDS",
  "No network calls are made",
  "--stdin",
  "--sample",
  "--text=",
  "--json",
  "--check",
  "dispatchMode",
  "classCounts",
  "blockedReason",
  "safePreview",
  "process.exit(0)",
]) {
  assertIncludes(runner, required, "preview runner");
}

for (const unsafe of [
  "fetch(",
  "node:http",
  "node:https",
  "http.request",
  "https.request",
  "XMLHttpRequest",
  "process.env",
  ".env.local",
  "writeFile",
  "appendFile",
  "spawn(",
  "exec(",
  "github.com",
  "data/phone-acceptance-receipts",
  "NEXUS_TOKEN",
  "document.cookie",
  "headers.get(\"cookie",
]) {
  assertExcludes(runner, unsafe, "preview runner");
}

if (packageJson.scripts?.["privacy:shield:preview"] !== "node scripts/privacy-shield-preview.mjs") {
  fail("package.json is missing privacy:shield:preview");
}

if (
  packageJson.scripts?.["privacy:shield:check"] !==
  "node scripts/validate-privacy-shield-preview-cli.mjs"
) {
  fail("package.json is missing privacy:shield:check");
}

assertIncludes(
  packageJson.scripts?.verify ?? "",
  "npm run privacy:shield:check",
  "verify script",
);

const check = spawnSync(process.execPath, ["scripts/privacy-shield-preview.mjs", "--check"], {
  cwd: root,
  encoding: "utf8",
});

if (check.status !== 0) {
  fail(`preview self-check failed: ${check.stderr || check.stdout}`);
}

for (const leaked of [
  "exampleSecretValue1234567890",
  "anotherSecretValue123456",
  "C:\\Users\\mario\\Desktop\\personal\\secrets\\vault.txt",
]) {
  if (`${check.stdout}\n${check.stderr}`.includes(leaked)) {
    fail(`preview self-check leaked raw sample value ${leaked}`);
  }
}

console.log("ok privacy-shield-preview-cli");
