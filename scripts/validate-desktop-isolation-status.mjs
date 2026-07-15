#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x desktop-isolation-status: ${message}`);
  process.exit(1);
}

function readRequired(...parts) {
  const filePath = path.join(root, ...parts);
  if (!fs.existsSync(filePath)) fail(`${parts.join("/")} is missing`);
  return fs.readFileSync(filePath, "utf8");
}

function requireText(source, needle, label) {
  if (!source.includes(needle)) fail(`${label} is missing ${needle}`);
}

function forbidText(source, needle, label) {
  if (source.includes(needle)) fail(`${label} must not include ${needle}`);
}

const spec = readRequired("specs", "features", "desktop-isolation-status.md");
const runner = readRequired("scripts", "desktop-isolation-status.mjs");
const runtime = readRequired(
  "scripts",
  "check-desktop-isolation-status-runtime.mjs",
);
const routePolicy = readRequired("lib", "security", "routePolicy.ts");
const secureRuntime = readRequired("scripts", "secure-runtime-gate.mjs");
const statusRoute = readRequired("app", "api", "status", "route.ts");
const authSession = readRequired("lib", "authSession.ts");
const runbook = readRequired(
  "docs",
  "deployment",
  "desktop-isolated-acceptance.md",
);
const todo = readRequired("tasks", "todo.md");
const packageJson = JSON.parse(readRequired("package.json"));

for (const needle of [
  "Desktop Isolation Status",
  "application isolation",
  "OS-level no-outbound",
  "packaged_desktop_shell_evidence_required",
]) {
  requireText(spec, needle, "feature spec");
}

for (const needle of [
  "ROUTE_POLICIES",
  "isRouteAllowedInMode",
  "buildSecureRuntimeProfile",
  "buildStaticIsolationEvidence",
  "evaluateLiveIsolationStatus",
  "`${baseUrl}/api/health`",
  "`${baseUrl}/api/status`",
  "x-nexus-internal-auth",
  "desktop-secure",
  "packaged_desktop_shell_evidence_required",
  "os_no_outbound_capture_required",
  "cp22Complete: false",
]) {
  requireText(runner, needle, "status runner");
}

for (const forbidden of [
  "writeFile",
  "appendFile",
  "mkdirSync",
  "rmSync",
  "unlinkSync",
  "spawnSync",
  "Start-Process",
  "runtime:launch",
  "/api/news",
  "/api/prices",
  "/api/tools",
  "/api/mqtt",
  "console.log(token",
  "console.log(process.env.NEXUS_TOKEN",
]) {
  forbidText(runner, forbidden, "status runner");
}

requireText(routePolicy, "ROUTE_POLICIES", "route policy");
requireText(routePolicy, "isRouteAllowedInMode", "route policy");
requireText(secureRuntime, "buildSecureRuntimeProfile", "secure runtime");
requireText(statusRoute, "highRiskWritesRequireApproval", "status route");
requireText(statusRoute, "deploymentProfile", "status route");
requireText(
  authSession,
  'NEXUS_INTERNAL_AUTH_HEADER = "x-nexus-internal-auth"',
  "internal auth contract",
);
requireText(runtime, "static_ready_live_app_proof_pending", "runtime check");
requireText(
  runtime,
  "live_app_isolation_passed_packaged_proof_pending",
  "runtime check",
);
requireText(runbook, "npm run desktop:isolation:status", "operator runbook");
requireText(todo, "DESKTOP-ISOLATION-STATUS", "task queue");

const expected = {
  "desktop:isolation:status":
    "node --no-warnings --experimental-strip-types scripts/desktop-isolation-status.mjs",
  "desktop:isolation:runtime:check":
    "node --no-warnings --experimental-strip-types scripts/check-desktop-isolation-status-runtime.mjs",
  "desktop:isolation:check":
    "node scripts/validate-desktop-isolation-status.mjs && npm run desktop:isolation:runtime:check",
};
for (const [name, command] of Object.entries(expected)) {
  if (packageJson.scripts?.[name] !== command) {
    fail(`package.json ${name} must equal ${command}`);
  }
}
requireText(
  packageJson.scripts?.verify ?? "",
  "npm run desktop:isolation:check",
  "verify script",
);

console.log("ok desktop-isolation-status");
