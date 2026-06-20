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
  ["scripts/desktop-trust-chain-status.mjs", "--json", "--no-write"],
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

// ── CP2.3 — Honest missing artifact disclosure ────────────────────────────
// Parse the JSON status record and surface missing packaged artifacts clearly
// so CI and operators understand what remains before full CP2.3 sign-off.
let trustChainRecord = null;
try {
  trustChainRecord = JSON.parse(result.stdout);
} catch {
  // JSON parse failed — fall back to a simpler runner check
}

if (trustChainRecord) {
  const checksums = trustChainRecord.checksums ?? {};
  const emptyDist =
    checksums.status === "missing_artifact_dir" || checksums.status === "missing_artifacts";

  if (emptyDist) {
    console.log(
      "note desktop-trust-chain (CP2.3): packaged Tauri artifacts not yet built — desktop/dist is empty.",
    );
    console.log(
      "  SHA256SUMS.txt checksums cannot exist until artifacts are built.",
    );
    console.log(
      "  Remaining CP2.3 work: npm run desktop:tauri:build → npm run release:checksums → configure signing.",
    );
  }

  if (!trustChainRecord.releaseReady) {
    const blockers = trustChainRecord.blockers ?? [];
    if (blockers.length > 0) {
      console.log("  CP2.3 blockers (expected pre-release):");
      for (const blocker of blockers) {
        console.log(`    - ${blocker}`);
      }
    }
  }
}

// Validate using --check mode now that we have the JSON for diagnostics
const checkResult = spawnSync(
  process.execPath,
  ["scripts/desktop-trust-chain-status.mjs", "--check"],
  {
    cwd: root,
    encoding: "utf8",
  },
);

if (checkResult.status !== 0) {
  process.stdout.write(checkResult.stdout ?? "");
  process.stderr.write(checkResult.stderr ?? "");
  fail("desktop trust-chain check runner failed");
}

console.log("ok desktop-trust-chain-status");
