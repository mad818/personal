#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x nexus-release-closure-wave12: ${message}`);
  process.exit(1);
}

function readJson(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) fail(`${relativePath} is missing`);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

const liveGate = readJson("docs/metrics/cp2-operational-live-gate-latest.json");
if (!liveGate.passed || liveGate.gateExitCode !== 0) {
  fail("cp2-operational-live-gate-latest.json must report passed gate");
}

const webRehearsal = readJson("docs/metrics/cp2-web-release-local-rehearsal-latest.json");
if (!webRehearsal.dockerfilePresent) {
  fail("cp2-web-release-local-rehearsal must record Dockerfile present");
}
if (!Array.isArray(webRehearsal.rollbackChecklist) || webRehearsal.rollbackChecklist.length < 3) {
  fail("cp2-web-release-local-rehearsal must include rollback checklist");
}

for (const file of [
  "lib/desktopSigningConfig.ts",
  "scripts/desktop-signing-operator-guide.mjs",
  "scripts/cp2-web-release-local-rehearsal.mjs",
  "scripts/validate-dependabot-github-closure.mjs",
]) {
  if (!fs.existsSync(path.join(root, file))) fail(`${file} is missing`);
}

const apply = fs.readFileSync(
  path.join(root, "scripts", "dependabot-github-closure-apply.mjs"),
  "utf8",
);
if (!apply.includes("fix_started")) {
  fail("dependabot apply must support js-yaml fix_started dismissal");
}

console.log("ok nexus-release-closure-wave12 (CP2 live proof, web rehearsal, signing guide, dependabot verify)");
