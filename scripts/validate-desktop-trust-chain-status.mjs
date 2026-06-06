#!/usr/bin/env node
/* eslint-disable no-console */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();

function fail(message) {
  console.error(`x desktop-trust-chain-status: ${message}`);
  process.exit(1);
}

function readRequired(...parts) {
  const fullPath = join(root, ...parts);
  if (!existsSync(fullPath)) fail(`${parts.join("/")} is missing`);
  return readFileSync(fullPath, "utf8");
}

function assertIncludes(text, expected, label) {
  if (!text.includes(expected)) {
    fail(`${label} must include ${JSON.stringify(expected)}`);
  }
}

const spec = readRequired("specs", "features", "desktop-trust-chain-status.md");
const runner = readRequired("scripts", "desktop-trust-chain-status.mjs");
const packageJson = JSON.parse(readRequired("package.json"));

assertIncludes(spec, "Desktop Trust Chain Status", "feature spec");
assertIncludes(spec, "No certificate", "feature spec");
assertIncludes(runner, "SHA256SUMS.txt", "trust-chain runner");
assertIncludes(runner, "signingIdentity", "trust-chain runner");
assertIncludes(runner, "readsSecrets: false", "trust-chain runner");
assertIncludes(runner, "sbom", "trust-chain runner");
assertIncludes(runner, "desktop-sbom.cdx.json", "trust-chain runner");
assertIncludes(runner, "componentCount", "trust-chain runner");
assertIncludes(runner, "lockDigest", "trust-chain runner");
assertIncludes(runner, "--check", "trust-chain runner");
assertIncludes(
  readRequired("docs", "metrics", "desktop-sbom.cdx.json"),
  "\"bomFormat\": \"CycloneDX\"",
  "canonical desktop SBOM",
);

if (
  packageJson.scripts?.["desktop:trust-chain"] !==
  "node scripts/desktop-trust-chain-status.mjs"
) {
  fail("package.json is missing desktop:trust-chain");
}

if (
  packageJson.scripts?.["desktop:trust-chain:check"] !==
  "node scripts/validate-desktop-trust-chain-status.mjs"
) {
  fail("package.json is missing desktop:trust-chain:check");
}

const result = spawnSync(
  process.execPath,
  ["scripts/desktop-trust-chain-status.mjs", "--check"],
  {
    cwd: root,
    encoding: "utf8",
  },
);

if (result.status !== 0) {
  process.stdout.write(result.stdout ?? "");
  process.stderr.write(result.stderr ?? "");
  fail("desktop trust-chain check runner failed");
}

console.log("ok desktop-trust-chain-status");
