#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * CP2.4 — Launch Gate Static Validator
 *
 * Verifies that:
 *   - scripts/cp2-local-launch-gate.mjs exists and references all required checks
 *   - The spec exists and documents CP2.4 gates
 *   - npm scripts cp2:local:launch-gate and cp2:local:launch-gate:check are wired
 *
 * No server required. No side effects.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x cp2-local-launch-gate: ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function readRequired(...parts) {
  const filePath = join(root, ...parts);
  if (!existsSync(filePath)) fail(`${parts.join("/")} is missing`);
  return readFileSync(filePath, "utf8");
}

const gateSource = readRequired("scripts", "cp2-local-launch-gate.mjs");
const spec = readRequired("specs", "features", "cp2-local-release-gates.md");
const packageJson = JSON.parse(readRequired("package.json"));

// ── Spec assertions ────────────────────────────────────────────────────────

assert(spec.includes("CP2-LOCAL-RELEASE-GATES"), "spec must contain CP2-LOCAL-RELEASE-GATES contract ID");
assert(spec.includes("type-check"), "spec must document type-check gate");
assert(spec.includes("lint"), "spec must document lint gate");
assert(spec.includes("route:integrity"), "spec must document route:integrity gate");
assert(spec.includes("eval:agent-runtime:ci"), "spec must document eval:agent-runtime:ci gate");
assert(spec.includes("release:smoke"), "spec must document release:smoke gate");
assert(spec.includes("server-required"), "spec must document server-required skip condition");

// ── Gate source assertions ─────────────────────────────────────────────────

const REQUIRED_IN_GATE = [
  ["type-check", "must include type-check gate"],
  ["lint", "must include lint gate"],
  ["route:integrity", "must include route:integrity gate"],
  ["eval:agent-runtime:ci", "must include eval:agent-runtime:ci gate"],
  ["release:smoke", "must include release:smoke gate"],
  ["auth-regression", "must include auth-regression gate"],
  ["server-required", "must document server-required skip condition"],
  ["token-required", "must document token-required skip condition"],
  ["isServerReachable", "must probe server reachability before server-required checks"],
  ["hardFailures", "must track hard failures from static checks"],
];

for (const [token, label] of REQUIRED_IN_GATE) {
  assert(gateSource.includes(token), `cp2-local-launch-gate.mjs: ${label}`);
}

// ── Package.json wiring ────────────────────────────────────────────────────

assert(
  packageJson.scripts?.["cp2:local:launch-gate"] === "node scripts/cp2-local-launch-gate.mjs",
  "package.json is missing cp2:local:launch-gate",
);
assert(
  packageJson.scripts?.["cp2:local:launch-gate:check"] === "node scripts/validate-cp2-local-launch-gate.mjs",
  "package.json is missing cp2:local:launch-gate:check",
);
assert(
  packageJson.scripts?.["desktop:isolation:check"] === "node scripts/validate-desktop-isolation.mjs",
  "package.json is missing desktop:isolation:check",
);

// ── Verify wiring ──────────────────────────────────────────────────────────

assert(
  packageJson.scripts?.verify?.includes("npm run desktop:isolation:check"),
  "verify chain must include desktop:isolation:check",
);
assert(
  packageJson.scripts?.verify?.includes("npm run cp2:local:launch-gate:check"),
  "verify chain must include cp2:local:launch-gate:check",
);

console.log("ok cp2-local-launch-gate (spec / gate source / package.json wiring verified)");
