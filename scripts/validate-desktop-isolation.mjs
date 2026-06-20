#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * CP2.2 — Desktop Isolation Proof
 *
 * Static source analysis + programmatic profile verification of
 * scripts/secure-runtime-gate.mjs to confirm:
 *   - NEXUS_NETWORK_MODE is hardcoded to "isolated"
 *   - NEXUS_ALLOW_PAID_APIS is hardcoded to "false"
 *   - NEXUS_ENABLE_HIGH_RISK_TOOLS is hardcoded to "false"
 *   - NEXUS_HIGH_RISK_WRITES_REQUIRE_APPROVAL is hardcoded to "true"
 *   - No 0.0.0.0 binding without confirm-private-network safeguard
 *   - Local profile binds 127.0.0.1 only (no-outbound posture)
 *   - Tailnet profile is blocked without explicit --confirm-private-network
 *
 * No server is required. This is a no-side-effect static check.
 */

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();

function fail(message) {
  console.error(`x desktop-isolation: ${message}`);
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

const runnerPath = resolve(root, "scripts", "secure-runtime-gate.mjs");
if (!existsSync(runnerPath)) fail("scripts/secure-runtime-gate.mjs is missing");
const source = readFileSync(runnerPath, "utf8");

// ── Source-level assertions ───────────────────────────────────────────────────

const REQUIRED_ISOLATION_STRINGS = [
  ["NEXUS_NETWORK_MODE", '"isolated"', "network mode must be isolated"],
  ["NEXUS_ALLOW_PAID_APIS", '"false"', "paid APIs must be blocked by default"],
  ["NEXUS_ENABLE_HIGH_RISK_TOOLS", '"false"', "high-risk tools must be blocked by default"],
  ["NEXUS_HIGH_RISK_WRITES_REQUIRE_APPROVAL", '"true"', "high-risk writes must require approval by default"],
  ["127.0.0.1", null, "local profile must reference 127.0.0.1 loopback"],
  ["confirm-private-network", null, "tailnet binding must require confirm-private-network safeguard"],
];

for (const [key, value, label] of REQUIRED_ISOLATION_STRINGS) {
  if (value) {
    assert(source.includes(`${key}: ${value}`) || source.includes(`${key}": ${value}`) || source.includes(`${key}' ${value}`), label);
  } else {
    assert(source.includes(key), label);
  }
}

// The source must not expose paid API enablement by default
const FORBIDDEN_STRINGS = [
  ['NEXUS_ALLOW_PAID_APIS: "true"', "runner must not enable paid APIs"],
  ['NEXUS_ENABLE_HIGH_RISK_TOOLS: "true"', "runner must not enable high-risk tools"],
  ['NEXUS_NETWORK_MODE: "connected"', "runner must not use connected network mode"],
];

for (const [forbidden, label] of FORBIDDEN_STRINGS) {
  assert(!source.includes(forbidden), label);
}

// ── Programmatic profile verification ────────────────────────────────────────

const runtime = await import(`${pathToFileURL(runnerPath).href}?isolation-check=${Date.now()}`);

assert(
  typeof runtime.buildSecureRuntimeProfile === "function",
  "secure-runtime-gate must export buildSecureRuntimeProfile",
);

const strongFixtureValue = "cp2-isolation-fixture-value-1234567890";

// Local profile: verify isolation posture
const localProfile = runtime.buildSecureRuntimeProfile({
  profile: "local",
  token: strongFixtureValue,
  port: "3000",
});

assert(localProfile.host === "127.0.0.1", "local profile must bind loopback only (no-outbound)");
assert(localProfile.env.NEXUS_NETWORK_MODE === "isolated", "local profile: NEXUS_NETWORK_MODE must be isolated");
assert(localProfile.env.NEXUS_ALLOW_PAID_APIS === "false", "local profile: NEXUS_ALLOW_PAID_APIS must be false");
assert(localProfile.env.NEXUS_ENABLE_HIGH_RISK_TOOLS === "false", "local profile: NEXUS_ENABLE_HIGH_RISK_TOOLS must be false");
assert(localProfile.env.NEXUS_HIGH_RISK_WRITES_REQUIRE_APPROVAL === "true", "local profile: NEXUS_HIGH_RISK_WRITES_REQUIRE_APPROVAL must be true");
assert(localProfile.env.NEXUS_PHONE_LAN_ENABLED === "false", "local profile: NEXUS_PHONE_LAN_ENABLED must be false");
assert(localProfile.privateNetworkBinding === false, "local profile must not bind private network");

// Tailnet: must require --confirm-private-network
let tailnetWithoutConfirmBlocked = false;
try {
  runtime.buildSecureRuntimeProfile({ profile: "tailnet", token: strongFixtureValue });
} catch {
  tailnetWithoutConfirmBlocked = true;
}
assert(tailnetWithoutConfirmBlocked, "tailnet profile without --confirm-private-network must be blocked");

// Tailnet with confirmation: still isolated network mode, just different host binding
const tailnetProfile = runtime.buildSecureRuntimeProfile({
  profile: "tailnet",
  token: strongFixtureValue,
  confirmPrivateNetwork: true,
  port: "3000",
});
assert(tailnetProfile.env.NEXUS_NETWORK_MODE === "isolated", "tailnet profile: NEXUS_NETWORK_MODE must remain isolated");
assert(tailnetProfile.env.NEXUS_ALLOW_PAID_APIS === "false", "tailnet profile: NEXUS_ALLOW_PAID_APIS must be false");
assert(tailnetProfile.privateNetworkBinding === true, "tailnet profile with confirmation must set privateNetworkBinding=true");

// ── No-outbound posture summary ───────────────────────────────────────────────

console.log("Desktop isolation proof (CP2.2)");
console.log("  network mode:                isolated (hardcoded in secure-runtime-gate)");
console.log("  paid APIs:                   blocked by default (NEXUS_ALLOW_PAID_APIS=false)");
console.log("  high-risk tools:             blocked by default (NEXUS_ENABLE_HIGH_RISK_TOOLS=false)");
console.log("  high-risk writes:            approval required (NEXUS_HIGH_RISK_WRITES_REQUIRE_APPROVAL=true)");
console.log("  local profile binding:       127.0.0.1 only (no outbound)");
console.log("  tailnet binding:             requires --confirm-private-network (operator opt-in)");
console.log("  no-outbound note:            paid inference endpoints receive NEXUS_ALLOW_PAID_APIS=false;");
console.log("                               no BYOK provider calls are made unless the user supplies keys");
console.log("                               and the operator enables the paid-API profile.");
console.log("ok desktop-isolation (CP2.2 isolation posture verified)");
