#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x runtime-managed-lifetime: ${message}`);
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

const spec = readRequired("specs", "features", "runtime-managed-lifetime.md");
const startRuntime = readRequired("scripts", "start-runtime.mjs");
const runtimeLaunch = readRequired("scripts", "runtime-launch-3100.mjs");
const runtimeStop = readRequired("scripts", "runtime-stop-3100.mjs");
const packageJson = JSON.parse(readRequired("package.json"));

for (const needle of [
  "RUNTIME-MANAGED-LIFETIME",
  "stable-health window",
  "records the pid for the process that keeps the local Next standalone runtime alive",
  "does not add network telemetry",
]) {
  assertIncludes(spec, needle, "feature spec");
}

for (const needle of [
  "createRequire",
  "runStandaloneRuntime",
  "process.chdir(standaloneRoot)",
  "require(standaloneServer)",
  "setInterval(() => undefined, 60_000)",
  "await new Promise(() => undefined)",
]) {
  assertIncludes(startRuntime, needle, "start-runtime");
}

for (const unsafe of [
  "useStandalone ? [standaloneServer]",
  "cwd: useStandalone ? standaloneRoot : root",
]) {
  assertExcludes(startRuntime, unsafe, "start-runtime");
}

for (const needle of [
  "waitForStableHealth",
  "stableHealthMs",
  "runtime healthy and stable",
  "pidIsAlive(pid)",
]) {
  assertIncludes(runtimeLaunch, needle, "runtime-launch");
}

for (const needle of [
  "stopWindowsRuntimePid",
  "taskkill",
  "Stop-Process",
  "waitUntilGone(runtime.pid)",
]) {
  assertIncludes(runtimeStop, needle, "runtime-stop");
}

if (
  packageJson.scripts?.["runtime:lifetime:check"] !==
  "node scripts/validate-runtime-managed-lifetime.mjs"
) {
  fail("package.json is missing runtime:lifetime:check");
}

assertIncludes(
  packageJson.scripts?.verify ?? "",
  "npm run runtime:lifetime:check",
  "verify script",
);

console.log("ok runtime-managed-lifetime");
