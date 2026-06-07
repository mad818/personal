#!/usr/bin/env node
/* eslint-disable no-console */

import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();

function fail(message) {
  console.error(`x secure-runtime-gate: ${message}`);
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

const spec = readRequired("specs", "features", "secure-runtime-gate.md");
const design = readRequired(
  "docs",
  "superpowers",
  "specs",
  "2026-06-06-secure-runtime-gate-design.md",
);
const plan = readRequired(
  "docs",
  "superpowers",
  "plans",
  "2026-06-06-secure-runtime-gate.md",
);
const operatorDoc = readRequired("docs", "deployment", "secure-runtime-gate.md");
const runnerPath = join(root, "scripts", "secure-runtime-gate.mjs");
if (!existsSync(runnerPath)) fail("scripts/secure-runtime-gate.mjs is missing");
const runnerSource = readFileSync(runnerPath, "utf8");
const startRuntimeSource = readRequired("scripts", "start-runtime.mjs");
const packageJson = JSON.parse(readRequired("package.json"));

assert(spec.includes("SECURE-RUNTIME-GATE"), "feature contract is missing");
assert(design.includes("Secure Runtime Gate Design"), "design is missing");
assert(plan.includes("Secure Runtime Gate Implementation Plan"), "plan is missing");
assert(operatorDoc.includes("secure:init"), "operator guide is missing secure:init");
assert(
  operatorDoc.includes("--confirm-private-network"),
  "operator guide is missing private-network confirmation",
);

for (const required of [
  "127.0.0.1",
  "0.0.0.0",
  "confirm-private-network",
  "NEXUS_NETWORK_MODE",
  "NEXUS_ALLOW_PAID_APIS",
  "NEXUS_ENABLE_HIGH_RISK_TOOLS",
  "NEXUS_HIGH_RISK_WRITES_REQUIRE_APPROVAL",
  "publication:safety:check",
  "security-scan",
  "security:boundaries",
  "start-runtime.mjs",
  "SIGTERM",
  "child.kill(signal)",
  "--full-verify",
  "--check",
]) {
  assert(runnerSource.includes(required), `runner is missing ${required}`);
}

for (const unsafe of [
  "next dev",
  "NEXUS_NETWORK_MODE: \"connected\"",
  "NEXUS_ALLOW_PAID_APIS: \"true\"",
  "NEXUS_ENABLE_HIGH_RISK_TOOLS: \"true\"",
  "console.log(token",
  "console.log(process.env.NEXUS_TOKEN",
]) {
  assert(!runnerSource.includes(unsafe), `runner must not include ${unsafe}`);
}
assert(startRuntimeSource.includes("SIGTERM"), "start runtime must forward shutdown signals");
assert(
  startRuntimeSource.includes("child.kill(signal)"),
  "start runtime must stop its child process on shutdown",
);

assert(
  packageJson.scripts?.["secure:start"] === "node scripts/secure-runtime-gate.mjs",
  "package.json is missing secure:start",
);
assert(
  packageJson.scripts?.["secure:init"] ===
    "node scripts/secure-runtime-gate.mjs --init-token --check",
  "package.json is missing secure:init",
);
assert(
  packageJson.scripts?.["secure:start:check"] ===
    "node scripts/validate-secure-runtime-gate.mjs",
  "package.json is missing secure:start:check",
);
assert(
  packageJson.scripts?.verify?.includes("npm run secure:start:check"),
  "verify is missing secure:start:check",
);

const runtime = await import(`${pathToFileURL(runnerPath).href}?check=${Date.now()}`);
for (const name of [
  "buildSecureRuntimeProfile",
  "initializeSecureToken",
  "inspectProductionBuild",
]) {
  assert(typeof runtime[name] === "function", `runner must export ${name}`);
}

const strongToken = "secure-runtime-fixture-token-1234567890";
const local = runtime.buildSecureRuntimeProfile({
  profile: "local",
  token: strongToken,
  port: "3100",
});
assert(local.host === "127.0.0.1", "local profile must bind localhost");
assert(local.port === "3100", "local profile must preserve a valid port");
assert(local.env.NEXUS_NETWORK_MODE === "isolated", "local profile must isolate network");
assert(local.env.NEXUS_ALLOW_PAID_APIS === "false", "local profile must block paid APIs");
assert(
  local.env.NEXUS_ENABLE_HIGH_RISK_TOOLS === "false",
  "local profile must block high-risk tools",
);
assert(
  local.env.NEXUS_HIGH_RISK_WRITES_REQUIRE_APPROVAL === "true",
  "local profile must require write approval",
);
assert(
  local.env.NEXUS_PHONE_LAN_ENABLED === "false",
  "local profile must keep private-network phone access disabled",
);

let weakTokenBlocked = false;
try {
  runtime.buildSecureRuntimeProfile({ profile: "local", token: "your-token" });
} catch {
  weakTokenBlocked = true;
}
assert(weakTokenBlocked, "placeholder token must be blocked");

let tailnetConfirmationBlocked = false;
try {
  runtime.buildSecureRuntimeProfile({ profile: "tailnet", token: strongToken });
} catch {
  tailnetConfirmationBlocked = true;
}
assert(tailnetConfirmationBlocked, "tailnet profile must require confirmation");

const tailnet = runtime.buildSecureRuntimeProfile({
  profile: "tailnet",
  token: strongToken,
  confirmPrivateNetwork: true,
});
assert(tailnet.host === "0.0.0.0", "tailnet profile must bind private-network interfaces");
assert(tailnet.env.NEXUS_NETWORK_MODE === "isolated", "tailnet profile must remain isolated");
assert(tailnet.env.NEXUS_ALLOW_PAID_APIS === "false", "tailnet profile must block paid APIs");
assert(
  tailnet.env.NEXUS_PHONE_LAN_ENABLED === "true",
  "tailnet profile must report private-network phone access enabled",
);
assert(
  tailnet.env.NEXUS_PHONE_LAN_PORT === tailnet.port,
  "tailnet profile must align the phone-access port",
);

const fixtureRoot = mkdtempSync(join(tmpdir(), "nexus-secure-start-check-"));
try {
  const envPath = join(fixtureRoot, ".env.local");
  const weakTokenFixture = [
    ["NEXUS_TOKEN", "weak"].join("="),
    "NEXUS_NETWORK_MODE=connected",
    "",
  ].join("\n");
  writeFileSync(envPath, weakTokenFixture);
  const initialized = runtime.initializeSecureToken(envPath);
  assert(initialized.changed === true, "secure init must replace a weak token");
  assert(initialized.reason === "weak-token", "secure init must report weak-token rotation");
  const initializedText = readFileSync(envPath, "utf8");
  const strongTokenPattern = new RegExp(
    ["NEXUS_TOKEN", "[A-Za-z0-9_-]{40,}"].join("="),
  );
  assert(
    strongTokenPattern.test(initializedText),
    "secure init must write a strong base64url token",
  );
  assert(
    initializedText.includes("NEXUS_NETWORK_MODE=connected"),
    "secure init must preserve unrelated local settings",
  );
  const unchanged = runtime.initializeSecureToken(envPath);
  assert(unchanged.changed === false, "secure init must preserve an already-strong token");

  let missingBuildBlocked = false;
  try {
    runtime.inspectProductionBuild(fixtureRoot);
  } catch {
    missingBuildBlocked = true;
  }
  assert(missingBuildBlocked, "missing production build must be blocked");

  mkdirSync(join(fixtureRoot, ".next"), { recursive: true });
  writeFileSync(join(fixtureRoot, ".next", "BUILD_ID"), "fixture-build");
  const build = runtime.inspectProductionBuild(fixtureRoot);
  assert(build.ready === true, "production build must be detected");
  assert(build.mode === "next-start", "BUILD_ID must resolve to next-start mode");
} finally {
  rmSync(fixtureRoot, { recursive: true, force: true });
}

console.log("ok secure-runtime-gate (profiles/token/build/wiring)");
