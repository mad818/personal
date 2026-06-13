#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x local-acceleration-acceptance: ${message}`);
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

const runner = readRequired("scripts", "local-acceleration-acceptance.mjs");
const completion = readRequired("lib", "localAccelerationAcceptance.ts");
const deployment = readRequired("docs", "deployment", "local-acceleration-plane.md");
const packageJson = JSON.parse(readRequired("package.json"));

for (const needle of [
  "assessLocalAccelerationCompletion",
  "sanitizeLocalAccelerationAcceptance",
  "nexusOwnedPercent",
  "offlineOperationalPercent",
  "integrationAcceptancePercent",
  "optionalUpstreamRuntimePercent",
  "optionalUpstreamStatus",
  "optionalUpstreamGaps",
  "sourceParityPercent",
]) {
  requireText(completion, needle, "completion model");
}

for (const needle of [
  "findLocalAccelerationPython",
  "NEXUS_LOCAL_ACCELERATION_EMBED_MODE",
  "auditLocalTurboQuantCheckout",
  "readLocalAccelerationConfig",
  "validateLocalAccelerationEndpoint",
  "turboVecLifecycle",
  "localFallbackLifecycle",
  "requiredBackend",
  "turboQuantCheckout",
  "turboQuantGpu",
  "--require-complete",
  "--require-upstream-runtime",
  "--execute-turboquant",
  "local-acceleration-acceptance.json",
]) {
  requireText(runner, needle, "acceptance runner");
}

for (const forbidden of [
  "process.env.NEXUS_TOKEN",
  "process.env.OPENAI_API_KEY",
  "process.env.ANTHROPIC_API_KEY",
  "rawOutput",
]) {
  if (runner.includes(forbidden)) fail(`acceptance runner contains forbidden ${forbidden}`);
}

requireText(deployment, "local:acceleration:acceptance", "deployment guide");

if (
  packageJson.scripts?.["local:acceleration:acceptance:check"] !==
  "node --no-warnings --experimental-strip-types scripts/check-local-acceleration-acceptance.mjs && node scripts/validate-local-acceleration-acceptance.mjs"
) {
  fail("package.json is missing local:acceleration:acceptance:check");
}
if (
  packageJson.scripts?.["local:acceleration:acceptance"] !==
  "npm run local:acceleration:check && node --no-warnings --experimental-strip-types scripts/local-acceleration-acceptance.mjs --static-verified --write"
) {
  fail("package.json is missing local:acceleration:acceptance");
}
if (
  packageJson.scripts?.["local:acceleration:acceptance:require-complete"] !==
  "npm run local:acceleration:check && node --no-warnings --experimental-strip-types scripts/local-acceleration-acceptance.mjs --static-verified --write --require-complete"
) {
  fail("package.json is missing local:acceleration:acceptance:require-complete");
}
if (
  packageJson.scripts?.["local:acceleration:acceptance:require-upstream-runtime"] !==
  "npm run local:acceleration:check && node --no-warnings --experimental-strip-types scripts/local-acceleration-acceptance.mjs --static-verified --write --require-upstream-runtime --execute-turboquant"
) {
  fail("package.json is missing local:acceleration:acceptance:require-upstream-runtime");
}

console.log(
  "ok local-acceleration-acceptance-validator (aligned completion, optional upstream gate, docs, package wiring)",
);
