#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x tool-isolation-substrate: ${message}`);
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

// lib/security/toolIsolationPolicy.ts must exist and define the substrate
const isolationPolicy = readRequired("lib", "security", "toolIsolationPolicy.ts");
assertIncludes(isolationPolicy, "ToolIsolationRequirement", "lib/security/toolIsolationPolicy.ts");
assertIncludes(isolationPolicy, "SANDBOX_APPROVED_EXEC_TOOLS", "lib/security/toolIsolationPolicy.ts");
assertIncludes(isolationPolicy, "getToolIsolationRequirement", "lib/security/toolIsolationPolicy.ts");
assertIncludes(isolationPolicy, "resolveToolIsolationDescriptor", "lib/security/toolIsolationPolicy.ts");

// Feynman exec tools must be in the SANDBOX list
assertIncludes(isolationPolicy, "feynman_replicate_run", "lib/security/toolIsolationPolicy.ts");
assertIncludes(isolationPolicy, "feynman_docker_experiment", "lib/security/toolIsolationPolicy.ts");

// scripts/tool-isolation-runner.mjs must exist
if (!fs.existsSync(path.join(root, "scripts", "tool-isolation-runner.mjs"))) {
  fail("scripts/tool-isolation-runner.mjs is missing");
}
const runner = readRequired("scripts", "tool-isolation-runner.mjs");
assertIncludes(runner, "isolation", "scripts/tool-isolation-runner.mjs");

// Verify package.json wires the script
const packageJsonText = readRequired("package.json");
const packageJson = JSON.parse(packageJsonText);

if (!packageJson.scripts?.["tool:isolation:substrate:check"]) {
  fail("package.json is missing tool:isolation:substrate:check script");
}

console.log("ok tool-isolation-substrate");
