#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x windows-optimization-advisor: ${message}`);
  process.exit(1);
}

function readRequired(...parts) {
  const relative = parts.join("/");
  const filePath = path.join(root, ...parts);
  if (!fs.existsSync(filePath)) fail(`${relative} is missing`);
  return fs.readFileSync(filePath, "utf8");
}

function requireAll(source, label, needles) {
  for (const needle of needles) {
    if (!source.includes(needle)) fail(`${label} is missing ${needle}`);
  }
}

function excludeAll(source, label, needles) {
  for (const needle of needles) {
    if (source.includes(needle)) fail(`${label} must not include ${needle}`);
  }
}

const spec = readRequired("specs", "features", "windows-optimization-advisor.md");
const helper = readRequired("lib", "windowsOptimizationAdvisor.ts");
const server = readRequired("lib", "windowsOptimizationAdvisorServer.ts");
const collector = readRequired("scripts", "windows-optimization-snapshot.ps1");
const cli = readRequired("scripts", "windows-optimization-advisor.mjs");
const route = readRequired("app", "api", "windows-optimization-advisor", "route.ts");
const routePolicy = readRequired("lib", "security", "routePolicy.ts");
const parity = JSON.parse(
  readRequired("docs", "ideas", "source-parity", "optimizerduck.json"),
);
const packageJson = JSON.parse(readRequired("package.json"));

requireAll(spec, "feature spec", [
  "read-only",
  "risk-rated recommendations",
  "restore point",
  "Do not request elevation",
]);
requireAll(helper, "advisor helper", [
  "normalizeWindowsOptimizationSnapshot",
  "buildWindowsOptimizationAdvisor",
  "external-review-only",
  "requiresElevation: false",
]);
requireAll(server, "advisor server helper", [
  "execFile",
  "windows-optimization-snapshot.ps1",
  "windowsHide: true",
  "shell: false",
]);
requireAll(route, "protected advisor route", ["protectedJson", "collectWindowsOptimizationAdvisor"]);
requireAll(routePolicy, "route policy", ['/api/windows-optimization-advisor']);
requireAll(cli, "advisor CLI", ["collectWindowsOptimizationAdvisor", "--json", "Read-only"]);
requireAll(collector, "PowerShell collector", [
  "Get-CimInstance",
  "Get-Service",
  "Get-ScheduledTask",
  "ConvertTo-Json",
]);
excludeAll(collector, "PowerShell collector", [
  "Set-Item",
  "Set-Service",
  "Remove-Item",
  "Remove-AppxPackage",
  "Disable-ScheduledTask",
  "Enable-ScheduledTask",
  "Start-Process",
  "Checkpoint-Computer",
  "powercfg",
]);
excludeAll(server, "advisor server helper", ["process.env", "shell: true", "exec("]);

if (parity.status !== "complete") fail("optimizerDuck parity must be complete");
if (parity.capabilities.some((capability) => capability.disposition === "pending")) {
  fail("optimizerDuck parity still has pending capabilities");
}
if (
  packageJson.scripts?.["windows:optimization:advisor"] !==
  "node --no-warnings --experimental-strip-types scripts/windows-optimization-advisor.mjs"
) {
  fail("package.json is missing windows:optimization:advisor");
}
if (
  packageJson.scripts?.["windows:optimization:runtime:check"] !==
  "node --no-warnings --experimental-strip-types scripts/check-windows-optimization-advisor-runtime.mjs"
) {
  fail("package.json is missing windows:optimization:runtime:check");
}
if (
  packageJson.scripts?.["windows:optimization:check"] !==
  "node scripts/validate-windows-optimization-advisor.mjs && npm run windows:optimization:runtime:check"
) {
  fail("package.json is missing windows:optimization:check");
}
if (!(packageJson.scripts?.verify ?? "").includes("npm run windows:optimization:check")) {
  fail("verify is missing windows:optimization:check");
}

console.log("ok windows-optimization-advisor");
