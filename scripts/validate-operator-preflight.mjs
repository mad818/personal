#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x operator-preflight: ${message}`);
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

const spec = readRequired("specs", "features", "operator-preflight-runner.md");
const runner = readRequired("scripts", "operator-preflight.mjs");
const packageJsonText = readRequired("package.json");
const packageJson = JSON.parse(packageJsonText);

assertIncludes(spec, "OPERATOR-PREFLIGHT-RUNNER", "feature spec");
assertIncludes(runner, "OPERATOR_PREFLIGHT_CHECKS", "preflight runner");
assertIncludes(runner, "handoff:check", "preflight runner");
assertIncludes(runner, "offline:local:check", "preflight runner");
assertIncludes(runner, "phone:access:check", "preflight runner");
assertIncludes(runner, "phone:lan:check", "preflight runner");
assertIncludes(runner, "publication:safety:check", "preflight runner");
assertIncludes(runner, "security-scan", "preflight runner");
assertIncludes(runner, "spawnSync", "preflight runner");
assertIncludes(runner, 'stdio: "pipe"', "preflight runner");
assertIncludes(runner, "Physical phone/iPad acceptance remains manual", "preflight runner");
assertIncludes(runner, "process.exit(hasFailures ? 1 : 0)", "preflight runner");

for (const unsafe of [
  "fetch(",
  "curl",
  "github.com",
  "git push",
  "git pull",
  "docker",
  ".env.local",
  "NEXUS_TOKEN",
  "process.env.NEXUS",
]) {
  assertExcludes(runner, unsafe, "preflight runner");
}

if (packageJson.scripts?.["ops:preflight"] !== "node scripts/operator-preflight.mjs") {
  fail("package.json is missing ops:preflight");
}

if (
  packageJson.scripts?.["ops:preflight:check"] !==
  "node scripts/validate-operator-preflight.mjs"
) {
  fail("package.json is missing ops:preflight:check");
}

assertIncludes(
  packageJson.scripts?.verify ?? "",
  "npm run ops:preflight:check",
  "verify script",
);

console.log("ok operator-preflight");
