#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x privacy-shield-v2: ${message}`);
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
    fail(`${label} is missing "${needle}"`);
  }
}

// lib/privacyShieldServer.ts must define the v2 policy constant
const shieldServer = readRequired("lib", "privacyShieldServer.ts");
assertIncludes(shieldServer, "PRIVACY_SHIELD_POLICY", "lib/privacyShieldServer.ts");
assertIncludes(shieldServer, "local_redaction_v2", "lib/privacyShieldServer.ts");

// Status type must include classCounts
assertIncludes(shieldServer, "classCounts", "lib/privacyShieldServer.ts");

// The policy constant must be exported
if (!shieldServer.includes("export const PRIVACY_SHIELD_POLICY")) {
  fail('lib/privacyShieldServer.ts must export PRIVACY_SHIELD_POLICY as "export const"');
}

// classCounts must appear in both type definition and status output
const classCountsOccurrences = (shieldServer.match(/classCounts/g) ?? []).length;
if (classCountsOccurrences < 3) {
  fail(
    "lib/privacyShieldServer.ts must reference classCounts in type definition, state, and status output (at least 3 occurrences)",
  );
}

// Verify package.json wires the script
const packageJsonText = readRequired("package.json");
const packageJson = JSON.parse(packageJsonText);

if (!packageJson.scripts?.["privacy:shield:v2:check"]) {
  fail("package.json is missing privacy:shield:v2:check script");
}

console.log("ok privacy-shield-v2");
